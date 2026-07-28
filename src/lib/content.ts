import { sql } from './db';
import { FALLBACK_SETTINGS, FALLBACK_TEAMS } from './fallback';

export interface TeamRecord {
  id: number;
  slug: string;
  name: string;
  placeLabel: string;
  colorIndex: number;
  kaspiUrl: string;
  displayOrder: number;
  isActive: boolean;
  imageUrl: string;
}

export interface SiteSettings {
  votePrice: number;
  whatsappNumber: string;
  voteEyebrow: string;
  voteTitle: string;
  voteLead: string;
  voteNote: string;
  heroTagline: string;
  heroTags: string[];
  ticketsOpen: boolean;
  applicationsOpen: boolean;
  closedNotice: string;
  venue: string;
  authorName: string;
  authorHandle: string;
  contactPhone: string;
  instagramUrl: string;
  tiktokUrl: string;
  youtubeUrl: string;
  duelsTitle: string;
  poetsTitle: string;
  poetsLead: string;
  booksTitle: string;
  booksLead: string;
  aboutTitle: string;
  aboutText: string;
  heroVerse: string;
  footerVerse: string;
  firstDuelLabel: string;
}

/** Ключи настроек, как они лежат в базе. */
export const SETTING_KEYS = [
  'vote_price',
  'whatsapp_number',
  'vote_eyebrow',
  'vote_title',
  'vote_lead',
  'vote_note',
  'hero_tagline',
  'hero_tag_1',
  'hero_tag_2',
  'hero_tag_3',
  'tickets_open',
  'applications_open',
  'closed_notice',
  'venue',
  'author_name',
  'author_handle',
  'contact_phone',
  'instagram_url',
  'tiktok_url',
  'youtube_url',
  'duels_title',
  'poets_title',
  'poets_lead',
  'books_title',
  'books_lead',
  'about_title',
  'about_text',
  'hero_verse',
  'footer_verse',
  'first_duel_label',
] as const;

export type SettingKey = (typeof SETTING_KEYS)[number];

/**
 * Города для показа. При недоступной базе отдаём слепок из кода: страница
 * голосования и оплата обязаны работать, даже когда база лежит.
 */
export async function loadTeams(includeHidden = false): Promise<{ teams: TeamRecord[]; ok: boolean }> {
  try {
    // Два отдельных запроса вместо условной вставки фрагмента.
    // Пустой `sql``` postgres.js выполняет как самостоятельный запрос, который
    // никогда не завершается и навсегда занимает соединение из пула: после
    // нескольких открытий страницы сайт замирает целиком.
    type Row = {
      id: number;
      slug: string;
      name: string;
      place_label: string;
      color_index: number;
      kaspi_url: string;
      display_order: number;
      is_active: boolean;
      image_url: string;
    };

    const rows = includeHidden
      ? await sql<Row[]>`
          select id, slug, name, place_label, color_index, kaspi_url, display_order, is_active, image_url
          from teams order by display_order, id
        `
      : await sql<Row[]>`
          select id, slug, name, place_label, color_index, kaspi_url, display_order, is_active, image_url
          from teams where is_active order by display_order, id
        `;

    return {
      teams: rows.map((r) => ({
        id: r.id,
        slug: r.slug,
        name: r.name,
        placeLabel: r.place_label,
        colorIndex: r.color_index,
        kaspiUrl: r.kaspi_url,
        displayOrder: r.display_order,
        isActive: r.is_active,
        imageUrl: r.image_url ?? '',
      })),
      ok: true,
    };
  } catch {
    return { teams: FALLBACK_TEAMS, ok: false };
  }
}

export async function loadSettings(): Promise<{ settings: SiteSettings; ok: boolean }> {
  try {
    const rows = await sql<Array<{ key: string; value: string }>>`select key, value from settings`;
    const map = new Map(rows.map((r) => [r.key, r.value]));

    // В SQL перевод строки записан двумя символами \\n — в тексте он должен
    // быть настоящим переносом, иначе на странице печатается `\\n`.
    // В настройках перенос строки хранится двумя символами: обратная косая
    // и n. Иначе в поле админки его не наберёшь. Здесь превращаем в настоящий.
    const str = (key: SettingKey, dflt: string) =>
      (map.get(key)?.trim() || dflt).replace(/\\n/g, '\n');
    const bool = (key: SettingKey, dflt: boolean) => {
      const raw = map.get(key)?.trim().toLowerCase();
      if (raw === 'true') return true;
      if (raw === 'false') return false;
      return dflt;
    };

    const price = Number(map.get('vote_price'));

    return {
      settings: {
        votePrice: Number.isFinite(price) && price > 0 ? Math.floor(price) : FALLBACK_SETTINGS.votePrice,
        whatsappNumber: (map.get('whatsapp_number') ?? '').replace(/\D/g, ''),
        voteEyebrow: str('vote_eyebrow', FALLBACK_SETTINGS.voteEyebrow),
        voteTitle: str('vote_title', FALLBACK_SETTINGS.voteTitle),
        voteLead: str('vote_lead', FALLBACK_SETTINGS.voteLead),
        voteNote: str('vote_note', FALLBACK_SETTINGS.voteNote),
        heroTagline: str('hero_tagline', FALLBACK_SETTINGS.heroTagline),
        heroTags: [
          str('hero_tag_1', FALLBACK_SETTINGS.heroTags[0]),
          str('hero_tag_2', FALLBACK_SETTINGS.heroTags[1]),
          str('hero_tag_3', FALLBACK_SETTINGS.heroTags[2]),
        ].filter(Boolean),
        ticketsOpen: bool('tickets_open', FALLBACK_SETTINGS.ticketsOpen),
        applicationsOpen: bool('applications_open', FALLBACK_SETTINGS.applicationsOpen),
        closedNotice: str('closed_notice', FALLBACK_SETTINGS.closedNotice),
        venue: str('venue', FALLBACK_SETTINGS.venue),
        authorName: str('author_name', FALLBACK_SETTINGS.authorName),
        authorHandle: str('author_handle', FALLBACK_SETTINGS.authorHandle),
        contactPhone: str('contact_phone', FALLBACK_SETTINGS.contactPhone),
        instagramUrl: str('instagram_url', FALLBACK_SETTINGS.instagramUrl),
        tiktokUrl: str('tiktok_url', FALLBACK_SETTINGS.tiktokUrl),
        youtubeUrl: str('youtube_url', FALLBACK_SETTINGS.youtubeUrl),
duelsTitle: str('duels_title', FALLBACK_SETTINGS.duelsTitle),
        poetsTitle: str('poets_title', FALLBACK_SETTINGS.poetsTitle),
        poetsLead: str('poets_lead', FALLBACK_SETTINGS.poetsLead),
        booksTitle: str('books_title', FALLBACK_SETTINGS.booksTitle),
        booksLead: str('books_lead', FALLBACK_SETTINGS.booksLead),
        aboutTitle: str('about_title', FALLBACK_SETTINGS.aboutTitle),
        aboutText: str('about_text', FALLBACK_SETTINGS.aboutText),
        heroVerse: str('hero_verse', FALLBACK_SETTINGS.heroVerse),
        footerVerse: str('footer_verse', FALLBACK_SETTINGS.footerVerse),
        firstDuelLabel: str('first_duel_label', FALLBACK_SETTINGS.firstDuelLabel),
      },
      ok: true,
    };
  } catch {
    return { settings: FALLBACK_SETTINGS, ok: false };
  }
}

export function whatsappBase(settings: SiteSettings): string {
  return settings.whatsappNumber ? `https://wa.me/${settings.whatsappNumber}` : '';
}

// ---------------------------------------------------------------------------
//  Правки из админки
// ---------------------------------------------------------------------------

export async function saveSettings(values: Partial<Record<SettingKey, string>>): Promise<void> {
  const entries = Object.entries(values).filter(([key]) =>
    (SETTING_KEYS as readonly string[]).includes(key),
  );
  if (entries.length === 0) return;

  await sql.begin(async (tx) => {
    for (const [key, value] of entries) {
      await tx`
        insert into settings (key, value, updated_at)
        values (${key}, ${value ?? ''}, now())
        on conflict (key) do update set value = excluded.value, updated_at = now()
      `;
    }
  });
}

export interface TeamInput {
  name: string;
  placeLabel: string;
  colorIndex: number;
  kaspiUrl: string;
  isActive: boolean;
}

export async function createTeam(input: TeamInput & { slug: string }): Promise<void> {
  await sql`
    insert into teams (slug, name, place_label, color_index, kaspi_url, display_order, is_active)
    values (
      ${input.slug}, ${input.name}, ${input.placeLabel}, ${input.colorIndex}, ${input.kaspiUrl},
      coalesce((select max(display_order) + 1 from teams), 1), ${input.isActive}
    )
  `;
}

export async function updateTeam(id: number, input: TeamInput): Promise<void> {
  await sql`
    update teams
    set name = ${input.name}, place_label = ${input.placeLabel},
        color_index = ${input.colorIndex}, kaspi_url = ${input.kaspiUrl},
        is_active = ${input.isActive}
    where id = ${id}
  `;
}

/**
 * Город убирается из показа, но строка остаётся.
 *
 * Полное удаление оборвало бы связь с уже поданными заявками: в claims лежит
 * team_slug, и по нему потом сверяют платежи. Скрытый город просто не выводится.
 */
export async function hideTeam(id: number): Promise<void> {
  await sql`update teams set is_active = false where id = ${id}`;
}

export async function moveTeam(id: number, direction: 'up' | 'down'): Promise<void> {
  await sql.begin(async (tx) => {
    const rows = await tx<Array<{ id: number; display_order: number }>>`
      select id, display_order from teams order by display_order, id
    `;
    const index = rows.findIndex((r) => r.id === id);
    const swapWith = direction === 'up' ? index - 1 : index + 1;
    if (index < 0 || swapWith < 0 || swapWith >= rows.length) return;

    // Порядок переписываем целиком: так он остаётся плотным даже после
    // ручных правок в базе и повторных перестановок.
    const reordered = [...rows];
    [reordered[index], reordered[swapWith]] = [reordered[swapWith], reordered[index]];

    for (let i = 0; i < reordered.length; i += 1) {
      await tx`update teams set display_order = ${i + 1} where id = ${reordered[i].id}`;
    }
  });
}

/** Слаг выводится из названия; кириллица и казахские буквы переводятся в латиницу. */
export function slugify(name: string): string {
  const map: Record<string, string> = {
    а: 'a', ә: 'a', б: 'b', в: 'v', г: 'g', ғ: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh',
    з: 'z', и: 'i', й: 'y', к: 'k', қ: 'q', л: 'l', м: 'm', н: 'n', ң: 'n', о: 'o',
    ө: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ұ: 'u', ү: 'u', ф: 'f', х: 'h',
    һ: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', і: 'i', ь: '', э: 'e',
    ю: 'yu', я: 'ya',
  };

  const base = [...name.toLowerCase()]
    .map((ch) => map[ch] ?? ch)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return base || `team-${Date.now()}`;
}
