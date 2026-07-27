import { beforeEach, describe, expect, it } from 'vitest';
import {
  applyInvoiceStatus,
  confirmPayment,
  ticketNumberFor,
  type PaymentRecord,
  type PaymentRepo,
  type PaymentStatus,
} from './payments-core';

/**
 * Фальшивое хранилище, повторяющее ровно те свойства настоящей базы, на которые
 * опирается платёжное ядро: UNIQUE на payment_id у каждой выдачи.
 */
class FakeRepo implements PaymentRepo {
  payments = new Map<string, PaymentRecord>();
  votes: Array<{ paymentId: string; teamId: number; quantity: number }> = [];
  tickets: Array<{ paymentId: string; showSlug: string; qty: number; ticketNumber: string }> = [];
  applications: Array<{ paymentId: string; name: string }> = [];
  paidCalls = 0;
  statusCalls: Array<{ paymentId: string; status: PaymentStatus }> = [];

  seed(p: Partial<PaymentRecord> & Pick<PaymentRecord, 'id' | 'externalOrderId' | 'kind'>) {
    const record: PaymentRecord = {
      expectedAmount: 200,
      status: 'pending',
      meta: {},
      ...p,
    } as PaymentRecord;
    this.payments.set(record.externalOrderId, record);
    return record;
  }

  async findByExternalOrderId(externalOrderId: string) {
    return this.payments.get(externalOrderId) ?? null;
  }

  async markPaid(paymentId: string) {
    this.paidCalls += 1;
    for (const p of this.payments.values()) if (p.id === paymentId) p.status = 'paid';
  }

  async markStatus(paymentId: string, status: PaymentStatus) {
    this.statusCalls.push({ paymentId, status });
    for (const p of this.payments.values()) if (p.id === paymentId) p.status = status;
  }

  async grantVote(paymentId: string, teamId: number, quantity: number) {
    if (this.votes.some((v) => v.paymentId === paymentId)) return false; // UNIQUE(payment_id)
    this.votes.push({ paymentId, teamId, quantity });
    return true;
  }

  async grantTicket(paymentId: string, showSlug: string, qty: number, ticketNumber: string) {
    if (this.tickets.some((t) => t.paymentId === paymentId)) return false;
    this.tickets.push({ paymentId, showSlug, qty, ticketNumber });
    return true;
  }

  async grantApplication(paymentId: string, data: { name: string }) {
    if (this.applications.some((a) => a.paymentId === paymentId)) return false;
    this.applications.push({ paymentId, name: data.name });
    return true;
  }
}

let repo: FakeRepo;

beforeEach(() => {
  repo = new FakeRepo();
});

describe('confirmPayment — голоса', () => {
  it('засчитывает голоса, когда сумма совпала', async () => {
    repo.seed({
      id: 'p1',
      externalOrderId: 'vote_p1',
      kind: 'vote',
      expectedAmount: 2000,
      meta: { teamId: 3, quantity: 10 },
    });

    const res = await confirmPayment(repo, {
      externalOrderId: 'vote_p1',
      amount: '2000.00',
      apipayInvoiceId: '13234689513',
      paidAt: '2026-07-27T10:00:00+00:00',
    });

    expect(res).toEqual({ ok: true, kind: 'vote', paymentId: 'p1', alreadyGranted: false });
    expect(repo.votes).toEqual([{ paymentId: 'p1', teamId: 3, quantity: 10 }]);
    expect(repo.payments.get('vote_p1')!.status).toBe('paid');
  });

  it('НЕ засчитывает голос, если сумма не совпала с ожидаемой', async () => {
    repo.seed({
      id: 'p2',
      externalOrderId: 'vote_p2',
      kind: 'vote',
      expectedAmount: 2000,
      meta: { teamId: 1, quantity: 10 },
    });

    const res = await confirmPayment(repo, { externalOrderId: 'vote_p2', amount: '200.00' });

    expect(res).toEqual({ ok: false, reason: 'amount_mismatch' });
    expect(repo.votes).toHaveLength(0);
    expect(repo.payments.get('vote_p2')!.status).toBe('amount_mismatch');
  });

  it('повторный webhook по тому же платежу даёт ровно один голос', async () => {
    repo.seed({
      id: 'p3',
      externalOrderId: 'vote_p3',
      kind: 'vote',
      expectedAmount: 200,
      meta: { teamId: 2, quantity: 1 },
    });
    const input = { externalOrderId: 'vote_p3', amount: '200.00' };

    const first = await confirmPayment(repo, input);
    const second = await confirmPayment(repo, input);
    const third = await confirmPayment(repo, input);

    expect(first).toMatchObject({ ok: true, alreadyGranted: false });
    expect(second).toMatchObject({ ok: true, alreadyGranted: true });
    expect(third).toMatchObject({ ok: true, alreadyGranted: true });
    expect(repo.votes).toHaveLength(1);
    expect(repo.votes[0].quantity).toBe(1);
  });

  it('одиннадцать ретраев ApiPay дают один голос', async () => {
    repo.seed({
      id: 'p4',
      externalOrderId: 'vote_p4',
      kind: 'vote',
      expectedAmount: 600,
      meta: { teamId: 1, quantity: 3 },
    });

    for (let i = 0; i < 11; i += 1) {
      await confirmPayment(repo, { externalOrderId: 'vote_p4', amount: '600.00' });
    }

    expect(repo.votes).toHaveLength(1);
  });

  it('параллельные webhook и опрос статуса дают один голос', async () => {
    repo.seed({
      id: 'p5',
      externalOrderId: 'vote_p5',
      kind: 'vote',
      expectedAmount: 400,
      meta: { teamId: 2, quantity: 2 },
    });
    const input = { externalOrderId: 'vote_p5', amount: '400.00' };

    const [a, b] = await Promise.all([confirmPayment(repo, input), confirmPayment(repo, input)]);

    expect([a.ok, b.ok]).toEqual([true, true]);
    expect(repo.votes).toHaveLength(1);
  });

  it('неизвестный платёж ничего не создаёт', async () => {
    const res = await confirmPayment(repo, { externalOrderId: 'vote_нет_такого', amount: '200.00' });
    expect(res).toEqual({ ok: false, reason: 'payment_not_found' });
    expect(repo.votes).toHaveLength(0);
  });

  it('битые meta не приводят к голосу', async () => {
    repo.seed({
      id: 'p6',
      externalOrderId: 'vote_p6',
      kind: 'vote',
      expectedAmount: 200,
      meta: {},
    });

    const res = await confirmPayment(repo, { externalOrderId: 'vote_p6', amount: '200.00' });

    expect(res).toEqual({ ok: false, reason: 'bad_meta' });
    expect(repo.votes).toHaveLength(0);
  });
});

describe('confirmPayment — билеты и заявки', () => {
  it('выдаёт билет с устойчивым номером', async () => {
    repo.seed({
      id: '7f3a91c4-0000-4000-8000-000000000001',
      externalOrderId: 'ticket_x',
      kind: 'ticket',
      expectedAmount: 20000,
      meta: { showSlug: 'superfinal', qty: 2 },
    });

    const res = await confirmPayment(repo, { externalOrderId: 'ticket_x', amount: '20000.00' });

    expect(res.ok).toBe(true);
    expect(repo.tickets).toHaveLength(1);
    expect(repo.tickets[0].ticketNumber).toBe(ticketNumberFor('7f3a91c4-0000-4000-8000-000000000001'));
  });

  it('номер билета не зависит от количества вызовов', () => {
    const id = 'aa11bb22-0000-4000-8000-000000000009';
    expect(ticketNumberFor(id)).toBe(ticketNumberFor(id));
    expect(ticketNumberFor(id)).toMatch(/^MO-[0-9A-F]{6}$/);
  });

  it('сохраняет заявку только после оплаты взноса', async () => {
    repo.seed({
      id: 'p8',
      externalOrderId: 'application_p8',
      kind: 'application',
      expectedAmount: 30000,
      meta: { name: 'Айдана Серікқызы', birthYear: 1998, region: 'Алматы облысы', resume: '...' },
    });

    const res = await confirmPayment(repo, { externalOrderId: 'application_p8', amount: '30000.00' });

    expect(res.ok).toBe(true);
    expect(repo.applications).toEqual([{ paymentId: 'p8', name: 'Айдана Серікқызы' }]);
  });

  it('заявку с недоплатой не сохраняет', async () => {
    repo.seed({
      id: 'p9',
      externalOrderId: 'application_p9',
      kind: 'application',
      expectedAmount: 30000,
      meta: { name: 'Тест', birthYear: 2000, region: 'Астана', resume: '' },
    });

    const res = await confirmPayment(repo, { externalOrderId: 'application_p9', amount: '3000.00' });

    expect(res).toEqual({ ok: false, reason: 'amount_mismatch' });
    expect(repo.applications).toHaveLength(0);
  });
});

describe('applyInvoiceStatus', () => {
  it('статус paid ведёт к выдаче', async () => {
    repo.seed({
      id: 'p10',
      externalOrderId: 'vote_p10',
      kind: 'vote',
      expectedAmount: 200,
      meta: { teamId: 1, quantity: 1 },
    });

    await applyInvoiceStatus(repo, { externalOrderId: 'vote_p10', status: 'paid', amount: '200.00' });

    expect(repo.votes).toHaveLength(1);
  });

  it.each(['cancelled', 'expired', 'error'] as const)(
    'статус %s только помечает платёж и ничего не выдаёт',
    async (status) => {
      repo.seed({
        id: 'p11',
        externalOrderId: 'vote_p11',
        kind: 'vote',
        expectedAmount: 200,
        meta: { teamId: 1, quantity: 1 },
      });

      await applyInvoiceStatus(repo, { externalOrderId: 'vote_p11', status, amount: '200.00' });

      expect(repo.votes).toHaveLength(0);
      expect(repo.payments.get('vote_p11')!.status).toBe(status);
    },
  );

  it('статусы processing и pending ничего не меняют', async () => {
    repo.seed({
      id: 'p12',
      externalOrderId: 'vote_p12',
      kind: 'vote',
      expectedAmount: 200,
      meta: { teamId: 1, quantity: 1 },
    });

    await applyInvoiceStatus(repo, { externalOrderId: 'vote_p12', status: 'pending', amount: '200.00' });
    await applyInvoiceStatus(repo, { externalOrderId: 'vote_p12', status: 'processing', amount: '200.00' });

    expect(repo.votes).toHaveLength(0);
    expect(repo.payments.get('vote_p12')!.status).toBe('pending');
  });

  it('уже оплаченный платёж не откатывается статусом expired', async () => {
    repo.seed({
      id: 'p13',
      externalOrderId: 'vote_p13',
      kind: 'vote',
      expectedAmount: 200,
      status: 'paid',
      meta: { teamId: 1, quantity: 1 },
    });

    await applyInvoiceStatus(repo, { externalOrderId: 'vote_p13', status: 'expired', amount: '200.00' });

    expect(repo.payments.get('vote_p13')!.status).toBe('paid');
  });
});
