import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/admin-guard';
import { adjustTeamVotes } from '@/lib/admin-data';
import { badRequest, readJson } from '@/lib/request';
import { teamExists } from '@/lib/repo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Разрешённые шаги — ровно те кнопки, что есть в интерфейсе. */
const ALLOWED_DELTAS = new Set([1, 10, 100, -1, -10, -100]);

export async function POST(req: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const body = await readJson<{ teamId?: unknown; delta?: unknown }>(req);
  const teamId = Number(body?.teamId);
  const delta = Number(body?.delta);

  if (!Number.isInteger(teamId) || teamId <= 0) return badRequest('Команда не указана');
  if (!ALLOWED_DELTAS.has(delta)) return badRequest('Недопустимый шаг корректировки');
  if (!(await teamExists(teamId))) return badRequest('Команда не найдена');

  const team = await adjustTeamVotes(teamId, delta);
  if (!team) return badRequest('Команда не найдена');

  return NextResponse.json({ team });
}
