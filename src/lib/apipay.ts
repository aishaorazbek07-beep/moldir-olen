import { callsApiPay } from './config';
import type { InvoiceStatus } from './payments-core';

const DEFAULT_BASE_URL = 'https://api.apipay.kz/api/v1';

function baseUrl(): string {
  return process.env.APIPAY_BASE_URL || DEFAULT_BASE_URL;
}

function apiKey(): string {
  const key = process.env.APIPAY_API_KEY;
  if (!key) throw new ApiPayError('APIPAY_API_KEY не задан', 'config_missing');
  return key;
}

export class ApiPayError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly httpStatus?: number,
  ) {
    super(message);
    this.name = 'ApiPayError';
  }
}

export interface CreateInvoiceResult {
  invoiceId: string | null;
  status: InvoiceStatus;
}

/**
 * Создаёт счёт по номеру телефона. Человеку прилетает запрос на оплату в Kaspi.
 *
 * Ответ приходит со статусом processing — это нормально, обработка у ApiPay
 * асинхронная. Окончательный статус мы узнаём из webhook'а или из опроса.
 */
export async function createPhoneInvoice(input: {
  phone: string;
  amount: number;
  description: string;
  externalOrderId: string;
}): Promise<CreateInvoiceResult> {
  if (!callsApiPay()) {
    // Режим offline: в ApiPay не ходим, счёт «создан». Подтверждение — локальное,
    // но через тот же confirmPayment, что и настоящий webhook.
    return { invoiceId: `offline_${input.externalOrderId}`, status: 'pending' };
  }

  const res = await fetchWithTimeout(`${baseUrl()}/invoices`, {
    method: 'POST',
    headers: {
      'X-API-Key': apiKey(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      phone_number: input.phone,
      amount: input.amount,
      description: input.description,
      external_order_id: input.externalOrderId,
    }),
  });

  const body = (await safeJson(res)) as
    | { id?: number | string; status?: string; error_code?: string; error_message?: string }
    | null;

  if (!res.ok) {
    throw new ApiPayError(
      body?.error_message || `ApiPay ответил ${res.status}`,
      body?.error_code || 'http_error',
      res.status,
    );
  }

  return {
    invoiceId: body?.id !== undefined && body?.id !== null ? String(body.id) : null,
    status: (body?.status as InvoiceStatus) ?? 'processing',
  };
}

export interface InvoiceSnapshot {
  id: string;
  status: InvoiceStatus;
  amount: string | number | null;
  externalOrderId: string | null;
  paidAt: string | null;
}

/**
 * Прямой опрос счёта. Нужен как страховка: webhook может не дойти — сеть, деплой,
 * сработавший circuit breaker у ApiPay. Тогда статус выясняем сами.
 */
export async function getInvoice(invoiceId: string): Promise<InvoiceSnapshot | null> {
  if (!callsApiPay()) return null;

  const res = await fetchWithTimeout(`${baseUrl()}/invoices/${encodeURIComponent(invoiceId)}`, {
    headers: { 'X-API-Key': apiKey() },
  });

  if (res.status === 404) return null;

  const body = (await safeJson(res)) as Record<string, unknown> | null;

  if (!res.ok || !body) {
    throw new ApiPayError(
      String(body?.error_message ?? `ApiPay ответил ${res.status}`),
      String(body?.error_code ?? 'http_error'),
      res.status,
    );
  }

  const invoice = (body.invoice ?? body) as Record<string, unknown>;

  return {
    id: String(invoice.id ?? invoiceId),
    status: (invoice.status as InvoiceStatus) ?? 'pending',
    amount: (invoice.amount as string | number | null) ?? null,
    externalOrderId: (invoice.external_order_id as string | null) ?? null,
    paidAt: (invoice.paid_at as string | null) ?? null,
  };
}

/**
 * Тестовое проведение счёта в песочнице ApiPay.
 *
 * Именно этим ApiPay и отличается от локальной заглушки: счёт проводится у них,
 * и к нам прилетает настоящий подписанный webhook. То есть проверяется весь
 * боевой путь, включая сверку подписи.
 *
 * Работает только для счетов в статусе pending, а после создания счёт какое-то
 * время висит в processing — поэтому ждём и повторяем.
 */
export async function simulateStatus(
  invoiceId: string,
  status: 'paid' | 'cancelled' | 'expired' | 'error' = 'paid',
): Promise<{ ok: boolean; error?: string }> {
  if (!callsApiPay()) return { ok: false, error: 'offline_mode' };

  const url = `${baseUrl()}/invoices/${encodeURIComponent(invoiceId)}/simulate-status`;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const res = await fetchWithTimeout(url, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });

    if (res.ok) return { ok: true };

    const body = (await safeJson(res)) as { error_code?: string; error_message?: string } | null;

    // Счёт ещё не дошёл до pending — подождём и попробуем снова.
    const notReady = res.status === 409 || res.status === 422 || res.status === 400;
    if (!notReady || attempt === 4) {
      return { ok: false, error: body?.error_message ?? `ApiPay ответил ${res.status}` };
    }

    await new Promise((resolve) => setTimeout(resolve, 1200));
  }

  return { ok: false, error: 'Счёт не перешёл в статус pending' };
}

async function fetchWithTimeout(url: string, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);

  try {
    return await fetch(url, { ...init, signal: controller.signal, cache: 'no-store' });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new ApiPayError('ApiPay не ответил за 15 секунд', 'timeout');
    }
    throw new ApiPayError(err instanceof Error ? err.message : 'Сеть недоступна', 'network_error');
  } finally {
    clearTimeout(timer);
  }
}

async function safeJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}
