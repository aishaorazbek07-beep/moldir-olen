'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { TEST_MODE } from '@/components/usePayment';
import { tenge } from '@/lib/format';

interface Status {
  state: 'pending' | 'paid' | 'failed';
  kind: string;
  amount: number;
  ticket?: { number: string; qty: number; title: string; when: string; sum: number };
  reason?: string;
}

/**
 * Отдельная страница статуса платежа — её можно сохранить и вернуться позже,
 * если человек закрыл вкладку, пока платил в Kaspi.
 */
export function PaymentStatusView({ paymentId, initial }: { paymentId: string; initial: Status }) {
  const [status, setStatus] = useState(initial);

  useEffect(() => {
    if (status.state !== 'pending') return;

    const check = async () => {
      try {
        const res = await fetch(`/api/payment/${paymentId}/status`, { cache: 'no-store' });
        if (res.ok) setStatus((await res.json()) as Status);
      } catch {
        // повторим на следующем тике
      }
    };

    const timer = setInterval(() => void check(), 3000);
    return () => clearInterval(timer);
  }, [paymentId, status.state]);

  const testPay = async () => {
    await fetch('/api/dev/pay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentId }),
    });
    const res = await fetch(`/api/payment/${paymentId}/status`, { cache: 'no-store' });
    if (res.ok) setStatus((await res.json()) as Status);
  };

  const kindLabel =
    status.kind === 'vote' ? 'Дауыс' : status.kind === 'ticket' ? 'Билет' : 'Өтінім';

  return (
    <section className="page-top">
      <span className="eyebrow">Төлем</span>
      <h2 className="h2">
        {kindLabel} <em>төлемі</em>
      </h2>

      <div className="apply-card">
        <div className="sum">
          <span>Сома</span>
          <b>{tenge(status.amount)}</b>
        </div>

        {status.state === 'pending' ? (
          <>
            <div className="pay-wait">
              <div className="ring" />
              <p className="sub">
                Kaspi қосымшасынан төлемді растаңыз. Бұл бет өзі жаңарады.
              </p>
            </div>
            {TEST_MODE ? (
              <>
                <button className="btn btn-glass btn-block" onClick={() => void testPay()} type="button">
                  Тестілік төлемді растау
                </button>
                <div className="sandbox-note">Сынақ режимі: нақты ақша алынбайды.</div>
              </>
            ) : null}
          </>
        ) : status.state === 'paid' ? (
          <div className="pay-ok">
            <div className="check">✓</div>
            <h3 className="serif">Төлем қабылданды</h3>
            {status.ticket ? (
              <div className="ticket">
                <div className="ticket-top">
                  <small>Мөлдір өлең · 2-маусым</small>
                  <h4>{status.ticket.title}</h4>
                </div>
                <div className="ticket-mid">
                  <div>
                    <small>Күні</small>
                    <b>{status.ticket.when}</b>
                  </div>
                  <div>
                    <small>Саны</small>
                    <b>{status.ticket.qty}</b>
                  </div>
                  <div>
                    <small>Сома</small>
                    <b>{tenge(status.ticket.sum)}</b>
                  </div>
                </div>
                <div className="ticket-bot">
                  <span className="num">№ {status.ticket.number}</span>
                  <span className="qr" />
                </div>
              </div>
            ) : (
              <p className="sub">Рахмет! Төлеміңіз есепке алынды.</p>
            )}
          </div>
        ) : (
          <div className="pay-fail">
            <div className="cross">!</div>
            <h3 className="serif">Төлем расталмады</h3>
            <p className="sub">
              {status.reason === 'expired'
                ? 'Шоттың уақыты өтіп кетті.'
                : status.reason === 'amount_mismatch'
                  ? 'Төлем сомасы сәйкес келмеді. Қолдау қызметіне жазыңыз.'
                  : 'Төлем өтпеді.'}
            </p>
          </div>
        )}

        <Link className="btn btn-glass btn-block" href="/" style={{ marginTop: 14 }}>
          Басты бетке
        </Link>
      </div>
    </section>
  );
}
