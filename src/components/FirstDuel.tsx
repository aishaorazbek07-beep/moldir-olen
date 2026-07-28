import type { Duel } from '@/lib/duels';
import { CityPhoto } from './CityPhoto';
import { Reveal } from './Reveal';

/**
 * Табло ближайшего поединка: два города по обе стороны шва с меткой VS.
 *
 * Если снимка города ещё нет, вместо него силуэт — блок выглядит законченным
 * и без фотографии, а поставить её можно потом ссылкой в админке.
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
  const at = new Date(duel.startsAt);
  const day = new Intl.DateTimeFormat('ru-RU', {
    timeZone: 'Asia/Almaty',
    day: 'numeric',
    month: 'long',
  }).format(at);
  const time = new Intl.DateTimeFormat('ru-RU', {
    timeZone: 'Asia/Almaty',
    hour: '2-digit',
    minute: '2-digit',
  }).format(at);

  return (
    <Reveal>
      <div className="card-head">
        <i />
        <b>{label}</b>
        <i />
      </div>

      <div className="board">
        <div className="board-top">
          <Side name={duel.teamA} photo={photoA} />
          <span className="board-seam" />
          <Side name={duel.teamB} photo={photoB} side="b" />
        </div>

        <div className="board-meta">
          <div>
            <span>Күні</span>
            <b>{day}</b>
          </div>
          <div>
            <span>Уақыты</span>
            <b>{time}</b>
          </div>
          {duel.venue ? (
            <div>
              <span>Орны</span>
              <b>{duel.venue}</b>
            </div>
          ) : null}
        </div>
      </div>
    </Reveal>
  );
}

function Side({ name, photo, side = 'a' }: { name: string; photo: string; side?: 'a' | 'b' }) {
  return (
    <div className={`board-side ${side}`}>
      <div className={`board-photo${photo ? '' : ' blank'}`}>
        {photo ? (
          <CityPhoto src={photo} alt={name} />
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
        <div className="board-name">
          <b>{name}</b>
        </div>
      </div>
    </div>
  );
}
