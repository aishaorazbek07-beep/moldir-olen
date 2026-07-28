import type { Poet } from '@/lib/catalog';
import { Reveal } from './Reveal';

/**
 * Карточки поэтов.
 *
 * Если фотографии ещё нет, вместо неё показывается золотой медальон с первой
 * буквой имени и пером. Пустая рамка выглядела бы поломкой, а медальон —
 * осознанным решением, и раздел можно публиковать, не дожидаясь съёмки.
 */
export function Poets({ poets, title, lead }: { poets: Poet[]; title: string; lead: string }) {
  if (poets.length === 0) return null;

  return (
    <>
      <Reveal>
        <span className="eyebrow">Ақындар</span>
        <h2 className="h2">{title}</h2>
        {lead ? <p className="lead">{lead}</p> : null}
      </Reveal>

      <div className="poets">
        {poets.map((poet) => (
          <Reveal key={poet.id}>
            <article className="poet">
              <div className="poet-photo">
                {poet.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={poet.imageUrl} alt={poet.name} loading="lazy" />
                ) : (
                  <span className="poet-initial">
                    <b>{poet.name.trim().charAt(0) || 'Ө'}</b>
                  </span>
                )}
              </div>

              <div className="poet-body">
                <h3 className="serif">{poet.name}</h3>
                {poet.region ? <p className="poet-region">{poet.region}</p> : null}
                {poet.quote ? <blockquote className="poet-quote">«{poet.quote}»</blockquote> : null}
                {poet.bio ? <p className="poet-bio">{poet.bio}</p> : null}
              </div>
            </article>
          </Reveal>
        ))}
      </div>
    </>
  );
}
