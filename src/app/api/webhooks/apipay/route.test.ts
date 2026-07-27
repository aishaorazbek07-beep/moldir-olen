import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PaymentRecord } from '@/lib/payments-core';
import { computeSignature } from '@/lib/webhook-signature';

const SECRET = 'whsec_route_test';
process.env.APIPAY_WEBHOOK_SECRET = SECRET;

/**
 * Хранилище подменяем, платёжное ядро — настоящее. Так тест проверяет весь путь
 * запроса: подпись → разбор → ядро → выдача.
 */
const state = {
  payment: null as PaymentRecord | null,
  votes: [] as Array<{ paymentId: string; teamId: number; quantity: number }>,
  statuses: [] as string[],
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
});

describe('POST /api/webhooks/apipay', () => {
  it('засчитывает голоса при верной подписи', async () => {
    const res = await POST(webhookRequest(paidBody));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ outcome: 'granted_vote' });
    expect(state.votes).toEqual([{ paymentId: 'pay-1', teamId: 2, quantity: 10 }]);
  });

  it('отвергает подделанную подпись и НЕ засчитывает голос', async () => {
    const res = await POST(webhookRequest(paidBody, 'sha256=deadbeef'));

    expect(res.status).toBe(401);
    expect(state.votes).toHaveLength(0);
  });

  it('отвергает запрос без подписи — старая дыра закрыта', async () => {
    const res = await POST(webhookRequest(paidBody, null));

    expect(res.status).toBe(401);
    expect(state.votes).toHaveLength(0);
  });

  it('подпись, посчитанная чужим секретом, не проходит', async () => {
    const raw = JSON.stringify(paidBody);
    const res = await POST(webhookRequest(paidBody, computeSignature(raw, 'чужой')));

    expect(res.status).toBe(401);
    expect(state.votes).toHaveLength(0);
  });

  it('подписанное, но подменённое после подписи тело не проходит', async () => {
    const original = JSON.stringify(paidBody);
    const signature = computeSignature(original, SECRET);

    // Сумму увеличили после подписания — подпись обязана разойтись.
    const tampered = original.replace('2000.00', '999999.00');
    const req = new Request('https://example.kz/api/webhooks/apipay', {
      method: 'POST',
      headers: { 'x-webhook-signature': signature, 'content-type': 'application/json' },
      body: tampered,
    });

    const res = await POST(req);

    expect(res.status).toBe(401);
    expect(state.votes).toHaveLength(0);
  });

  it('повторная доставка того же webhook даёт один голос', async () => {
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
    const res = await POST(
      webhookRequest({ ...paidBody, invoice: { ...paidBody.invoice, status: 'expired' } }),
    );

    expect(res.status).toBe(200);
    expect(state.votes).toHaveLength(0);
    expect(state.statuses).toContain('expired');
  });

  it('webhook про неизвестный заказ ничего не создаёт', async () => {
    state.payment = null;
    const res = await POST(webhookRequest(paidBody));

    await expect(res.json()).resolves.toMatchObject({ outcome: 'rejected_payment_not_found' });
    expect(state.votes).toHaveLength(0);
  });

  it('битый JSON с верной подписью отклоняется', async () => {
    const raw = '{не json';
    const req = new Request('https://example.kz/api/webhooks/apipay', {
      method: 'POST',
      headers: { 'x-webhook-signature': computeSignature(raw, SECRET) },
      body: raw,
    });

    const res = await POST(req);

    expect(res.status).toBe(400);
    expect(state.votes).toHaveLength(0);
  });
});
