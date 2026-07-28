import type { TeamRecord } from './content';

export interface TeamCounts {
  /** Заявка подана, оплату ещё не сверяли. */
  claimed: number;
  /** Оплата найдена в выписке. */
  confirmed: number;
  /** Оплаты нет — в счётчик не идут. */
  rejected: number;
  /** Ручная корректировка из админки. */
  adjustment: number;
}

export const EMPTY_COUNTS: TeamCounts = { claimed: 0, confirmed: 0, rejected: 0, adjustment: 0 };

/**
 * Число, которое видит зритель.
 *
 * Отклонённые заявки не считаются: как только организаторы видят, что оплаты не
 * было, голос уходит из счётчика. Заявленное и подтверждённое показываем сразу —
 * иначе в прямом эфире счётчик стоял бы на месте.
 */
export function displayVotes(counts: TeamCounts): number {
  return Math.max(0, counts.claimed + counts.confirmed + counts.adjustment);
}

export interface PublicTeam {
  slug: string;
  name: string;
  placeLabel: string;
  colorIndex: number;
  kaspiUrl: string;
  imageUrl: string;
  votes: number;
}

/**
 * Публичный вид города.
 *
 * Поля перечислены по одному, а не через spread: так разбивка «заявлено /
 * подтверждено / корректировка» не может случайно утечь наружу.
 */
export function publicTeam(team: TeamRecord, counts: TeamCounts): PublicTeam {
  return {
    slug: team.slug,
    name: team.name,
    placeLabel: team.placeLabel,
    colorIndex: team.colorIndex,
    kaspiUrl: team.kaspiUrl,
    imageUrl: team.imageUrl,
    votes: displayVotes(counts),
  };
}

export interface TeamWithStats extends PublicTeam {
  percent: number;
  /** Высота заливки карточки, 16..80 — как в исходном оформлении. */
  fillPercent: number;
  isLeader: boolean;
}

export function withPercentages(teams: PublicTeam[]): TeamWithStats[] {
  const total = teams.reduce((sum, t) => sum + t.votes, 0);
  const max = teams.reduce((m, t) => Math.max(m, t.votes), 0);
  const leaders = teams.filter((t) => t.votes === max).length;

  return teams.map((team) => ({
    ...team,
    percent: total > 0 ? Math.round((team.votes / total) * 100) : 0,
    fillPercent: max > 0 ? Math.round(16 + 64 * (team.votes / max)) : 16,
    // При равном счёте лидера нет: две одинаковые короны читаются как ошибка.
    isLeader: max > 0 && team.votes === max && leaders === 1,
  }));
}

export function buildTeams(
  teams: TeamRecord[],
  countsBySlug: Map<string, TeamCounts>,
): TeamWithStats[] {
  return withPercentages(
    teams.map((team) => publicTeam(team, countsBySlug.get(team.slug) ?? EMPTY_COUNTS)),
  );
}

/** Сколько голосов даёт сумма. Остаток сверх целого голоса не округляется вверх. */
export function votesForAmount(amount: number, price: number): number {
  if (!Number.isFinite(amount) || price <= 0 || amount < price) return 0;
  return Math.floor(amount / price);
}
