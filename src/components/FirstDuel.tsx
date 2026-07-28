import type { Duel } from '@/lib/duels';
import { Reveal } from './Reveal';

/**
 * Блок «Алғашқы дуэль» — два города друг против друга с фотографиями.
 *
 * Если снимка города ещё нет, вместо него идёт золотой градиент с силуэтом:
 * блок выглядит законченным и без фотографий, а поставить их можно потом
 * ссылкой в админке.
 */
export function FirstDuel({
  duel,
  label,
  photoA,
  photoB,
}: {
  duel: Duel;
  label: string;
  photoA: string;
  photoB: string;
}) {
  const when = new Intl.DateTimeFormat('ru-RU', {
    timeZone: 'Asia/Almaty',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(duel.startsAt));

  const time = new Intl.DateTimeFormat('ru-RU', {
    timeZone: 'Asia/Almaty',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(duel.startsAt));

  return (
    <Reveal>
      <div className="orn">
        <i />
        <b>{label}</b>
        <i />
      </div>

      <div className="vs-block">
        <div className="vs-top">
          <Side name={duel.teamA} photo={photoA} />
          <span className="vs-mid">VS</span>
          <Side name={duel.teamB} photo={photoB} side="b" />
        </div>

        <div className="vs-meta">
          <span>
            📅 <b>{when}</b>
          </span>
          <span>
            🕖 <b>{time}</b>
          </span>
          {duel.venue ? (
            <span>
              📍 <b>{duel.venue}</b>
            </span>
          ) : null}
        </div>
      </div>
    </Reveal>
  );
}

function Side({ name, photo, side = 'a' }: { name: string; photo: string; side?: 'a' | 'b' }) {
  return (
    <div className={`vs-side ${side}`}>
      <span className={`vs-photo ${photo ? '' : 'blank'}`}>
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt={name} loading="lazy" />
        ) : (
          <svg viewBox="0 0 64 40" aria-hidden="true">
            <path
              d="M2 38h60M8 38V22l6-5 6 5v16M24 38V14l8-7 8 7v24M46 38V24l6-4 6 4v14M32 7V2"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
      <h3>{name}</h3>
    </div>
  );
}
