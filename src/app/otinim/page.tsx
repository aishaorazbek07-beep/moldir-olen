import type { Metadata } from 'next';
import { ClosedSection } from '@/components/ClosedSection';
import { loadSettings } from '@/lib/content';

export const metadata: Metadata = {
  title: 'Өтінім тапсыру | Мөлдір өлең',
  description: 'Мөлдір өлең жобасына өтінім.',
};

export const dynamic = 'force-dynamic';

export default async function OtinimPage() {
  const { settings } = await loadSettings();

  return (
    <section className="page-top">
      <ClosedSection
        eyebrow="2-маусым"
        title="Өтінім"
        accent="тапсыру"
        notice={settings.closedNotice}
      />
    </section>
  );
}
