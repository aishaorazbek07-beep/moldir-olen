'use client';

import { useEffect, useState } from 'react';
import { fmt, tenge } from '@/lib/format';
import type { TeamWithStats } from '@/lib/votes';
import { Quill, QuillDivider } from './Quill';
import { Reveal } from './Reveal';
import { VoteFlow } from './VoteFlow';

export function VoteSection({
  initialTeams,
  votePrice,
  whatsappBase,
  eyebrow,
  title,
  lead,
  note,
}: {
  initialTeams: TeamWithStats[];
  votePrice: number;
  whatsappBase: string;
  eyebrow: string;
  title: string;
  lead: string;
  note: string;
}) {
  const [teams, setTeams] = useState(initialTeams);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);

  // Счётчики подтягиваются сами: в эфире цифры меняются, а зритель редко
  // догадывается обновить страницу.
  useEffect(() => {
    if (activeSlug) return; // пока человек платит, счётчики под ним не дёргаем

    const tick = async () => {
      try {
        const res = await fetch('/api/teams', { cache: 'no-store' });
        if (!res.ok) return;
        const data = (await res.json()) as { teams?: TeamWithStats[] };
        if (data.teams?.length) setTeams(data.teams);
      } catch {
        // молча: обновим на следующем круге
      }
    };

    const timer = setInterval(() => void tick(), 15000);
    return () => clearInterval(timer);
  }, [activeSlug]);

  const total = teams.reduce((sum, t) => sum + t.votes, 0);

  return (
    <>
      <Reveal className="vote-head">
        <Quill className="quill-ghost" />
        <span className="eyebrow">{eyebrow}</span>
        <h2 className="h2">{title}</h2>
        <p className="lead">{lead}</p>
        <div className="vote-note">
          ✦ 1 дауыс — {tenge(votePrice)} · {note}
        </div>
        <QuillDivider />
      </Reveal>

      <Reveal>
        <div className={`arena cols-${Math.min(teams.length, 4)}`}>
          {teams.map((team) => (
            <div
              key={team.slug}
              className={`vs-card${team.isLeader ? ' leading' : ''}`}
              data-c={team.colorIndex}
            >
              <div className="ink" style={{ height: `${team.fillPercent}%` }} />
              {team.isLeader ? <span className="crown">👑</span> : null}

              <div className="vs-body">
                <div className="vs-name serif">{team.name}</div>
                <div className="vs-place">{team.placeLabel}</div>

                <div className="vs-count">
                  <b>{fmt(team.votes)}</b>
                  <span>дауыс</span>
                </div>

                <div className="vs-bar">
                  <i style={{ width: `${team.percent}%` }} />
                </div>
                <div className="vs-pct">{team.percent}%</div>

                <button
                  className="btn btn-fire btn-block btn-vote"
                  onClick={() => setActiveSlug(team.slug)}
                  type="button"
                >
                  Дауыс беру
                </button>
              </div>
            </div>
          ))}
        </div>
      </Reveal>

      {teams.length > 1 ? (
        <p className="arena-total">
          Барлығы <b>{fmt(total)}</b> дауыс берілді
        </p>
      ) : null}

      {activeSlug ? (
        <VoteFlow
          teams={teams}
          onTeamsChange={setTeams}
          activeSlug={activeSlug}
          onClose={() => setActiveSlug(null)}
          whatsappBase={whatsappBase}
          votePrice={votePrice}
        />
      ) : null}
    </>
  );
}
