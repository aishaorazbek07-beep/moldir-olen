import { randomUUID } from 'node:crypto';
import { ApiPayError, createPhoneInvoice, getInvoice } from './apipay';
import { RATE_LIMIT } from './config';
import { applyInvoiceStatus, type PaymentKind } from './payments-core';
import {
  attachInvoiceId,
  countRecentPayments,
  createPaymentRow,
  loadPaymentById,
  markPaymentFailed,
  paymentRepo,
} from './repo';

export type StartPaymentResult =
  | { ok: true; paymentId: string }
  | { ok: false; error: string; code: 'rate_limited' | 'provider_error' };

/**
 * Создаёт платёж: сначала запись в нашей базе, потом счёт в ApiPay.
 *
 * Сумма приходит сюда уже посчитанной на сервере — из количества и цены из
 * конфига. Клиент суммы не присылает, поэтому «10 голосов за 500 ₸» невозможны.
 */
export async function startPayment(input: {
  kind: PaymentKind;
  phone: string;
  amount: number;
  description: string;
  meta: Record<string, unknown>;
  ip: string | null;
}): Promise<StartPaymentResult> {
  const recent = await countRecentPayments(input.phone, input.ip, RATE_LIMIT.windowMinutes);

  if (recent.byPhone >= RATE_LIMIT.maxPerPhone) {
    return {
      ok: false,
      code: 'rate_limited',
      error: 'Бұл нөмірден тым көп төлем сұралды. Сәл кейін қайталап көріңіз.',
    };
  }

  if (input.ip && recent.byIp >= RATE_LIMIT.maxPerIp) {
    return {
      ok: false,
      code: 'rate_limited',
      error: 'Тым көп сұраныс жіберілді. Сәл кейін қайталап көріңіз.',
    };
  }

  const externalOrderId = `${input.kind}_${randomUUID()}`;

  const paymentId = await createPaymentRow({
    externalOrderId,
    kind: input.kind,
    expectedAmount: input.amount,
    phone: input.phone,
    meta: input.meta,
    ip: input.ip,
  });

  try {
    const invoice = await createPhoneInvoice({
      phone: input.phone,
      amount: input.amount,
      description: input.description,
      externalOrderId,
    });

    if (invoice.invoiceId) {
      await attachInvoiceId(paymentId, invoice.invoiceId);
    }
  } catch (err) {
    const code = err instanceof ApiPayError ? err.code : 'unknown';
    const detail = err instanceof Error ? err.message : String(err);

    // Причину сохраняем: иначе в базе остаётся голый error, и понять, почему
    // платежи не идут, можно только гаданием.
    await markPaymentFailed(paymentId, code, detail);

    return { ok: false, code: 'provider_error', error: messageForCode(code) };
  }

  return { ok: true, paymentId };
}

/**
 * Что показать человеку. Про внутренние причины — незаполненный профиль,
 * неподключённый кассир — посетителю знать незачем, но и врать «попробуйте
 * позже» там, где повтор не поможет, тоже неправильно.
 */
function messageForCode(code: string): string {
  switch (code) {
    case 'client_not_found':
      return 'Бұл нөмір Kaspi жүйесінде табылмады. Нөмірді тексеріңіз.';
    case 'kaspi_throttled':
    case 'network_unavailable':
    case 'timeout':
      return 'Төлем жүйесі бос емес. Сәл кейін қайталап көріңіз.';
    case 'kaspi_session_not_configured':
    case 'kaspi_session_invalid':
    case 'kyc_daily_limit_reached':
    case 'kyc_rejected':
      // Повтор не поможет: чинить нужно на стороне организации.
      return 'Төлем жүйесі уақытша қолжетімсіз. Ұйымдастырушыларға хабарласыңыз.';
    default:
      return 'Төлем жүйесіне қосылу мүмкін болмады. Сәл кейін қайталап көріңіз.';
  }
}

export type SyncedStatus = 'pending' | 'paid' | 'failed';

export interface PaymentStatusView {
  paymentId: string;
  state: SyncedStatus;
  kind: PaymentKind;
  amount: number;
  rawStatus: string;
}

/**
 * Отдаёт статус платежа браузеру и по пути страхует нас от потерянного webhook'а:
 * если у нас всё ещё pending, спрашиваем ApiPay напрямую и, если там уже paid,
 * проводим подтверждение тем же кодом, что и webhook.
 */
export async function syncPaymentStatus(paymentId: string): Promise<PaymentStatusView | null> {
  const payment = await loadPaymentById(paymentId);
  if (!payment) return null;

  if (payment.status === 'pending' && payment.apipayInvoiceId) {
    try {
      const snapshot = await getInvoice(payment.apipayInvoiceId);
      if (snapshot && snapshot.status !== 'pending' && snapshot.status !== 'processing') {
        await applyInvoiceStatus(paymentRepo, {
          externalOrderId: payment.externalOrderId,
          status: snapshot.status,
          amount: snapshot.amount,
          apipayInvoiceId: snapshot.id,
          paidAt: snapshot.paidAt,
        });

        const refreshed = await loadPaymentById(paymentId);
        if (refreshed) return toView(refreshed);
      }
    } catch {
      // Опрос — только страховка. Если ApiPay недоступен, отдаём то, что есть в базе,
      // и браузер спросит снова через пару секунд.
    }
  }

  return toView(payment);
}

function toView(payment: NonNullable<Awaited<ReturnType<typeof loadPaymentById>>>): PaymentStatusView {
  const state: SyncedStatus =
    payment.status === 'paid' ? 'paid' : payment.status === 'pending' ? 'pending' : 'failed';

  return {
    paymentId: payment.id,
    state,
    kind: payment.kind,
    amount: payment.expectedAmount,
    rawStatus: payment.status,
  };
}
