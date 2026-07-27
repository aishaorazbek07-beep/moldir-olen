import Link from 'next/link';
import { Hero } from '@/components/Hero';
import { Reveal } from '@/components/Reveal';
import { Ribbon } from '@/components/Ribbon';
import { VerseScroll } from '@/components/VerseScroll';
import { VOTE_PRICE } from '@/lib/config';
import { tenge } from '@/lib/format';

const TEASERS = [
  { href: '/joba', title: 'Жоба туралы', note: '20 өңір · 60 ақын · 3 000 000 ₸ бас жүлде' },
  { href: '/dauys', title: 'Дауыс беру', note: `Суперфинал · 1 дауыс ${tenge(VOTE_PRICE)}` },
  { href: '/bilet', title: 'Билет алу', note: 'Поэзия кештеріне билет' },
  { href: '/otinim', title: 'Өтінім тапсыру', note: '2-маусымға қатысуға өтінім' },
  { href: '/format', title: 'Дода форматы', note: 'Іріктеуден суперфиналға дейін' },
];

export default function HomePage() {
  return (
    <>
      <Hero />
      <Ribbon />
      <VerseScroll />

      <section>
        <Reveal>
          <span className="eyebrow">Бөлімдер</span>
          <h2 className="h2">
            Не <em>істейміз?</em>
          </h2>
          <p className="lead">Керек бөлімді таңдаңыз - әрқайсысы бөлек бетте.</p>
        </Reveal>

        <Reveal>
          <div className="teasers">
            {TEASERS.map((t) => (
              <Link className="teaser" href={t.href} key={t.href}>
                <span>
                  <b>{t.title}</b>
                  <small>{t.note}</small>
                </span>
                <span className="go" aria-hidden="true">
                  →
                </span>
              </Link>
            ))}
          </div>
        </Reveal>
      </section>
    </>
  );
}
