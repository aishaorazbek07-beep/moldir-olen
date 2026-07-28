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
  receipt: string;
  ip: string | null;
}

export async function insertClaim(claim: NewClaim): Promise<number> {
  const rows = await sql<Array<{ id: number }>>`
    insert into claims (kind, team_slug, quantity, amount, payer_name, receipt, ip)
    values ('vote', ${claim.teamSlug}, ${claim.quantity}, ${claim.amount},
            ${claim.payerName}, ${claim.receipt}, ${claim.ip})
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
 * Не подавали ли уже этот номер чека.
 *
 * Один чек — один платёж. Повтор означает либо ошибку, либо попытку засчитать
 * одну оплату дважды; и то и другое должен увидеть человек, а не счётчик.
 */
export async function receiptAlreadyUsed(receipt: string): Promise<boolean> {
  const clean = receipt.trim();
  if (!clean) return false;

  const rows = await sql`select 1 from claims where receipt = ${clean} limit 1`;
  return rows.length > 0;
}
