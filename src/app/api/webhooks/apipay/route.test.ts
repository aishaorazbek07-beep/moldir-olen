import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PaymentRecord } from '@/lib/payments-core';
import { computeSignature } from '@/lib/webhook-signature';

const SECRET = 'whsec_route_test';
process.env.APIPAY_WEBHOOK_SECRET = SECRET;

/**
 * Хранилище и клиент ApiPay подменяем, платёжное ядро — настоящее.
 * Так тест проходит весь путь запроса: подпись → сверка → ядро → выдача.
 */
const state = {
  payment: null as PaymentRecord | null,
  votes: [] as Array<{ paymentId: string; teamId: number; quantity: number }>,
  statuses: [] as string[],
  /** Что ApiPay ответит на GET /invoices/{id}. */
  apiInvoice: null as null | {
    id: string;
    status: string;
    amount: string | number | null;
    externalOrderId: string | null;
    paidAt: string | null;
  },
  apiCalls: [] as string[],
};

vi.mock('@/lib/repo', () => ({
  paymentRepo: {
    findByExternalOrderId: async () => state.payment,
    markPaid: async () => {
      if (state.payment) state.payment.status = 'paid';
    },
    markStatus: async (_id: string, status: string) => {
      state.statuses.push(status);
      if (state.payment) state.payment.status = status as PaymentRecord['status'];
    },
    grantVote: async (paymentId: string, teamId: number, quantity: number) => {
      if (state.votes.some((v) => v.paymentId === paymentId)) return false;
      state.votes.push({ paymentId, teamId, quantity });
      return true;
    },
    grantTicket: async () => true,
    grantApplication: async () => true,
  },
  logWebhookEvent: async () => undefined,
}));

vi.mock('@/lib/apipay', () => ({
  getInvoice: async (id: string) => {
    state.apiCalls.push(id);
    return state.apiInvoice;
  },
}));

const { POST } = await import('./route');

function webhookRequest(body: unknown, signature?: string | null) {
  const raw = JSON.stringify(body);
  const headers = new Headers({ 'content-type': 'application/json' });
  if (signature !== null) {
    headers.set('x-webhook-signature', signature ?? computeSignature(raw, SECRET));
  }
  return new Request('https://example.kz/api/webhooks/apipay', {
    method: 'POST',
    headers,
    body: raw,
  });
}

const paidBody = {
  event: 'invoice.status_changed',
  invoice: {
    id: 42,
    external_order_id: 'vote_abc',
    amount: '2000.00',
    status: 'paid',
    kaspi_invoice_id: '13234689513',
    paid_at: '2026-07-27T10:00:00+00:00',
  },
};

beforeEach(() => {
  state.payment = {
    id: 'pay-1',
    externalOrderId: 'vote_abc',
    kind: 'vote',
    expectedAmount: 2000,
    status: 'pending',
    meta: { teamId: 2, quantity: 10 },
  };
  state.votes = [];
  state.statuses = [];
  state.apiCalls = [];
  state.apiInvoice = {
    id: '42',
    status: 'paid',
    amount: '2000.00',
    externalOrderId: 'vote_abc',
    paidAt: '2026-07-27T10:00:00+00:00',
  };
});

describe('подписанные уведомления', () => {
  it('засчитывают голоса и не дёргают API лишний раз', async () => {
    const res = await POST(webhookRequest(paidBody));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ outcome: 'granted_vote' });
    expect(state.votes).toEqual([{ paymentId: 'pay-1', teamId: 2, quantity: 10 }]);
    expect(state.apiCalls).toHaveLength(0);
  });

  it('повторная доставка даёт один голос', async () => {
    await POST(webhookRequest(paidBody));
    const second = await POST(webhookRequest(paidBody));

    await expect(second.json()).resolves.toMatchObject({ outcome: 'already_granted' });
    expect(state.votes).toHaveLength(1);
  });

  it('сумма, не совпавшая с ожидаемой, не даёт голос', async () => {
    const res = await POST(
      webhookRequest({ ...paidBody, invoice: { ...paidBody.invoice, amount: '200.00' } }),
    );

    await expect(res.json()).resolves.toMatchObject({ outcome: 'rejected_amount_mismatch' });
    expect(state.votes).toHaveLength(0);
    expect(state.statuses).toContain('amount_mismatch');
  });

  it('статус expired помечает платёж и не даёт голос', async () => {
    await POST(webhookRequest({ ...paidBody, invoice: { ...paidBody.invoice, status: 'expired' } }));

    expect(state.votes).toHaveLength(0);
    expect(state.statuses).toContain('expired');
  });
});

describe('уведомления БЕЗ подписи — статус берём у ApiPay сами', () => {
  it('засчитывают голос, когда ApiPay подтверждает оплату', async () => {
    const res = await POST(webhookRequest(paidBody, null));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ outcome: 'granted_vote_via_api' });
    expect(state.apiCalls).toEqual(['42']);
    expect(state.votes).toHaveLength(1);
  });

  it('НЕ засчитывают, если тело врёт «paid», а ApiPay говорит «pending»', async () => {
    state.apiInvoice = { ...state.apiInvoice!, status: 'pending' };

    const res = await POST(webhookRequest(paidBody, null));

    await expect(res.json()).resolves.toMatchObject({ ok: true });
    expect(state.votes).toHaveLength(0);
  });

  it('НЕ засчитывают, если тело врёт про сумму — сумма берётся из ответа ApiPay', async () => {
    // Злоумышленник прислал «оплачено 2000», у ApiPay счёт на 200.
    state.apiInvoice = { ...state.apiInvoice!, amount: '200.00' };

    const res = await POST(webhookRequest(paidBody, null));

    await expect(res.json()).resolves.toMatchObject({ outcome: 'rejected_amount_mismatch_via_api' });
    expect(state.votes).toHaveLength(0);
  });

  it('не ходят в API за неизвестным заказом — защита от прокачки лимита', async () => {
    state.payment = null;

    const res = await POST(webhookRequest(paidBody, null));

    await expect(res.json()).resolves.toMatchObject({ outcome: 'rejected_unknown_order_unsigned' });
    expect(state.apiCalls).toHaveLength(0);
    expect(state.votes).toHaveLength(0);
  });

  it('не ходят в API по уже оплаченному счёту', async () => {
    state.payment!.status = 'paid';

    const res = await POST(webhookRequest(paidBody, null));

    await expect(res.json()).resolves.toMatchObject({ outcome: 'already_paid' });
    expect(state.apiCalls).toHaveLength(0);
  });

  it('отвергают счёт, принадлежащий чужому заказу', async () => {
    state.apiInvoice = { ...state.apiInvoice!, externalOrderId: 'vote_чужой' };

    const res = await POST(webhookRequest(paidBody, null));

    await expect(res.json()).resolves.toMatchObject({ outcome: 'rejected_order_mismatch' });
    expect(state.votes).toHaveLength(0);
  });

  it('отвергают, если ApiPay такого счёта не знает', async () => {
    state.apiInvoice = null;

    const res = await POST(webhookRequest(paidBody, null));

    await expect(res.json()).resolves.toMatchObject({
      outcome: 'rejected_invoice_not_found_at_apipay',
    });
    expect(state.votes).toHaveLength(0);
  });

  it('подделанная подпись идёт тем же строгим путём, что и её отсутствие', async () => {
    state.apiInvoice = { ...state.apiInvoice!, status: 'pending' };

    const res = await POST(webhookRequest(paidBody, 'sha256=deadbeef'));

    expect(state.votes).toHaveLength(0);
    await expect(res.json()).resolves.toMatchObject({ ok: true });
  });
});

describe('служебные случаи', () => {
  it('кнопка «Проверить уведомления» даёт понятный успех и помечает, был ли тест подписан', async () => {
    const signed = await POST(
      webhookRequest({ event: 'webhook.test', invoice: { id: 0, status: 'test' } }),
    );
    await expect(signed.json()).resolves.toMatchObject({ outcome: 'test_ok', signed: true });

    const unsigned = await POST(
      webhookRequest({ event: 'webhook.test', invoice: { id: 0, status: 'test' } }, null),
    );
    await expect(unsigned.json()).resolves.toMatchObject({ outcome: 'test_ok', signed: false });

    expect(state.votes).toHaveLength(0);
  });

  it('уведомление без номера заказа не создаёт выдачу', async () => {
    const res = await POST(webhookRequest({ event: 'invoice.status_changed', invoice: { id: 1 } }));

    await expect(res.json()).resolves.toMatchObject({ ignored: true });
    expect(state.votes).toHaveLength(0);
  });

  it('битый JSON отклоняется', async () => {
    const raw = '{не json';
    const res = await POST(
      new Request('https://example.kz/api/webhooks/apipay', {
        method: 'POST',
        headers: { 'x-webhook-signature': computeSignature(raw, SECRET) },
        body: raw,
      }),
    );

    expect(res.status).toBe(400);
    expect(state.votes).toHaveLength(0);
  });
});
