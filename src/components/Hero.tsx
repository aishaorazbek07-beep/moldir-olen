'use client';

import Link from 'next/link';

/** Заголовок собирается по буквам с нарастающей задержкой. */
function Letters({ word, delay }: { word: string; delay: number }) {
  return (
    <>
      {[...word].map((char, i) => (
        <span key={`${char}-${i}`} className="ch" style={{ animationDelay: `${delay + i * 0.06}s` }}>
          {char}
        </span>
      ))}
    </>
  );
}

export function Hero({
  tagline,
  tags,
  verse,
}: {
  tagline: string;
  tags: string[];
  verse: string;
}) {
  return (
    <section className="hero" id="top">
      <div className="hero-inner">
        <span className="eyebrow">{tagline}</span>

        <div className="title">
          <div className="row t1">
            <Letters word="Мөлдір" delay={0.25} />
          </div>
          <div className="row t2">
            <Letters word="өлең" delay={0.6} />
          </div>
        </div>

        <div className="hero-rule" />

        {verse ? (
          <p className="hero-verse">
            {verse.split('\n').map((line, i) => (
              <span key={i}>
                {line}
                <br />
              </span>
            ))}
          </p>
        ) : null}

        <div className="hero-facts">
          {tags.map((tag) => {
            const space = tag.lastIndexOf(' ');
            return (
              <div key={tag}>
                <b>{space > 0 ? tag.slice(0, space) : tag}</b>
                <span>{space > 0 ? tag.slice(space + 1) : ''}</span>
              </div>
            );
          })}
        </div>

        <div className="hero-cta">
          <Link className="btn btn-fire" href="/dauys">
            Дауыс беру
          </Link>
          <Link className="btn btn-glass" href="/duels">
            Дуэльдер
          </Link>
        </div>
      </div>
    </section>
  );
}
