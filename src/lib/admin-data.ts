import { sql } from './db';
import { displayVotes } from './votes';

export interface PaymentStat {
  kind: string;
  status: string;
  count: number;
  sum: number;
}

export interface AdminTeamRow {
  id: number;
  name: string;
  placeLabel: string;
  colorIndex: number;
  paidVotes: number;
  adminAdjustment: number;
  total: number;
  payments: number;
}

export interface AdminPaymentRow {
  id: string;
  kind: string;
  status: string;
  amount: number;
  phone: string;
  createdAt: string;
  paidAt: string | null;
  label: string;
}

export interface AdjustmentRow {
  id: number;
  teamName: string;
  delta: number;
  createdAt: string;
}

export interface AdminApplicationRow {
  id: number;
  name: string;
  birthYear: number;
  region: string;
  resume: string;
  phone: string;
  createdAt: string;
}

export interface AdminSummary {
  totals: {
    paidCount: number;
    paidSum: number;
    todayPaidCount: number;
    todayPaidSum: number;
    pendingCount: number;
    mismatchCount: number;
  };
  byKind: Array<{ kind: string; paidCount: number; paidSum: number; startedCount: number }>;
}

export async function loadSummary(): Promise<AdminSummary> {
  const [totals] = await sql<
    Array<{
      paid_count: string;
      paid_sum: string;
      today_paid_count: string;
      today_paid_sum: string;
      pending_count: string;
      mismatch_count: string;
    }>
  >`
    select
      count(*) filter (where status = 'paid')                                    as paid_count,
      coalesce(sum(expected_amount) filter (where status = 'paid'), 0)           as paid_sum,
      count(*) filter (where status = 'paid' and paid_at >= date_trunc('day', now())) as today_paid_count,
      coalesce(sum(expected_amount) filter (where status = 'paid' and paid_at >= date_trunc('day', now())), 0) as today_paid_sum,
      count(*) filter (where status = 'pending')                                 as pending_count,
      count(*) filter (where status = 'amount_mismatch')                          as mismatch_count
    from payments
  `;

  const byKind = await sql<
    Array<{ kind: string; paid_count: string; paid_sum: string; started_count: string }>
  >`
    select kind,
           count(*) filter (where status = 'paid')                          as paid_count,
           coalesce(sum(expected_amount) filter (where status = 'paid'), 0) as paid_sum,
           count(*)                                                         as started_count
    from payments
    group by kind
    order by kind
  `;

  return {
    totals: {
      paidCount: Number(totals?.paid_count ?? 0),
      paidSum: Number(totals?.paid_sum ?? 0),
      todayPaidCount: Number(totals?.today_paid_count ?? 0),
      todayPaidSum: Number(totals?.today_paid_sum ?? 0),
      pendingCount: Number(totals?.pending_count ?? 0),
      mismatchCount: Number(totals?.mismatch_count ?? 0),
    },
    byKind: byKind.map((r) => ({
      kind: r.kind,
      paidCount: Number(r.paid_count),
      paidSum: Number(r.paid_sum),
      startedCount: Number(r.started_count),
    })),
  };
}

/** Команды с разбивкой. Только для админки — наружу эти числа не отдаются. */
export async function loadAdminTeams(): Promise<AdminTeamRow[]> {
  const rows = await sql<
    Array<{
      id: number;
      name: string;
      place_label: string;
      color_index: number;
      admin_adjustment: number;
      paid_votes: string;
      payments: string;
    }>
  >`
    select t.id, t.name, t.place_label, t.color_index, t.admin_adjustment,
           coalesce(sum(v.quantity), 0) as paid_votes,
           count(v.id)                  as payments
    from teams t
    left join votes v on v.team_id = t.id
    where t.is_active
    group by t.id
    order by t.display_order, t.id
  `;

  return rows.map((r) => {
    const paidVotes = Number(r.paid_votes);
    const adminAdjustment = Number(r.admin_adjustment);
    return {
      id: r.id,
      name: r.name,
      placeLabel: r.place_label,
      colorIndex: r.color_index,
      paidVotes,
      adminAdjustment,
      total: displayVotes(paidVotes, adminAdjustment),
      payments: Number(r.payments),
    };
  });
}

export async function loadRecentPayments(limit = 40): Promise<AdminPaymentRow[]> {
  const rows = await sql<
    Array<{
      id: string;
      kind: string;
      status: string;
      expected_amount: number;
      phone: string;
      created_at: Date;
      paid_at: Date | null;
      meta: Record<string, unknown>;
      team_name: string | null;
    }>
  >`
    select p.id, p.kind, p.status, p.expected_amount, p.phone, p.created_at, p.paid_at, p.meta,
           t.name as team_name
    from payments p
    left join votes v on v.payment_id = p.id
    left join teams t on t.id = v.team_id
    order by p.created_at desc
    limit ${limit}
  `;

  return rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    status: r.status,
    amount: Number(r.expected_amount),
    phone: r.phone,
    createdAt: r.created_at.toISOString(),
    paidAt: r.paid_at ? r.paid_at.toISOString() : null,
    label: labelFor(r.kind, r.meta, r.team_name),
  }));
}

export interface WebhookEventRow {
  id: number;
  event: string | null;
  invoiceStatus: string | null;
  signatureValid: boolean;
  outcome: string | null;
  receivedAt: string;
}

/**
 * Последние входящие webhook'и. Нужны при настройке: сразу видно, доходят ли
 * уведомления вообще и сходится ли подпись.
 */
export async function loadWebhookEvents(limit = 20): Promise<WebhookEventRow[]> {
  const rows = await sql<
    Array<{
      id: number;
      event: string | null;
      invoice_status: string | null;
      signature_valid: boolean;
      outcome: string | null;
      received_at: Date;
    }>
  >`
    select id, event, invoice_status, signature_valid, outcome, received_at
    from webhook_events
    order by received_at desc
    limit ${limit}
  `;

  return rows.map((r) => ({
    id: r.id,
    event: r.event,
    invoiceStatus: r.invoice_status,
    signatureValid: r.signature_valid,
    outcome: r.outcome,
    receivedAt: r.received_at.toISOString(),
  }));
}

export async function loadAdjustments(limit = 60): Promise<AdjustmentRow[]> {
  const rows = await sql<Array<{ id: number; delta: number; created_at: Date; name: string }>>`
    select a.id, a.delta, a.created_at, t.name
    from vote_adjustments a
    join teams t on t.id = a.team_id
    order by a.created_at desc
    limit ${limit}
  `;

  return rows.map((r) => ({
    id: r.id,
    teamName: r.name,
    delta: Number(r.delta),
    createdAt: r.created_at.toISOString(),
  }));
}

export async function loadApplications(limit = 100): Promise<AdminApplicationRow[]> {
  const rows = await sql<
    Array<{
      id: number;
      name: string;
      birth_year: number;
      region: string;
      resume: string;
      created_at: Date;
      phone: string;
    }>
  >`
    select a.id, a.name, a.birth_year, a.region, a.resume, a.created_at, p.phone
    from applications a
    join payments p on p.id = a.payment_id
    order by a.created_at desc
    limit ${limit}
  `;

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    birthYear: r.birth_year,
    region: r.region,
    resume: r.resume,
    phone: r.phone,
    createdAt: r.created_at.toISOString(),
  }));
}

/**
 * Ручная корректировка голосов. Пишет и новое значение, и строку в журнал —
 * одной транзакцией, чтобы правка без записи в журнал была невозможна.
 */
export async function adjustTeamVotes(teamId: number, delta: number): Promise<AdminTeamRow | null> {
  await sql.begin(async (tx) => {
    await tx`update teams set admin_adjustment = admin_adjustment + ${delta} where id = ${teamId}`;
    await tx`insert into vote_adjustments (team_id, delta) values (${teamId}, ${delta})`;
  });

  const teams = await loadAdminTeams();
  return teams.find((t) => t.id === teamId) ?? null;
}

function labelFor(kind: string, meta: Record<string, unknown>, teamName: string | null): string {
  if (kind === 'vote') {
    const qty = meta.quantity ?? '?';
    return `${teamName ?? 'команда'} · ${qty} дауыс`;
  }
  if (kind === 'ticket') {
    return `${String(meta.showSlug ?? '')} · ${String(meta.qty ?? '')} билет`;
  }
  if (kind === 'application') {
    return String(meta.name ?? 'өтінім');
  }
  return kind;
}
