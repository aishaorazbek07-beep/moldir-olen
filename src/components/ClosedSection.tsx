import Link from 'next/link';
import { Reveal } from './Reveal';

/**
 * Заглушка для разделов, которые пока не работают.
 *
 * Честнее, чем прятать раздел совсем: человек, пришедший по старой ссылке или
 * из таб-бара, видит, что происходит, и куда идти дальше.
 */
export function ClosedSection({
  eyebrow,
  title,
  accent,
  notice,
}: {
  eyebrow: string;
  title: string;
  accent: string;
  notice: string;
}) {
  return (
    <>
      <Reveal>
        <span className="eyebrow">{eyebrow}</span>
        <h2 className="h2">
          {title} <em>{accent}</em>
        </h2>
      </Reveal>

      <Reveal>
        <div className="closed-box">
          <span className="lock" aria-hidden="true">
            🔒
          </span>
          <h3 className="serif">Әзірге жабық</h3>
          <p>{notice}</p>
          <Link className="btn btn-fire" href="/dauys">
            Дауыс беруге өту
          </Link>
        </div>
      </Reveal>
    </>
  );
}
