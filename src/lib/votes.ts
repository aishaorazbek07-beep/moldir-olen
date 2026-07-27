export interface TeamRow {
  id: number;
  slug: string;
  name: string;
  placeLabel: string;
  colorIndex: number;
  /** Голоса, за которые реально пришли деньги. Наружу не отдаётся. */
  paidVotes: number;
  /** Ручная корректировка из админки. Наружу не отдаётся. */
  adminAdjustment: number;
}

export interface PublicTeam {
  id: number;
  slug: string;
  name: string;
  placeLabel: string;
  colorIndex: number;
  votes: number;
}

export function displayVotes(paidVotes: number, adminAdjustment: number): number {
  return Math.max(0, paidVotes + adminAdjustment);
}

/**
 * Приводит команду к тому виду, в котором её можно показывать публично.
 *
 * Поля собираются по одному, а не через spread: так разбивка «оплачено /
 * корректировка» физически не может утечь в ответ API при добавлении новых
 * полей в TeamRow.
 */
export function publicTeamView(team: TeamRow): PublicTeam {
  return {
    id: team.id,
    slug: team.slug,
    name: team.name,
    placeLabel: team.placeLabel,
    colorIndex: team.colorIndex,
    votes: displayVotes(team.paidVotes, team.adminAdjustment),
  };
}

export interface TeamWithStats extends PublicTeam {
  percent: number;
  /** Высота заливки карточки в процентах — как в исходной вёрстке: 16..80. */
  fillPercent: number;
  isLeader: boolean;
}

export function withPercentages(teams: PublicTeam[]): TeamWithStats[] {
  const total = teams.reduce((sum, t) => sum + t.votes, 0);
  const max = teams.reduce((m, t) => Math.max(m, t.votes), 0);

  return teams.map((team) => ({
    ...team,
    percent: total > 0 ? Math.round((team.votes / total) * 100) : 0,
    fillPercent: max > 0 ? Math.round(16 + 64 * (team.votes / max)) : 16,
    isLeader: max > 0 && team.votes === max,
  }));
}
