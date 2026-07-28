import type { Metadata } from 'next';
import { ClosedSection } from '@/components/ClosedSection';
import { loadSettings } from '@/lib/content';

export const metadata: Metadata = {
  title: 'Билет алу | Мөлдір өлең',
  description: 'Поэзия кештеріне билет.',
};

export const dynamic = 'force-dynamic';

export default async function BiletPage() {
  const { settings } = await loadSettings();

  return (
    <section className="page-top">
      <ClosedSection
        eyebrow="Поэзия кештері"
        title="Билет"
        accent="алыңыз"
        notice={settings.closedNotice}
      />
    </section>
  );
}
