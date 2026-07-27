import { NextResponse } from 'next/server';
import { findShow } from '@/lib/config';
import { loadTeamRows, loadTicketByPayment } from '@/lib/repo';
import { syncPaymentStatus } from '@/lib/start-payment';
import { publicTeamView, withPercentages } from '@/lib/votes';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Браузер опрашивает этот маршрут, пока платёж не завершится.
 *
 * Ответ — только чтение. Ни один вызов отсюда не может засчитать голос: выдачу
 * делает confirmPayment, и он срабатывает лишь когда ApiPay подтвердил оплату.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!UUID.test(id)) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  const view = await syncPaymentStatus(id);
  if (!view) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const payload: Record<string, unknown> = {
    state: view.state,
    kind: view.kind,
    amount: view.amount,
  };

  if (view.state === 'paid') {
    if (view.kind === 'vote') {
      payload.teams = withPercentages((await loadTeamRows()).map(publicTeamView));
    }

    if (view.kind === 'ticket') {
      const ticket = await loadTicketByPayment(id);
      if (ticket) {
        const show = findShow(ticket.show_slug);
        payload.ticket = {
          number: ticket.ticket_number,
          qty: ticket.qty,
          title: show?.title ?? ticket.show_slug,
          when: show?.when ?? '',
          sum: view.amount,
        };
      }
    }
  }

  if (view.state === 'failed') {
    payload.reason = view.rawStatus;
  }

  return NextResponse.json(payload, { headers: { 'Cache-Control': 'no-store' } });
}
