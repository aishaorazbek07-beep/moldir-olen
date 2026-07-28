import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/admin-guard';
import { adjustVotes, setClaimStatus } from '@/lib/admin-data';
import { MAX_COLOR_INDEX } from '@/lib/config';
import {
  createTeam,
  hideTeam,
  loadTeams,
  moveTeam,
  saveSettings,
  slugify,
  updateTeam,
  type SettingKey,
} from '@/lib/content';
import { badRequest, readJson } from '@/lib/request';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_DELTAS = new Set([1, 10, 100, 1000, -1, -10, -100, -1000]);

/**
 * Все правки из админки одной ручкой.
 *
 * Так проще держать в одном месте проверку прав: любая операция начинается с
 * requireAdminApi, и забыть её при добавлении новой команды невозможно.
 */
export async function POST(req: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const body = (await readJson<Record<string, unknown>>(req)) ?? {};
  const action = typeof body.action === 'string' ? body.action : '';

  try {
    switch (action) {
      case 'settings.save': {
        const values = body.values as Partial<Record<SettingKey, string>> | undefined;
        if (!values || typeof values !== 'object') return badRequest('Нет значений');
        await saveSettings(values);
        return NextResponse.json({ ok: true });
      }

      case 'team.create': {
        const name = str(body.name);
        if (name.length < 2) return badRequest('Укажите название города');

        const { teams } = await loadTeams(true);
        let slug = slugify(name);
        // Слаг участвует в связке с заявками, поэтому он обязан быть уникальным.
        if (teams.some((t) => t.slug === slug)) slug = `${slug}-${teams.length + 1}`;

        await createTeam({
          slug,
          name,
          placeLabel: str(body.placeLabel),
          colorIndex: colorIndex(body.colorIndex),
          kaspiUrl: str(body.kaspiUrl),
          isActive: body.isActive !== false,
        });
        return NextResponse.json({ ok: true, slug });
      }

      case 'team.update': {
        const id = Number(body.id);
        if (!Number.isInteger(id)) return badRequest('Город не указан');
        const name = str(body.name);
        if (name.length < 2) return badRequest('Укажите название города');

        await updateTeam(id, {
          name,
          placeLabel: str(body.placeLabel),
          colorIndex: colorIndex(body.colorIndex),
          kaspiUrl: str(body.kaspiUrl),
          isActive: body.isActive !== false,
        });
        return NextResponse.json({ ok: true });
      }

      case 'team.hide': {
        const id = Number(body.id);
        if (!Number.isInteger(id)) return badRequest('Город не указан');
        await hideTeam(id);
        return NextResponse.json({ ok: true });
      }

      case 'team.move': {
        const id = Number(body.id);
        const direction = body.direction === 'up' ? 'up' : 'down';
        if (!Number.isInteger(id)) return badRequest('Город не указан');
        await moveTeam(id, direction);
        return NextResponse.json({ ok: true });
      }

      case 'votes.adjust': {
        const slug = str(body.teamSlug);
        const delta = Number(body.delta);
        if (!slug) return badRequest('Город не указан');
        if (!ALLOWED_DELTAS.has(delta)) return badRequest('Недопустимый шаг');
        await adjustVotes(slug, delta);
        return NextResponse.json({ ok: true });
      }

      case 'claim.status': {
        const id = Number(body.id);
        const status = body.status;
        if (!Number.isInteger(id)) return badRequest('Заявка не указана');
        if (status !== 'claimed' && status !== 'confirmed' && status !== 'rejected') {
          return badRequest('Недопустимый статус');
        }
        await setClaimStatus(id, status);
        return NextResponse.json({ ok: true });
      }

      default:
        return badRequest('Неизвестное действие');
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Не удалось сохранить' },
      { status: 500 },
    );
  }
}

function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function colorIndex(value: unknown): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > MAX_COLOR_INDEX) return 1;
  return n;
}
