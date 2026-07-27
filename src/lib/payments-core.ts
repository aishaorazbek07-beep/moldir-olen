import { createHash } from 'node:crypto';
import { amountsMatch } from './amount';

export type PaymentKind = 'vote' | 'ticket' | 'application';

export type PaymentStatus =
  | 'pending'
  | 'paid'
  | 'cancelled'
  | 'expired'
  | 'error'
  | 'amount_mismatch';

/** Статусы, которые может прислать ApiPay. */
export type InvoiceStatus =
  | 'processing'
  | 'pending'
  | 'paid'
  | 'cancelled'
  | 'expired'
  | 'error'
  | 'partially_refunded';

export interface PaymentRecord {
  id: string;
  externalOrderId: string;
  kind: PaymentKind;
  /** Сумма в тенге, посчитанная сервером при создании счёта. Источник истины. */
  expectedAmount: number;
  status: PaymentStatus;
  meta: Record<string, unknown>;
}

export interface ApplicationData {
  name: string;
  birthYear: number;
  region: string;
  resume: string;
}

/**
 * Хранилище платежей. Каждый grant* обязан быть идемпотентным по paymentId и
 * возвращать true только если запись создана именно этим вызовом.
 */
export interface PaymentRepo {
  findByExternalOrderId(externalOrderId: string): Promise<PaymentRecord | null>;
  markPaid(paymentId: string, apipayInvoiceId?: string | null, paidAt?: string | null): Promise<void>;
  markStatus(paymentId: string, status: PaymentStatus): Promise<void>;
  grantVote(paymentId: string, teamId: number, quantity: number): Promise<boolean>;
  grantTicket(paymentId: string, showSlug: string, qty: number, ticketNumber: string): Promise<boolean>;
  grantApplication(paymentId: string, data: ApplicationData): Promise<boolean>;
}

export type ConfirmResult =
  | { ok: true; kind: PaymentKind; paymentId: string; alreadyGranted: boolean }
  | { ok: false; reason: 'payment_not_found' | 'amount_mismatch' | 'bad_meta' };

/**
 * Номер билета выводится из id платежа, а не из случайности: при повторном
 * webhook'е номер получается тот же, поэтому UNIQUE в базе гасит дубль, а не
 * создаёт второй билет с новым номером.
 */
export function ticketNumberFor(paymentId: string): string {
  const hash = createHash('sha256').update(paymentId).digest('hex');
  return `MO-${hash.slice(0, 6).toUpperCase()}`;
}

/**
 * ЕДИНСТВЕННОЕ место в системе, где оплата превращается в голос, билет или заявку.
 *
 * Вызывается из обработчика webhook'а и из опроса статуса. Ни один запрос от
 * браузера сюда не попадает — поэтому подделать оплату со стороны клиента нельзя.
 */
export async function confirmPayment(
  repo: PaymentRepo,
  input: {
    externalOrderId: string;
    amount: string | number | null | undefined;
    apipayInvoiceId?: string | null;
    paidAt?: string | null;
  },
): Promise<ConfirmResult> {
  const payment = await repo.findByExternalOrderId(input.externalOrderId);
  if (!payment) return { ok: false, reason: 'payment_not_found' };

  if (!amountsMatch(input.amount, payment.expectedAmount)) {
    // Деньги, возможно, пришли, но не в той сумме — выдачи не делаем,
    // помечаем платёж, чтобы его разобрал человек в админке.
    await repo.markStatus(payment.id, 'amount_mismatch');
    return { ok: false, reason: 'amount_mismatch' };
  }

  let granted: boolean;

  switch (payment.kind) {
    case 'vote': {
      const teamId = asPositiveInt(payment.meta.teamId);
      const quantity = asPositiveInt(payment.meta.quantity);
      if (teamId === null || quantity === null) return { ok: false, reason: 'bad_meta' };
      granted = await repo.grantVote(payment.id, teamId, quantity);
      break;
    }
    case 'ticket': {
      const showSlug = asNonEmptyString(payment.meta.showSlug);
      const qty = asPositiveInt(payment.meta.qty);
      if (showSlug === null || qty === null) return { ok: false, reason: 'bad_meta' };
      granted = await repo.grantTicket(payment.id, showSlug, qty, ticketNumberFor(payment.id));
      break;
    }
    case 'application': {
      const name = asNonEmptyString(payment.meta.name);
      const birthYear = asPositiveInt(payment.meta.birthYear);
      if (name === null || birthYear === null) return { ok: false, reason: 'bad_meta' };
      granted = await repo.grantApplication(payment.id, {
        name,
        birthYear,
        region: asNonEmptyString(payment.meta.region) ?? '',
        resume: typeof payment.meta.resume === 'string' ? payment.meta.resume : '',
      });
      break;
    }
  }

  // Порядок важен: сначала выдача, потом отметка об оплате. Если процесс упадёт
  // между ними, ретрай webhook'а повторит выдачу (она идемпотентна) и доставит
  // отметку. Обратный порядок мог бы оставить оплату без выдачи навсегда.
  await repo.markPaid(payment.id, input.apipayInvoiceId ?? null, input.paidAt ?? null);

  return { ok: true, kind: payment.kind, paymentId: payment.id, alreadyGranted: !granted };
}

/** Разбор любого статуса счёта — и из webhook'а, и из ответа GET /invoices/{id}. */
export async function applyInvoiceStatus(
  repo: PaymentRepo,
  input: {
    externalOrderId: string;
    status: InvoiceStatus | string;
    amount: string | number | null | undefined;
    apipayInvoiceId?: string | null;
    paidAt?: string | null;
  },
): Promise<ConfirmResult | { ok: true; kind: null; noop: true }> {
  if (input.status === 'paid' || input.status === 'partially_refunded') {
    return confirmPayment(repo, input);
  }

  if (input.status === 'cancelled' || input.status === 'expired' || input.status === 'error') {
    const payment = await repo.findByExternalOrderId(input.externalOrderId);
    if (!payment) return { ok: false, reason: 'payment_not_found' };

    // Оплаченный платёж не отменяем: если оплата уже зачтена, поздний expired
    // не должен её обнулить.
    if (payment.status !== 'paid') {
      await repo.markStatus(payment.id, input.status);
    }
    return { ok: true, kind: null, noop: true };
  }

  // processing и pending — ждём дальше, ничего не меняем.
  return { ok: true, kind: null, noop: true };
}

function asPositiveInt(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
