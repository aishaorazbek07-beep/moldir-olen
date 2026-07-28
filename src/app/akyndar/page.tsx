import type { Metadata } from 'next';
import { Poets } from '@/components/Poets';
import { loadPoets } from '@/lib/catalog';
import { loadSettings } from '@/lib/content';

export const metadata: Metadata = { title: 'Ақындар | Мөлдір өлең' };
export const dynamic = 'force-dynamic';

export default async function PoetsPage() {
  const [{ settings }, poets] = await Promise.all([loadSettings(), loadPoets()]);

  return (
    <section className="page-top">
      {poets.length === 0 ? (
        <div className="closed-box">
          <span className="lock">🪶</span>
          <h3 className="serif">Жақында</h3>
          <p>Ақындар туралы ақпарат дайындалып жатыр.</p>
        </div>
      ) : (
        <Poets poets={poets} title={settings.poetsTitle} lead={settings.poetsLead} />
      )}
    </section>
  );
}
