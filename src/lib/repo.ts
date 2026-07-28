import { sql } from './db';
import { EMPTY_COUNTS, type TeamCounts } from './votes';

export type ClaimStatus = 'claimed' | 'confirmed' | 'rejected';

/**
 * Счётчики по городам.
 *
 * При недоступной базе отдаём пустую карту вместо исключения: страница
 * голосования должна открыться и позволить заплатить даже тогда. В прямом эфире
 * неработающая кнопка оплаты хуже, чем нули в счётчике.
 */
export async function loadCounts(): Promise<{ counts: Map<string, TeamCounts>; ok: boolean }> {
  try {
    const [claims, adjustments] = await Promise.all([
      sql<Array<{ team_slug: string; status: ClaimStatus; total: string }>>`
        select team_slug, status, coalesce(sum(quantity), 0) as total
        from claims
        where kind = 'vote' and team_slug is not null
        group by team_slug, status
      `,
      sql<Array<{ team_slug: string; total: string }>>`
        select team_slug, coalesce(sum(delta), 0) as total
        from vote_adjustments_v2
        group by team_slug
      `,
    ]);

    const counts = new Map<string, TeamCounts>();
    const get = (slug: string): TeamCounts => {
      let row = counts.get(slug);
      if (!row) {
        row = { ...EMPTY_COUNTS };
        counts.set(slug, row);
      }
      return row;
    };

    for (const row of claims) get(row.team_slug)[row.status] = Number(row.total);
    for (const row of adjustments) get(row.team_slug).adjustment = Number(row.total);

    return { counts, ok: true };
  } catch {
    return { counts: new Map(), ok: false };
  }
}

export interface NewClaim {
  teamSlug: string;
  quantity: number;
  amount: number;
  payerName: string;
  phone: string;
  ip: string | null;
}

export async function insertClaim(claim: NewClaim): Promise<number> {
  const rows = await sql<Array<{ id: number }>>`
    insert into claims (kind, team_slug, quantity, amount, payer_name, phone, ip)
    values ('vote', ${claim.teamSlug}, ${claim.quantity}, ${claim.amount},
            ${claim.payerName}, ${claim.phone}, ${claim.ip})
    returning id
  `;
  return rows[0].id;
}

/** Сколько заявок пришло с этого адреса за окно — барьер против накрутки скриптом. */
export async function countRecentClaims(ip: string | null, windowMinutes: number): Promise<number> {
  if (!ip) return 0;

  const rows = await sql<Array<{ total: string }>>`
    select count(*) as total from claims
    where ip = ${ip} and created_at > now() - (${windowMinutes} || ' minutes')::interval
  `;
  return Number(rows[0]?.total ?? 0);
}

/**
 * Не отправлена ли ровно такая же заявка только что.
 *
 * С одного номера можно голосовать много раз — это нормально. А вот та же
 * сумма с того же номера в течение минуты почти всегда означает двойное
 * нажатие или обновление страницы, а не второй платёж.
 */
export async function isDuplicateSubmit(phone: string, amount: number): Promise<boolean> {
  const rows = await sql`
    select 1 from claims
    where phone = ${phone} and amount = ${amount}
      and created_at > now() - interval '60 seconds'
    limit 1
  `;
  return rows.length > 0;
}
