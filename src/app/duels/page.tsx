import type { Metadata } from 'next';
import { Duels } from '@/components/Duels';
import { loadSettings } from '@/lib/content';
import { loadDuels } from '@/lib/duels';

export const metadata: Metadata = { title: 'Дуэльдер | Мөлдір өлең' };
export const dynamic = 'force-dynamic';

export default async function DuelsPage() {
  const [{ settings }, { duels }] = await Promise.all([loadSettings(), loadDuels()]);

  return (
    <section className="page-top">
      <div className="sec-head">
        <span className="eyebrow">Кесте</span>
        <h2 className="h2">{settings.duelsTitle}</h2>
      </div>
      <Duels duels={duels} title="" youtubeUrl={settings.youtubeUrl} />
    </section>
  );
}
