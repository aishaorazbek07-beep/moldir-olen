'use client';

import { useState } from 'react';
import { MAX_VOTES_PER_PAYMENT, VOTE_PRICE } from '@/lib/config';
import { fmt, tenge } from '@/lib/format';
import type { TeamWithStats } from '@/lib/votes';
import { Reveal } from './Reveal';
import { FailScreen, PhoneField, Sheet, SheetCta, WaitingScreen } from './Sheet';
import { TEST_MODE, usePayment } from './usePayment';

const ROMAN = ['I', 'II', 'III', 'IV', 'V'];

export function VoteSection({ initialTeams }: { initialTeams: TeamWithStats[] }) {
  const [teams, setTeams] = useState(initialTeams);
  const [activeTeam, setActiveTeam] = useState<TeamWithStats | null>(null);
  const [qty, setQty] = useState(1);
  const [phone, setPhone] = useState('+7 ');

  const payment = usePayment();

  const openVote = (team: TeamWithStats) => {
    setActiveTeam(team);
    setQty(1);
    payment.reset();
  };

  const closeSheet = () => {
    // Если оплата прошла, счётчики уже пришли в ответе статуса — забираем их.
    if (payment.teams) setTeams(payment.teams);
    setActiveTeam(null);
    payment.reset();
  };

  const changeQty = (delta: number) => {
    setQty((prev) => Math.min(MAX_VOTES_PER_PAYMENT, Math.max(1, prev + delta)));
  };

  const submit = () => {
    if (!activeTeam) return;
    void payment.start('/api/vote/start', { teamId: activeTeam.id, quantity: qty, phone });
  };

  const shownTeams = payment.teams ?? teams;
  const busy = payment.phase === 'starting';

  return (
    <>
      <Reveal>
        <span className="eyebrow">Суперфинал · 30 қыркүйек</span>
        <h2 className="h2">
          Дауыс <em>беріңіз</em>
        </h2>
        <p className="lead">Үш команда - бір тақ. Сіздің дауысыңыз тағдырды шешеді.</p>
        <div className="vote-note">
          ✦ 1 дауыс - {tenge(VOTE_PRICE)} · Kaspi арқылы төленеді
        </div>
      </Reveal>

      <div className="teams">
        {shownTeams.map((team, i) => (
          <Reveal key={team.id}>
            <div
              className={`team${team.isLeader ? ' lead-team' : ''}`}
              data-c={team.colorIndex}
            >
              <span className="crown">👑</span>
              <div className="ink" style={{ height: `${team.fillPercent}%` }} />
              <div className="team-top">
                <div className="team-badge">{ROMAN[i] ?? String(i + 1)}</div>
                <div>
                  <div className="team-name serif">{team.name}</div>
                  <div className="team-place">{team.placeLabel}</div>
                </div>
              </div>
              <div className="team-meta">
                <div className="votes">
                  <b>{fmt(team.votes)}</b>
                  <i className="pct">{team.percent}%</i>
                  <span>дауыс</span>
                </div>
                <button className="btn btn-fire btn-vote" onClick={() => openVote(team)} type="button">
                  Дауыс беру
                </button>
              </div>
            </div>
          </Reveal>
        ))}
      </div>

      <Sheet open={activeTeam !== null} onClose={closeSheet}>
        {activeTeam === null ? null : payment.phase === 'form' || payment.phase === 'starting' ? (
          <>
            <h3 className="serif">{activeTeam.name}</h3>
            <p className="sub">
              1 дауыс - {tenge(VOTE_PRICE)}. Бірнеше дауыс беруге болады.
            </p>

            <div className="qty">
              <button onClick={() => changeQty(-1)} disabled={busy} type="button" aria-label="Азайту">
                −
              </button>
              <b>{qty}</b>
              <button onClick={() => changeQty(1)} disabled={busy} type="button" aria-label="Көбейту">
                +
              </button>
            </div>

            <div className="sum">
              <span>Жалпы сома</span>
              <b>{tenge(qty * VOTE_PRICE)}</b>
            </div>

            <PhoneField value={phone} onChange={setPhone} disabled={busy} />

            <SheetCta>
              {payment.error ? <p className="form-error">{payment.error}</p> : null}
              <button className="btn btn-fire btn-block" onClick={submit} disabled={busy} type="button">
                {busy ? 'Шот жіберілуде...' : `${tenge(qty * VOTE_PRICE)} · Kaspi арқылы төлеу`}
              </button>
            </SheetCta>
          </>
        ) : payment.phase === 'waiting' ? (
          <WaitingScreen showTestButton={TEST_MODE} onTestPay={() => void payment.testPay()} />
        ) : payment.phase === 'paid' ? (
          <div className="pay-ok">
            <div className="check">✓</div>
            <h3 className="serif">Дауысыңыз қабылданды!</h3>
            <p className="sub">
              {activeTeam.name} командасына {qty} дауыс берілді. Рахмет!
            </p>
            <button className="btn btn-glass btn-block" onClick={closeSheet} type="button">
              Жабу
            </button>
          </div>
        ) : (
          <FailScreen message={payment.error ?? 'Төлем өтпеді'} onRetry={payment.reset} />
        )}
      </Sheet>
    </>
  );
}
