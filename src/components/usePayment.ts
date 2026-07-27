'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { TeamWithStats } from '@/lib/votes';

export type PaymentPhase = 'form' | 'starting' | 'waiting' | 'paid' | 'failed';

export interface TicketInfo {
  number: string;
  qty: number;
  title: string;
  when: string;
  sum: number;
}

interface StatusResponse {
  state: 'pending' | 'paid' | 'failed';
  kind: string;
  amount: number;
  teams?: TeamWithStats[];
  ticket?: TicketInfo;
  reason?: string;
}

const POLL_INTERVAL_MS = 2000;
/** Счёт в Kaspi живёт сутки, но столько ждать на экране бессмысленно. */
const WAIT_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * Кнопка тестового подтверждения показывается только при явном разрешении.
 * Зеркалит серверную проверку: без ENABLE_TEST_PAYMENTS маршрут всё равно 404.
 */
export const TEST_MODE =
  process.env.NEXT_PUBLIC_PAYMENTS_MODE !== 'live' &&
  process.env.NEXT_PUBLIC_ENABLE_TEST_PAYMENTS === 'true';

/**
 * Ведёт платёж со стороны браузера: создаёт счёт и опрашивает статус.
 *
 * Опрос — только чтение. Голос засчитывает сервер по подтверждению от ApiPay,
 * поэтому вмешательство в этот код (или подделка ответа) ни на что не влияет.
 */
export function usePayment() {
  const [phase, setPhase] = useState<PaymentPhase>('form');
  const [error, setError] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [teams, setTeams] = useState<TeamWithStats[] | null>(null);
  const [ticket, setTicket] = useState<TicketInfo | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const deadlineRef = useRef(0);

  const stopPolling = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => stopPolling, [stopPolling]);

  const reset = useCallback(() => {
    stopPolling();
    setPhase('form');
    setError(null);
    setPaymentId(null);
    setTeams(null);
    setTicket(null);
  }, [stopPolling]);

  const poll = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/payment/${id}/status`, { cache: 'no-store' });
        if (!res.ok) return;

        const data = (await res.json()) as StatusResponse;

        if (data.state === 'paid') {
          stopPolling();
          if (data.teams) setTeams(data.teams);
          if (data.ticket) setTicket(data.ticket);
          setPhase('paid');
          return;
        }

        if (data.state === 'failed') {
          stopPolling();
          setError(
            data.reason === 'expired'
              ? 'Төлем уақыты өтіп кетті. Қайтадан көріңіз.'
              : data.reason === 'amount_mismatch'
                ? 'Төлем сомасы сәйкес келмеді. Қолдау көрсету қызметіне жазыңыз.'
                : 'Төлем өтпеді. Қайтадан көріңіз.',
          );
          setPhase('failed');
          return;
        }

        if (Date.now() > deadlineRef.current) {
          stopPolling();
          setError('Төлем расталмады. Kaspi қосымшасын тексеріп, қайта көріңіз.');
          setPhase('failed');
        }
      } catch {
        // Сетевой сбой при опросе — не повод показывать ошибку: попробуем снова.
      }
    },
    [stopPolling],
  );

  const start = useCallback(
    async (endpoint: string, body: Record<string, unknown>) => {
      setError(null);
      setPhase('starting');

      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        const data = (await res.json()) as { paymentId?: string; error?: string };

        if (!res.ok || !data.paymentId) {
          setError(data.error ?? 'Төлемді бастау мүмкін болмады');
          setPhase('form');
          return;
        }

        setPaymentId(data.paymentId);
        setPhase('waiting');
        deadlineRef.current = Date.now() + WAIT_TIMEOUT_MS;

        void poll(data.paymentId);
        stopPolling();
        timerRef.current = setInterval(() => void poll(data.paymentId!), POLL_INTERVAL_MS);
      } catch {
        setError('Байланыс үзілді. Интернетті тексеріңіз.');
        setPhase('form');
      }
    },
    [poll, stopPolling],
  );

  /**
   * Только в тестовом режиме: просит сервер провести счёт.
   *
   * В песочнице это идёт через ApiPay, поэтому подтверждение приходит настоящим
   * webhook'ом — и появляется не мгновенно. Опрос статуса его подхватит.
   */
  const testPay = useCallback(async () => {
    if (!TEST_MODE || !paymentId) return;

    const res = await fetch('/api/dev/pay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentId }),
    });

    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? 'Тестовый платёж не прошёл');
    }

    void poll(paymentId);
  }, [paymentId, poll]);

  return { phase, error, paymentId, teams, ticket, start, reset, testPay };
}
