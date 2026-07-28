import Link from 'next/link';
import { Hero } from '@/components/Hero';
import { Reveal } from '@/components/Reveal';
import { Ribbon } from '@/components/Ribbon';
import { VerseScroll } from '@/components/VerseScroll';
import { loadSettings } from '@/lib/content';
import { tenge } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const { settings } = await loadSettings();

  const teasers = [
    { href: '/dauys', title: 'Дауыс беру', note: `${settings.voteEyebrow} · 1 дауыс ${tenge(settings.votePrice)}`, open: true },
    { href: '/joba', title: 'Жоба туралы', note: settings.heroTags.join(' · '), open: true },
    { href: '/format', title: 'Дода форматы', note: 'Іріктеуден суперфиналға дейін', open: true },
    { href: '/bilet', title: 'Билет алу', note: 'Әзірге жабық', open: false },
    { href: '/otinim', title: 'Өтінім тапсыру', note: 'Әзірге жабық', open: false },
  ];

  return (
    <>
      <Hero tagline={settings.heroTagline} tags={settings.heroTags} />
      <Ribbon />
      <VerseScroll />

      <section>
        <Reveal>
          <span className="eyebrow">Бөлімдер</span>
          <h2 className="h2">
            Не <em>істейміз?</em>
          </h2>
          <p className="lead">Керек бөлімді таңдаңыз — әрқайсысы бөлек бетте.</p>
        </Reveal>

        <Reveal>
          <div className="teasers">
            {teasers.map((t) => (
              <Link className={`teaser${t.open ? '' : ' muted'}`} href={t.href} key={t.href}>
                <span>
                  <b>{t.title}</b>
                  <small>{t.note}</small>
                </span>
                <span className="go" aria-hidden="true">
                  {t.open ? '→' : '🔒'}
                </span>
              </Link>
            ))}
          </div>
        </Reveal>
      </section>
    </>
  );
}
