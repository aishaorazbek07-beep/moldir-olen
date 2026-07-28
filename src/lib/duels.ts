import { sql } from './db';

export interface Duel {
  id: number;
  startsAt: string;
  teamA: string;
  teamB: string;
  price: number;
  ticketUrl: string;
  venue: string;
  hasPoster: boolean;
  isActive: boolean;
  displayOrder: number;
}

/**
 * Афиши хранятся в самой таблице (base64), но в список они НЕ выбираются:
 * иначе каждый показ страницы тянул бы сотни килобайт картинок, которые
 * браузер и так запросит отдельно и закэширует.
 */
export async function loadDuels(includeHidden = false): Promise<{ duels: Duel[]; ok: boolean }> {
  try {
    type Row = {
      id: number;
      starts_at: Date;
      team_a: string;
      team_b: string;
      price: number;
      ticket_url: string;
      venue: string;
      has_poster: boolean;
      is_active: boolean;
      display_order: number;
    };

    const rows = includeHidden
      ? await sql<Row[]>`
          select id, starts_at, team_a, team_b, price, ticket_url, venue,
                 (poster_data <> '') as has_poster, is_active, display_order
          from duels order by display_order, starts_at
        `
      : await sql<Row[]>`
          select id, starts_at, team_a, team_b, price, ticket_url, venue,
                 (poster_data <> '') as has_poster, is_active, display_order
          from duels where is_active order by display_order, starts_at
        `;

    return {
      duels: rows.map((r) => ({
        id: r.id,
        startsAt: r.starts_at.toISOString(),
        teamA: r.team_a,
        teamB: r.team_b,
        price: Number(r.price),
        ticketUrl: r.ticket_url,
        venue: r.venue ?? '',
        hasPoster: r.has_poster,
        isActive: r.is_active,
        displayOrder: r.display_order,
      })),
      ok: true,
    };
  } catch {
    return { duels: [], ok: false };
  }
}

export async function loadPoster(id: number): Promise<{ mime: string; data: Buffer } | null> {
  const rows = await sql<Array<{ poster_mime: string; poster_data: string }>>`
    select poster_mime, poster_data from duels where id = ${id} limit 1
  `;

  const row = rows[0];
  if (!row?.poster_data) return null;

  return { mime: row.poster_mime || 'image/jpeg', data: Buffer.from(row.poster_data, 'base64') };
}

export interface DuelInput {
  startsAt: string;
  teamA: string;
  teamB: string;
  price: number;
  ticketUrl: string;
  isActive: boolean;
}

export async function createDuel(input: DuelInput): Promise<number> {
  const rows = await sql<Array<{ id: number }>>`
    insert into duels (starts_at, team_a, team_b, price, ticket_url, is_active, display_order)
    values (${input.startsAt}, ${input.teamA}, ${input.teamB}, ${input.price},
            ${input.ticketUrl}, ${input.isActive},
            coalesce((select max(display_order) + 1 from duels), 1))
    returning id
  `;
  return rows[0].id;
}

export async function updateDuel(id: number, input: DuelInput): Promise<void> {
  await sql`
    update duels
    set starts_at = ${input.startsAt}, team_a = ${input.teamA}, team_b = ${input.teamB},
        price = ${input.price}, ticket_url = ${input.ticketUrl}, is_active = ${input.isActive}
    where id = ${id}
  `;
}

export async function deleteDuel(id: number): Promise<void> {
  await sql`delete from duels where id = ${id}`;
}

export async function savePoster(id: number, mime: string, base64: string): Promise<void> {
  await sql`update duels set poster_mime = ${mime}, poster_data = ${base64} where id = ${id}`;
}

export async function clearPoster(id: number): Promise<void> {
  await sql`update duels set poster_mime = '', poster_data = '' where id = ${id}`;
}
