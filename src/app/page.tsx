import Link from 'next/link';
import { Books } from '@/components/Books';
import { FirstDuel } from '@/components/FirstDuel';
import { Hero } from '@/components/Hero';
import { Poets } from '@/components/Poets';
import { Quill } from '@/components/Quill';
import { Reveal } from '@/components/Reveal';
import { loadBooks, loadPoets } from '@/lib/catalog';
import { loadSettings, loadTeams } from '@/lib/content';
import { loadDuels } from '@/lib/duels';
import { tenge } from '@/lib/format';

export const dynamic = 'force-dynamic';

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
          <div className="tiles">
            {TILES.map((tile) => (
              <Link className="tile" href={tile.href} key={tile.href}>
                <b>{tile.title}</b>
                <small>{tile.note}</small>
                <Quill className="tile-icon" />
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
