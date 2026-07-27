import { NextResponse } from 'next/server';
import { applyInvoiceStatus } from '@/lib/payments-core';
import { logWebhookEvent, paymentRepo } from '@/lib/repo';
import { verifyWebhookSignature } from '@/lib/webhook-signature';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Единственный вход, через который оплата превращается в голос, билет или заявку.
 *
 * Здесь и только здесь. Никакой запрос от браузера — ни к этому маршруту, ни к
 * какому-либо другому — не может создать голос: у клиента нет ни webhook-секрета,
 * ни доступа к выдаче. Именно это закрывает старую дыру, когда возврат из Kaspi
 * без оплаты засчитывался как успех.
 */
export async function POST(req: Request) {
  // Тело читаем строкой ДО разбора JSON: подпись считается по сырым байтам.
  const rawBody = await req.text();
  const signature = req.headers.get('x-webhook-signature');
  const secret = process.env.APIPAY_WEBHOOK_SECRET ?? '';

  const signatureValid = verifyWebhookSignature(rawBody, signature, secret);

  if (!signatureValid) {
    await safeLog({
      event: null,
      externalOrderId: null,
      invoiceStatus: null,
      signatureValid: false,
      outcome: 'rejected_bad_signature',
      payload: { rawBodyLength: rawBody.length, hasSignature: Boolean(signature) },
    });

    return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
  }

  let payload: WebhookPayload;
  try {
    payload = JSON.parse(rawBody) as WebhookPayload;
  } catch {
    await safeLog({
      event: null,
      externalOrderId: null,
      invoiceStatus: null,
      signatureValid: true,
      outcome: 'rejected_bad_json',
      payload: null,
    });
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const invoice = payload.invoice;
  const externalOrderId = invoice?.external_order_id ?? null;

  if (!externalOrderId) {
    await safeLog({
      event: payload.event ?? null,
      externalOrderId: null,
      invoiceStatus: invoice?.status ?? null,
      signatureValid: true,
      outcome: 'ignored_no_order_id',
      payload,
    });
    // 200, чтобы ApiPay не ретраил то, что мы всё равно не сможем обработать.
    return NextResponse.json({ ok: true, ignored: true });
  }

  let outcome = 'ignored';

  try {
    const result = await applyInvoiceStatus(paymentRepo, {
      externalOrderId,
      status: invoice?.status ?? 'pending',
      amount: invoice?.amount ?? null,
      apipayInvoiceId: invoice?.kaspi_invoice_id ?? (invoice?.id != null ? String(invoice.id) : null),
      paidAt: invoice?.paid_at ?? null,
    });

    outcome = describe(result);
  } catch (err) {
    await safeLog({
      event: payload.event ?? null,
      externalOrderId,
      invoiceStatus: invoice?.status ?? null,
      signatureValid: true,
      outcome: 'error',
      payload: { message: err instanceof Error ? err.message : String(err) },
    });

    // 500 — пусть ApiPay повторит доставку. Обработчик идемпотентен,
    // повтор не создаст второй голос.
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }

  await safeLog({
    event: payload.event ?? null,
    externalOrderId,
    invoiceStatus: invoice?.status ?? null,
    signatureValid: true,
    outcome,
    payload,
  });

  return NextResponse.json({ ok: true, outcome });
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

/** Журнал не должен ломать обработку: если запись не удалась, платёж всё равно проведён. */
async function safeLog(input: Parameters<typeof logWebhookEvent>[0]): Promise<void> {
  try {
    await logWebhookEvent(input);
  } catch {
    // намеренно молча
  }
}
