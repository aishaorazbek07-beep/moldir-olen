import { sql } from './db';
import type {
  ApplicationData,
  PaymentKind,
  PaymentRecord,
  PaymentRepo,
  PaymentStatus,
} from './payments-core';
import type { TeamRow } from './votes';

/** Реализация PaymentRepo поверх Postgres. Вся идемпотентность — на UNIQUE-ограничениях. */
export const paymentRepo: PaymentRepo = {
  async findByExternalOrderId(externalOrderId: string): Promise<PaymentRecord | null> {
    const rows = await sql<
      Array<{
        id: string;
        external_order_id: string;
        kind: PaymentKind;
        expected_amount: number;
        status: PaymentStatus;
        meta: Record<string, unknown>;
      }>
    >`
      select id, external_order_id, kind, expected_amount, status, meta
      from payments
      where external_order_id = ${externalOrderId}
      limit 1
    `;

    const row = rows[0];
    if (!row) return null;

    return {
      id: row.id,
      externalOrderId: row.external_order_id,
      kind: row.kind,
      expectedAmount: Number(row.expected_amount),
      status: row.status,
      meta: row.meta ?? {},
    };
  },

  async markPaid(paymentId, apipayInvoiceId, paidAt) {
    await sql`
      update payments
      set status = 'paid',
          paid_at = coalesce(paid_at, ${paidAt ? new Date(paidAt) : new Date()}),
          apipay_invoice_id = coalesce(${apipayInvoiceId ?? null}, apipay_invoice_id)
      where id = ${paymentId}
    `;
  },

  async markStatus(paymentId, status) {
    await sql`update payments set status = ${status} where id = ${paymentId}`;
  },

  async grantVote(paymentId, teamId, quantity) {
    const rows = await sql`
      insert into votes (payment_id, team_id, quantity)
      values (${paymentId}, ${teamId}, ${quantity})
      on conflict (payment_id) do nothing
      returning id
    `;
    return rows.length > 0;
  },

  async grantTicket(paymentId, showSlug, qty, ticketNumber) {
    const rows = await sql`
      insert into tickets (payment_id, show_slug, qty, ticket_number)
      values (${paymentId}, ${showSlug}, ${qty}, ${ticketNumber})
      on conflict (payment_id) do nothing
      returning id
    `;
    return rows.length > 0;
  },

  async grantApplication(paymentId, data: ApplicationData) {
    const rows = await sql`
      insert into applications (payment_id, name, birth_year, region, resume)
      values (${paymentId}, ${data.name}, ${data.birthYear}, ${data.region}, ${data.resume})
      on conflict (payment_id) do nothing
      returning id
    `;
    return rows.length > 0;
  },
};

/** Команды с оплаченными голосами и корректировкой — для внутреннего использования. */
export async function loadTeamRows(): Promise<TeamRow[]> {
  const rows = await sql<
    Array<{
      id: number;
      slug: string;
      name: string;
      place_label: string;
      color_index: number;
      admin_adjustment: number;
      paid_votes: string | number;
    }>
  >`
    select t.id, t.slug, t.name, t.place_label, t.color_index, t.admin_adjustment,
           coalesce(sum(v.quantity), 0) as paid_votes
    from teams t
    left join votes v on v.team_id = t.id
    where t.is_active
    group by t.id
    order by t.display_order, t.id
  `;

  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    placeLabel: r.place_label,
    colorIndex: r.color_index,
    adminAdjustment: Number(r.admin_adjustment),
    paidVotes: Number(r.paid_votes),
  }));
}

export async function teamExists(teamId: number): Promise<boolean> {
  const rows = await sql`select 1 from teams where id = ${teamId} and is_active limit 1`;
  return rows.length > 0;
}

export interface CreatePaymentInput {
  externalOrderId: string;
  kind: PaymentKind;
  expectedAmount: number;
  phone: string;
  meta: Record<string, unknown>;
  ip: string | null;
}

export async function createPaymentRow(input: CreatePaymentInput): Promise<string> {
  const rows = await sql<Array<{ id: string }>>`
    insert into payments (external_order_id, kind, expected_amount, phone, meta, ip)
    values (${input.externalOrderId}, ${input.kind}, ${input.expectedAmount},
            ${input.phone}, ${sql.json(input.meta as never)}, ${input.ip})
    returning id
  `;
  return rows[0].id;
}

export async function attachInvoiceId(paymentId: string, invoiceId: string): Promise<void> {
  await sql`update payments set apipay_invoice_id = ${invoiceId} where id = ${paymentId}`;
}

export interface PaymentPublicStatus {
  id: string;
  externalOrderId: string;
  kind: PaymentKind;
  status: PaymentStatus;
  expectedAmount: number;
  apipayInvoiceId: string | null;
  meta: Record<string, unknown>;
}

export async function loadPaymentById(id: string): Promise<PaymentPublicStatus | null> {
  const rows = await sql<
    Array<{
      id: string;
      external_order_id: string;
      kind: PaymentKind;
      status: PaymentStatus;
      expected_amount: number;
      apipay_invoice_id: string | null;
      meta: Record<string, unknown>;
    }>
  >`
    select id, external_order_id, kind, status, expected_amount, apipay_invoice_id, meta
    from payments
    where id = ${id}
    limit 1
  `;

  const row = rows[0];
  if (!row) return null;

  return {
    id: row.id,
    externalOrderId: row.external_order_id,
    kind: row.kind,
    status: row.status,
    expectedAmount: Number(row.expected_amount),
    apipayInvoiceId: row.apipay_invoice_id,
    meta: row.meta ?? {},
  };
}

export async function loadTicketByPayment(paymentId: string) {
  const rows = await sql<Array<{ show_slug: string; qty: number; ticket_number: string }>>`
    select show_slug, qty, ticket_number from tickets where payment_id = ${paymentId} limit 1
  `;
  return rows[0] ?? null;
}

/** Сколько счетов уже создано с этого номера и с этого IP за окно ограничения. */
export async function countRecentPayments(
  phone: string,
  ip: string | null,
  windowMinutes: number,
): Promise<{ byPhone: number; byIp: number }> {
  const rows = await sql<Array<{ by_phone: string; by_ip: string }>>`
    select
      count(*) filter (where phone = ${phone})                       as by_phone,
      count(*) filter (where ${ip}::text is not null and ip = ${ip}) as by_ip
    from payments
    where created_at > now() - (${windowMinutes} || ' minutes')::interval
  `;

  return { byPhone: Number(rows[0]?.by_phone ?? 0), byIp: Number(rows[0]?.by_ip ?? 0) };
}

export async function logWebhookEvent(input: {
  event: string | null;
  externalOrderId: string | null;
  invoiceStatus: string | null;
  signatureValid: boolean;
  outcome: string;
  payload: unknown;
}): Promise<void> {
  await sql`
    insert into webhook_events (event, external_order_id, invoice_status, signature_valid, outcome, payload)
    values (${input.event}, ${input.externalOrderId}, ${input.invoiceStatus},
            ${input.signatureValid}, ${input.outcome},
            ${sql.json((input.payload ?? null) as never)})
  `;
}
