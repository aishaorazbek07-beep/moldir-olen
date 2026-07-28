'use client';

import { useEffect, useState } from 'react';
import { fmt, tenge } from '@/lib/format';
import type { TeamWithStats } from '@/lib/votes';
import { CityPhoto } from './CityPhoto';
import { Reveal } from './Reveal';
import { VoteFlow } from './VoteFlow';

/**
 * Табло голосования: два города по обе стороны шва, между ними счёт.
 * Это же построение, что и в блоке поединка на главной — человек видит
 * знакомую фигуру и сразу понимает, за кого голосует.
 */
export function VoteSection({
  initialTeams,
  votePrice,
  eyebrow,
  title,
  lead,
  note,
}: {
  initialTeams: TeamWithStats[];
  votePrice: number;
  eyebrow: string;
  title: string;
  lead: string;
  note: string;
}) {
  const [teams, setTeams] = useState(initialTeams);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);

  // Счёт подтягивается сам: в эфире цифры меняются, а зритель редко
  // догадывается обновить страницу.
  useEffect(() => {
    if (activeSlug) return;

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
      <Reveal>
        <div className="sec-head">
          <span className="eyebrow">{eyebrow}</span>
          <h2 className="h2">{title}</h2>
          <p className="lead">{lead}</p>
        </div>

        <div className="card-head">
          <i />
          <b>
            1 дауыс — {tenge(votePrice)}
          </b>
          <i />
        </div>

        <div className="arena">
          {teams.map((team, i) => (
            <Slot key={team.slug} team={team} index={i} onVote={() => setActiveSlug(team.slug)} />
          ))}
        </div>

        <p className="arena-total">
          Барлығы <b>{fmt(total)}</b> дауыс
        </p>
      </Reveal>

      {activeSlug ? (
        <VoteFlow
          teams={teams}
          onTeamsChange={setTeams}
          activeSlug={activeSlug}
          onClose={() => setActiveSlug(null)}
          votePrice={votePrice}
        />
      ) : null}
    </>
  );
}

function Slot({
  team,
  index,
  onVote,
}: {
  team: TeamWithStats;
  index: number;
  onVote: () => void;
}) {
  return (
    <>
      {index > 0 ? <span className="seam" /> : null}
      <div className={`vs-card${index % 2 ? ' b' : ''}${team.isLeader ? ' leading' : ''}`}>
        <div className="vs-photo-top">
          {team.imageUrl ? <CityPhoto src={team.imageUrl} alt={team.name} /> : null}
        </div>

        <div className="vs-body">
          <div className="vs-name">{team.name}</div>
          <div className="vs-place">{team.placeLabel}</div>

          <div className="vs-count">
            <b>{fmt(team.votes)}</b>
            <span>дауыс</span>
          </div>

          <div className="vs-bar">
            <i style={{ width: `${team.percent}%` }} />
          </div>
          <div className="vs-pct">{team.percent}%</div>

          <button className="btn btn-fire btn-vote" onClick={onVote} type="button">
            Дауыс беру
          </button>
        </div>
      </div>
    </>
  );
}
