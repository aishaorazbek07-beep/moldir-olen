import Link from 'next/link';
import { Books } from '@/components/Books';
import { FirstDuel } from '@/components/FirstDuel';
import { Hero } from '@/components/Hero';
import { Poets } from '@/components/Poets';
import { Reveal } from '@/components/Reveal';
import { loadBooks, loadPoets } from '@/lib/catalog';
import { loadSettings, loadTeams } from '@/lib/content';
import { loadDuels } from '@/lib/duels';
import { tenge } from '@/lib/format';

export const dynamic = 'force-dynamic';

/** Нумерация здесь оправдана: это настоящая последовательность этапов доды. */
const STEPS = [
  { title: 'Онлайн іріктеу', text: 'Өтінім тапсырған ақындар арасынан үздіктер таңдалады.' },
  { title: 'Дуэль кештері', text: 'Әр кеште екі өңірдің ақындары сахнада бақ сынасады.' },
  { title: 'Халық дауысы', text: 'Жеңімпазды көрермен дауысы шешеді — әр дауыс саналады.' },
  { title: 'Суперфинал', text: 'Үздік екі қала бас жүлде үшін кездеседі.' },
];

const TILES = [
  { href: '/dauys', title: 'Дауыс беру', note: 'Ұнаған қалаңызға дауыс беріңіз', open: true },
  { href: '/duels', title: 'Келесі дуэльдер', note: 'Дуэльдер кестесімен танысыңыз', open: true },
  { href: '/akyndar', title: 'Ақындар туралы', note: 'Ақындармен танысыңыз', open: true },
  { href: '/kitap', title: 'Кітап алу', note: 'Ақындардың жинақтары', open: true },
];

export default async function HomePage() {
  const [{ settings }, { teams }, { duels }, poets, books] = await Promise.all([
    loadSettings(),
    loadTeams(),
    loadDuels(),
    loadPoets(),
    loadBooks(),
  ]);

  const first = duels[0] ?? null;
  const photoFor = (name: string) =>
    teams.find((t) => t.name === name || name.includes(t.name))?.imageUrl ?? '';

  return (
    <>
      <Hero
        tagline={settings.heroTagline}
        tags={settings.heroTags}
        verse={settings.heroVerse}
      />

      <section>
        {first ? (
          <FirstDuel
            duel={first}
            label={settings.firstDuelLabel}
            photoA={photoFor(first.teamA)}
            photoB={photoFor(first.teamB)}
          />
        ) : null}

        <Reveal>
          <div className="rows">
            {TILES.map((tile) => (
              <Link className="row-link" href={tile.href} key={tile.href}>
                <span className="txt">
                  <b>{tile.title}</b>
                  <small>{tile.note}</small>
                </span>
                <span className="go" aria-hidden="true">
                  →
                </span>
              </Link>
            ))}
          </div>
        </Reveal>
      </section>

      <section>
        <Reveal>
          <div className="sec-head">
            <span className="eyebrow">Жоба туралы</span>
            <h2 className="h2">{settings.aboutTitle}</h2>
          </div>
          <div className="about-card">
            <p>{settings.aboutText}</p>
          </div>
          <div className="stats">
            {settings.heroTags.map((tag) => {
              const space = tag.lastIndexOf(' ');
              return (
                <div className="stat" key={tag}>
                  <b>{space > 0 ? tag.slice(0, space) : tag}</b>
                  <span>{space > 0 ? tag.slice(space + 1) : ''}</span>
                </div>
              );
            })}
            <div className="stat">
              <b>{tenge(settings.votePrice)}</b>
              <span>бір дауыс</span>
            </div>
          </div>
        </Reveal>
      </section>

      <section>
        <Reveal>
          <div className="sec-head">
            <span className="eyebrow">Формат</span>
            <h2 className="h2">Дода қалай өтеді</h2>
          </div>
          <div className="steps">
            {STEPS.map((step, i) => (
              <div className="step" key={step.title}>
                <span className="dot">{String(i + 1).padStart(2, '0')}</span>
                <div>
                  <b>{step.title}</b>
                  <p>{step.text}</p>
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {poets.length > 0 ? (
        <section>
          <Poets poets={poets.slice(0, 4)} title={settings.poetsTitle} lead={settings.poetsLead} />
          {poets.length > 4 ? (
            <Reveal>
              <div className="more-row">
                <Link className="btn btn-glass" href="/akyndar">
                  Барлық ақындар
                </Link>
              </div>
            </Reveal>
          ) : null}
        </section>
      ) : null}

      {books.length > 0 ? (
        <section>
          <Books books={books.slice(0, 4)} title={settings.booksTitle} lead={settings.booksLead} />
        </section>
      ) : null}
    </>
  );
}
