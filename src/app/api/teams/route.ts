import { NextResponse } from 'next/server';
import { loadTeamRows } from '@/lib/repo';
import { publicTeamView, withPercentages } from '@/lib/votes';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Публичные данные по командам.
 *
 * Через publicTeamView, а не напрямую из базы: наружу уходит только итоговое
 * число голосов, без разбивки «оплачено / корректировка».
 */
export async function GET() {
  const teams = withPercentages((await loadTeamRows()).map(publicTeamView));

  return NextResponse.json({ teams }, { headers: { 'Cache-Control': 'no-store' } });
}
