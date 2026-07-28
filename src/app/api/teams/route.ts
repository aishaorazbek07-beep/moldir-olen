import { NextResponse } from 'next/server';
import { loadTeams } from '@/lib/content';
import { loadCounts } from '@/lib/repo';
import { buildTeams } from '@/lib/votes';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Публичные данные по городам.
 *
 * Через buildTeams, а не напрямую из базы: наружу уходит только итоговое число
 * голосов, без разбивки «заявлено / подтверждено / корректировка».
 */
export async function GET() {
  const [{ teams }, { counts }] = await Promise.all([loadTeams(), loadCounts()]);

  return NextResponse.json(
    { teams: buildTeams(teams, counts) },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
