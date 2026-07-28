import type { Duel } from '@/lib/duels';
import { tenge } from '@/lib/format';
import { Reveal } from './Reveal';

const MONTHS = [
  'қаңтар', 'ақпан', 'наурыз', 'сәуір', 'мамыр', 'маусым',
  'шілде', 'тамыз', 'қыркүйек', 'қазан', 'қараша', 'желтоқсан',
];

/** «29 шілде 2026 · 19:00» — как на афише проекта. */
function formatWhen(iso: string): string {
  const d = new Date(iso);
  // Время показываем в казахстанском поясе независимо от того, где стоит сервер.
  const parts = new Intl.DateTimeFormat('ru-RU', {
    timeZone: 'Asia/Almaty',
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(d);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const month = MONTHS[Number(get('month')) - 1] ?? '';

  return `${Number(get('day'))} ${month} ${get('year')} · ${get('hour')}:${get('minute')}`;
}

export function Duels({
  duels,
  title,
  youtubeUrl,
}: {
  duels: Duel[];
  title: string;
  youtubeUrl: string;
}) {
  if (duels.length === 0 && !youtubeUrl) return null;

  return (
    <>
      {duels.length > 0 ? (
        <Reveal>
          <h2 className="h2 duels-title">{title}</h2>
        </Reveal>
      ) : null}

      <div className="duels">
        {duels.map((duel) => (
          <Reveal key={duel.id}>
            <article className="duel">
              {duel.hasPoster ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="duel-poster" src={`/api/duel/${duel.id}/poster`} alt="" loading="lazy" />
              ) : null}

              <div className="duel-body">
                <p className="duel-when">{formatWhen(duel.startsAt)}</p>
                <p className="duel-a">{duel.teamA}</p>
                <p className="duel-vs">vs</p>
                <p className="duel-b">{duel.teamB}</p>

                <div className="duel-foot">
                  {duel.price > 0 ? <span className="duel-price">{tenge(duel.price)}</span> : null}
                  {duel.ticketUrl ? (
                    <a
                      className="btn btn-fire btn-duel"
                      href={duel.ticketUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                    >
                      Билет алу
                    </a>
                  ) : null}
                </div>
              </div>
            </article>
          </Reveal>
        ))}
      </div>

      {youtubeUrl ? (
        <Reveal>
          <a className="live" href={youtubeUrl} target="_blank" rel="noreferrer noopener">
            <span className="live-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <rect x="1" y="4" width="22" height="16" rx="5" fill="#FF0033" />
                <path d="M10 8.5l6 3.5-6 3.5z" fill="#fff" />
              </svg>
            </span>
            <span className="live-text">
              <small>YouTube</small>
              <b>Тікелей эфир</b>
              <i>каналға өту →</i>
            </span>
            <span className="live-dot" aria-hidden="true" />
          </a>
        </Reveal>
      ) : null}
    </>
  );
}
