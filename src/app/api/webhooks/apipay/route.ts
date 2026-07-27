import { NextResponse } from 'next/server';
import { getInvoice } from '@/lib/apipay';
import { applyInvoiceStatus } from '@/lib/payments-core';
import { logWebhookEvent, paymentRepo } from '@/lib/repo';
import { verifyWebhookSignature } from '@/lib/webhook-signature';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Единственный вход, через который оплата превращается в голос, билет или заявку.
 *
 * Здесь и только здесь. Никакой запрос от браузера не может создать голос.
 * Именно это закрывает старую дыру, когда возврат из Kaspi без оплаты
 * засчитывался как успех.
 *
 * Доверие к входящему запросу строится в два уровня:
 *
 *   1. Подпись сошлась → телу можно верить, проводим сразу.
 *   2. Подписи нет или она не сошлась → телу НЕ верим. Считаем его лишь
 *      подсказкой «глянь счёт такой-то» и спрашиваем статус у ApiPay сами,
 *      своим API-ключом. Подделать входящий запрос можно, заставить ApiPay
 *      ответить «оплачено» — нет.
 *
 * Второй уровень нужен потому, что ApiPay может присылать уведомления без
 * подписи. Отказ от них полностью означал бы, что оплаты не засчитываются
 * вовсе; слепое доверие вернуло бы ровно ту дыру, ради которой всё делалось.
 */
export async function POST(req: Request) {
  // Тело читаем строкой ДО разбора JSON: подпись считается по сырым байтам.
  const rawBody = await req.text();
  const signature = req.headers.get('x-webhook-signature');
  const secret = process.env.APIPAY_WEBHOOK_SECRET ?? '';
  const signatureValid = verifyWebhookSignature(rawBody, signature, secret);

  let payload: WebhookPayload;
  try {
    payload = JSON.parse(rawBody) as WebhookPayload;
  } catch {
    await safeLog({
      event: null,
      externalOrderId: null,
      invoiceStatus: null,
      signatureValid,
      outcome: 'rejected_bad_json',
      payload: diagnostics(req, rawBody, signature, secret),
    });
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  // Кнопка «Проверить уведомления» в кабинете шлёт выдуманный счёт со status=test.
  if (payload.event === 'webhook.test' || payload.invoice?.status === 'test') {
    await safeLog({
      event: payload.event ?? 'webhook.test',
      externalOrderId: null,
      invoiceStatus: 'test',
      signatureValid,
      outcome: signatureValid ? 'test_ok_signed' : 'test_ok_unsigned',
      payload: diagnostics(req, rawBody, signature, secret),
    });

    // 200 — адрес рабочий. Подписан тест или нет, видно в поле outcome.
    return NextResponse.json({ ok: true, outcome: 'test_ok', signed: signatureValid });
  }

  const invoice = payload.invoice;
  const externalOrderId = invoice?.external_order_id ?? null;
  const invoiceId = invoice?.id != null ? String(invoice.id) : null;

  if (!externalOrderId) {
    await safeLog({
      event: payload.event ?? null,
      externalOrderId: null,
      invoiceStatus: invoice?.status ?? null,
      signatureValid,
      outcome: 'ignored_no_order_id',
      payload,
    });
    // 200, чтобы ApiPay не ретраил то, что мы всё равно не обработаем.
    return NextResponse.json({ ok: true, ignored: true });
  }

  try {
    const verified = await resolveTrustedStatus({
      signatureValid,
      externalOrderId,
      invoiceId,
      body: invoice,
    });

    if (!verified.ok) {
      await safeLog({
        event: payload.event ?? null,
        externalOrderId,
        invoiceStatus: invoice?.status ?? null,
        signatureValid,
        outcome: verified.outcome,
        payload: diagnostics(req, rawBody, signature, secret),
      });

      // 200: повторять бессмысленно, решение не изменится.
      return NextResponse.json({ ok: false, outcome: verified.outcome });
    }

    const result = await applyInvoiceStatus(paymentRepo, {
      externalOrderId,
      status: verified.status,
      amount: verified.amount,
      apipayInvoiceId: verified.apipayInvoiceId,
      paidAt: verified.paidAt,
    });

    const outcome = `${describe(result)}${signatureValid ? '' : '_via_api'}`;

    await safeLog({
      event: payload.event ?? null,
      externalOrderId,
      invoiceStatus: verified.status,
      signatureValid,
      outcome,
      payload,
    });

    return NextResponse.json({ ok: true, outcome });
  } catch (err) {
    await safeLog({
      event: payload.event ?? null,
      externalOrderId,
      invoiceStatus: invoice?.status ?? null,
      signatureValid,
      outcome: 'error',
      payload: { message: err instanceof Error ? err.message : String(err) },
    });

    // 500 — пусть ApiPay повторит. Обработчик идемпотентен, второй голос не появится.
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}

type TrustedStatus =
  | {
      ok: true;
      status: string;
      amount: string | number | null | undefined;
      apipayInvoiceId: string | null;
      paidAt: string | null;
    }
  | { ok: false; outcome: string };

/**
 * Откуда брать статус и сумму, которым можно верить.
 *
 * При верной подписи — из тела. Без неё — из ответа ApiPay на наш собственный
 * запрос. Прежде чем звонить в ApiPay, проверяем, что такой платёж у нас
 * вообще есть и ещё не проведён: иначе чужими запросами можно было бы гонять
 * нас по чужим счетам и жечь лимит в 200 запросов в минуту.
 */
async function resolveTrustedStatus(input: {
  signatureValid: boolean;
  externalOrderId: string;
  invoiceId: string | null;
  body: WebhookPayload['invoice'];
}): Promise<TrustedStatus> {
  if (input.signatureValid) {
    return {
      ok: true,
      status: input.body?.status ?? 'pending',
      amount: input.body?.amount ?? null,
      apipayInvoiceId: input.body?.kaspi_invoice_id ?? input.invoiceId,
      paidAt: input.body?.paid_at ?? null,
    };
  }

  const payment = await paymentRepo.findByExternalOrderId(input.externalOrderId);
  if (!payment) return { ok: false, outcome: 'rejected_unknown_order_unsigned' };
  if (payment.status === 'paid') return { ok: false, outcome: 'already_paid' };

  const lookupId = input.invoiceId;
  if (!lookupId) return { ok: false, outcome: 'rejected_unsigned_no_invoice_id' };

  const snapshot = await getInvoice(lookupId);
  if (!snapshot) return { ok: false, outcome: 'rejected_invoice_not_found_at_apipay' };

  // Счёт, на который ссылается запрос, обязан принадлежать нашему заказу.
  if (snapshot.externalOrderId && snapshot.externalOrderId !== input.externalOrderId) {
    return { ok: false, outcome: 'rejected_order_mismatch' };
  }

  return {
    ok: true,
    status: snapshot.status,
    amount: snapshot.amount,
    apipayInvoiceId: snapshot.id,
    paidAt: snapshot.paidAt,
  };
}

interface WebhookPayload {
  event?: string;
  invoice?: {
    id?: number | string;
    external_order_id?: string;
    amount?: string | number;
    status?: string;
    kaspi_invoice_id?: string;
    paid_at?: string;
  };
}

function describe(result: Awaited<ReturnType<typeof applyInvoiceStatus>>): string {
  if (!result.ok) return `rejected_${result.reason}`;
  if ('noop' in result) return 'status_updated';
  if (result.alreadyGranted) return 'already_granted';
  return `granted_${result.kind}`;
}

/**
 * Диагностика настройки: видно, подписывает ли провайдер уведомления и под каким
 * именем заголовка. Секрет тут не появляется — подпись это результат HMAC,
 * восстановить по ней ключ нельзя.
 */
function diagnostics(req: Request, rawBody: string, signature: string | null, secret: string) {
  const signatureLike: Record<string, string> = {};
  for (const [name, value] of req.headers.entries()) {
    if (/signature|sign|hmac|digest|checksum/i.test(name)) signatureLike[name] = value;
  }

  return {
    rawBodyLength: rawBody.length,
    hasSignature: Boolean(signature),
    secretConfigured: Boolean(secret),
    headerNames: [...req.headers.keys()],
    signatureLikeHeaders: signatureLike,
  };
}

/** Журнал не должен ломать обработку: если запись не удалась, платёж всё равно проведён. */
async function safeLog(input: Parameters<typeof logWebhookEvent>[0]): Promise<void> {
  try {
    await logWebhookEvent(input);
  } catch {
    // намеренно молча
  }
}
