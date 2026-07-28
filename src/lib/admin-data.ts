import { sql } from './db';
import type { TeamRecord } from './content';
import { displayVotes, EMPTY_COUNTS, type TeamCounts } from './votes';

export interface AdminTeamRow {
  id: number;
  slug: string;
  name: string;
  placeLabel: string;
  colorIndex: number;
  kaspiUrl: string;
  isActive: boolean;
  counts: TeamCounts;
  total: number;
}

/** Города с полной разбивкой. Только для админки — наружу это не отдаётся. */
export async function loadAdminTeams(teams: TeamRecord[]): Promise<AdminTeamRow[]> {
  const [claims, adjustments] = await Promise.all([
    sql<Array<{ team_slug: string; status: keyof TeamCounts; total: string }>>`
      select team_slug, status, coalesce(sum(quantity), 0) as total
      from claims where kind = 'vote' and team_slug is not null
      group by team_slug, status
    `,
    sql<Array<{ team_slug: string; total: string }>>`
      select team_slug, coalesce(sum(delta), 0) as total
      from vote_adjustments_v2 group by team_slug
    `,
  ]);

  const bySlug = new Map<string, TeamCounts>();
  const get = (slug: string) => {
    let row = bySlug.get(slug);
    if (!row) {
      row = { ...EMPTY_COUNTS };
      bySlug.set(slug, row);
    }
    return row;
  };

  for (const row of claims) get(row.team_slug)[row.status] = Number(row.total);
  for (const row of adjustments) get(row.team_slug).adjustment = Number(row.total);

  return teams.map((team) => {
    const counts = bySlug.get(team.slug) ?? { ...EMPTY_COUNTS };
    return {
      id: team.id,
      slug: team.slug,
      name: team.name,
      placeLabel: team.placeLabel,
      colorIndex: team.colorIndex,
      kaspiUrl: team.kaspiUrl,
      isActive: team.isActive,
      counts,
      total: displayVotes(counts),
    };
  });
}

export interface ClaimRow {
  id: number;
  teamSlug: string | null;
  quantity: number;
  amount: number;
  payerName: string;
  receipt: string;
  status: string;
  createdAt: string;
}

export async function loadClaims(
  status: 'all' | 'claimed' | 'confirmed' | 'rejected',
  limit = 200,
): Promise<ClaimRow[]> {
  const rows =
    status === 'all'
      ? await sql<Array<Record<string, unknown>>>`
          select id, team_slug, quantity, amount, payer_name, receipt, status, created_at
          from claims order by created_at desc limit ${limit}
        `
      : await sql<Array<Record<string, unknown>>>`
          select id, team_slug, quantity, amount, payer_name, receipt, status, created_at
          from claims where status = ${status} order by created_at desc limit ${limit}
        `;

  return rows.map((r) => ({
    id: Number(r.id),
    teamSlug: (r.team_slug as string | null) ?? null,
    quantity: Number(r.quantity),
    amount: Number(r.amount),
    payerName: String(r.payer_name ?? ''),
    receipt: String(r.receipt ?? ''),
    status: String(r.status),
    createdAt: (r.created_at as Date).toISOString(),
  }));
}

export interface ClaimSummary {
  claimedCount: number;
  claimedSum: number;
  confirmedCount: number;
  confirmedSum: number;
  rejectedCount: number;
  todayCount: number;
  todaySum: number;
}

export async function loadClaimSummary(): Promise<ClaimSummary> {
  const [row] = await sql<Array<Record<string, string>>>`
    select
      count(*) filter (where status = 'claimed')                          as claimed_count,
      coalesce(sum(amount) filter (where status = 'claimed'), 0)          as claimed_sum,
      count(*) filter (where status = 'confirmed')                        as confirmed_count,
      coalesce(sum(amount) filter (where status = 'confirmed'), 0)        as confirmed_sum,
      count(*) filter (where status = 'rejected')                         as rejected_count,
      count(*) filter (where created_at >= date_trunc('day', now()))      as today_count,
      coalesce(sum(amount) filter (where created_at >= date_trunc('day', now())), 0) as today_sum
    from claims
  `;

  return {
    claimedCount: Number(row?.claimed_count ?? 0),
    claimedSum: Number(row?.claimed_sum ?? 0),
    confirmedCount: Number(row?.confirmed_count ?? 0),
    confirmedSum: Number(row?.confirmed_sum ?? 0),
    rejectedCount: Number(row?.rejected_count ?? 0),
    todayCount: Number(row?.today_count ?? 0),
    todaySum: Number(row?.today_sum ?? 0),
  };
}

export async function setClaimStatus(
  id: number,
  status: 'claimed' | 'confirmed' | 'rejected',
): Promise<void> {
  await sql`
    update claims set status = ${status}, reviewed_at = now() where id = ${id}
  `;
}

export interface AdjustmentRow {
  id: number;
  teamSlug: string;
  delta: number;
  createdAt: string;
}

export async function loadAdjustments(limit = 50): Promise<AdjustmentRow[]> {
  const rows = await sql<Array<{ id: number; team_slug: string; delta: number; created_at: Date }>>`
    select id, team_slug, delta, created_at
    from vote_adjustments_v2 order by created_at desc limit ${limit}
  `;

  return rows.map((r) => ({
    id: Number(r.id),
    teamSlug: r.team_slug,
    delta: Number(r.delta),
    createdAt: r.created_at.toISOString(),
  }));
}

/** Правка счётчика. Журнал и есть текущее значение — итог считается суммой строк. */
export async function adjustVotes(teamSlug: string, delta: number): Promise<void> {
  await sql`insert into vote_adjustments_v2 (team_slug, delta) values (${teamSlug}, ${delta})`;
}
