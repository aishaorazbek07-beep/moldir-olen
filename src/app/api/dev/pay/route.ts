import { NextResponse } from 'next/server';
import { simulateStatus } from '@/lib/apipay';
import { paymentsMode, testPaymentsEnabled } from '@/lib/config';
import { confirmPayment } from '@/lib/payments-core';
import { badRequest, readJson } from '@/lib/request';
import { loadPaymentById, paymentRepo } from '@/lib/repo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Тестовое подтверждение оплаты.
 *
 * Включается только двумя условиями сразу: PAYMENTS_MODE не live И
 * ENABLE_TEST_PAYMENTS=true. В любом другом случае — 404, то есть подтвердить
 * оплату этим маршрутом нельзя даже зная адрес и paymentId.
 *
 * Двойное условие не паранойя: незаданная переменная окружения не должна
 * открывать способ засчитать голос без денег.
 *
 * В режиме sandbox вызывает POST /invoices/{id}/simulate-status у ApiPay: счёт
 * проводится на их стороне и к нам прилетает настоящий подписанный webhook.
 * Это проверяет боевой путь целиком, а не отдельную упрощённую ветку.
 *
 * В режиме offline (нет сети или ключа) подтверждает локально — но тем же
 * confirmPayment, который вызывает и webhook.
 */
export async function POST(req: Request) {
  if (!testPaymentsEnabled()) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  const body = await readJson<{ paymentId?: unknown }>(req);
  const paymentId = typeof body?.paymentId === 'string' ? body.paymentId : null;
  if (!paymentId) return badRequest('paymentId керек');

  const payment = await loadPaymentById(paymentId);
  if (!payment) return NextResponse.json({ error: 'not found' }, { status: 404 });

  if (paymentsMode() === 'sandbox' && payment.apipayInvoiceId) {
    const result = await simulateStatus(payment.apipayInvoiceId, 'paid');

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error ?? 'Не удалось провести тестовый счёт' },
        { status: 502 },
      );
    }

    // Дальше ждём webhook. Опрос статуса на клиенте всё равно подхватит результат,
    // даже если webhook задержится.
    return NextResponse.json({ ok: true, via: 'apipay_simulate' });
  }

  const result = await confirmPayment(paymentRepo, {
    externalOrderId: payment.externalOrderId,
    amount: payment.expectedAmount,
    apipayInvoiceId: payment.apipayInvoiceId ?? `offline_${payment.externalOrderId}`,
    paidAt: new Date().toISOString(),
  });

  return NextResponse.json({ ok: result.ok, via: 'offline_confirm', result });
}
