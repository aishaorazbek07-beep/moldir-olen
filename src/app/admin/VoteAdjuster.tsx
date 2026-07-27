'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { fmt } from '@/lib/format';
import type { AdminTeamRow } from '@/lib/admin-data';

const STEPS = [1, 10, 100];

/**
 * Ручная корректировка голосов.
 *
 * Оплаченные голоса и корректировка показаны раздельно намеренно: настоящую
 * цифру всегда видно, а правку можно откатить обратным шагом. Каждое нажатие
 * пишется в журнал ниже на этой странице.
 */
export function VoteAdjuster({ initialTeams }: { initialTeams: AdminTeamRow[] }) {
  const router = useRouter();
  const [teams, setTeams] = useState(initialTeams);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const adjust = async (teamId: number, delta: number) => {
    setBusyId(teamId);
    setError(null);

    try {
      const res = await fetch('/api/admin/votes/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId, delta }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? 'Не удалось изменить');
        return;
      }

      const { team } = (await res.json()) as { team: AdminTeamRow };
      setTeams((prev) => prev.map((t) => (t.id === team.id ? team : t)));
      // Обновляем страницу, чтобы в журнале появилась новая запись.
      router.refresh();
    } catch {
      setError('Нет связи с сервером');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <p className="admin-note">
        Итоговое число = оплаченные голоса + корректировка. Наружу уходит только итог: на публичной
        странице и в API разбивки нет. Каждое нажатие пишется в журнал ниже.
      </p>

      {error ? <p className="form-error">{error}</p> : null}

      {teams.map((team) => (
        <div className="team-admin" key={team.id}>
          <div className="team-admin-top">
            <b>{team.name}</b>
            <small>{team.placeLabel}</small>
          </div>

          <div className="breakdown">
            <div>
              <span>Оплачено</span>
              <b>{fmt(team.paidVotes)}</b>
            </div>
            <div className="adj">
              <span>Корректировка</span>
              <b className={team.adminAdjustment >= 0 ? 'plus' : 'minus'}>
                {team.adminAdjustment > 0 ? '+' : ''}
                {fmt(team.adminAdjustment)}
              </b>
            </div>
            <div className="total">
              <span>Итого на сайте</span>
              <b>{fmt(team.total)}</b>
            </div>
            <div>
              <span>Платежей</span>
              <b>{fmt(team.payments)}</b>
            </div>
          </div>

          <div className="adjust-row">
            {STEPS.map((step) => (
              <button
                key={`plus-${step}`}
                className="plus"
                onClick={() => void adjust(team.id, step)}
                disabled={busyId === team.id}
                type="button"
              >
                +{step}
              </button>
            ))}
            {STEPS.map((step) => (
              <button
                key={`minus-${step}`}
                className="minus"
                onClick={() => void adjust(team.id, -step)}
                disabled={busyId === team.id}
                type="button"
              >
                −{step}
              </button>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
