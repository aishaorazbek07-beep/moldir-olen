import type { Metadata } from 'next';
import { ApplySection } from '@/components/ApplySection';

export const metadata: Metadata = {
  title: 'Өтінім тапсыру | Мөлдір өлең',
  description: 'Мөлдір өлең жобасының 2-маусымына өтінім қалдырыңыз.',
};

export default function OtinimPage() {
  return (
    <section className="page-top">
      <ApplySection />
    </section>
  );
}
