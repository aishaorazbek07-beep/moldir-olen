import type { Metadata } from 'next';
import { TicketSection } from '@/components/TicketSection';

export const metadata: Metadata = {
  title: 'Билет алу | Мөлдір өлең',
  description: 'Поэзия кештеріне Kaspi арқылы билет алыңыз.',
};

export default function BiletPage() {
  return (
    <section className="page-top">
      <TicketSection />
    </section>
  );
}
