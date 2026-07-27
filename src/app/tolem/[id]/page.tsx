import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { findShow } from '@/lib/config';
import { loadTicketByPayment } from '@/lib/repo';
import { syncPaymentStatus } from '@/lib/start-payment';
import { PaymentStatusView } from './PaymentStatusView';

export const metadata: Metadata = {
  title: 'Төлем | Мөлдір өлең',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function TolemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const view = await syncPaymentStatus(id);
  if (!view) notFound();

  const ticketRow = view.state === 'paid' && view.kind === 'ticket' ? await loadTicketByPayment(id) : null;
  const show = ticketRow ? findShow(ticketRow.show_slug) : undefined;

  return (
    <PaymentStatusView
      paymentId={id}
      initial={{
        state: view.state,
        kind: view.kind,
        amount: view.amount,
        reason: view.state === 'failed' ? view.rawStatus : undefined,
        ticket: ticketRow
          ? {
              number: ticketRow.ticket_number,
              qty: ticketRow.qty,
              title: show?.title ?? ticketRow.show_slug,
              when: show?.when ?? '',
              sum: view.amount,
            }
          : undefined,
      }}
    />
  );
}
