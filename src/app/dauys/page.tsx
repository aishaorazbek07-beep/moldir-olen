import type { Metadata } from 'next';
import { VoteSection } from '@/components/VoteSection';
import { loadSettings, loadTeams, whatsappBase } from '@/lib/content';
import { loadCounts } from '@/lib/repo';
import { buildTeams } from '@/lib/votes';

export const metadata: Metadata = {
  title: 'Дауыс беру | Мөлдір өлең',
  description: 'Финалист қалаларға Kaspi арқылы дауыс беріңіз.',
};

// Счётчики должны быть свежими при каждом заходе — кэшировать нельзя.
export const dynamic = 'force-dynamic';

export default async function DauysPage() {
  const [{ teams }, { settings }, { counts }] = await Promise.all([
    loadTeams(),
    loadSettings(),
    loadCounts(),
  ]);

  // buildTeams отсекает разбивку «заявлено / подтверждено / корректировка» —
  // на клиент уходит только итоговое число голосов.
  const rows = buildTeams(teams, counts);

  return (
    <section className="page-top">
      <VoteSection
        initialTeams={rows}
        votePrice={settings.votePrice}
        whatsappBase={whatsappBase(settings)}
        eyebrow={settings.voteEyebrow}
        title={settings.voteTitle}
        lead={settings.voteLead}
        note={settings.voteNote}
      />
    </section>
  );
}
