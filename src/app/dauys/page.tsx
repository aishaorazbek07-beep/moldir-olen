import type { Metadata } from 'next';
import { VoteSection } from '@/components/VoteSection';
import { loadTeamRows } from '@/lib/repo';
import { publicTeamView, withPercentages } from '@/lib/votes';

export const metadata: Metadata = {
  title: 'Дауыс беру | Мөлдір өлең',
  description: 'Суперфинал командаларына Kaspi арқылы дауыс беріңіз.',
};

// Счётчики должны быть свежими при каждом заходе, кэшировать их нельзя.
export const dynamic = 'force-dynamic';

export default async function DauysPage() {
  // publicTeamView отсекает разбивку «оплачено / корректировка» — на клиент
  // уходит только итоговое число голосов.
  const teams = withPercentages((await loadTeamRows()).map(publicTeamView));

  return (
    <section className="page-top">
      <VoteSection initialTeams={teams} />
    </section>
  );
}
