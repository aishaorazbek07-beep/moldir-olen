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
import { clearPoster, createDuel, deleteDuel, savePoster, updateDuel } from '@/lib/duels';
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

      case 'duel.create': {
        const startsAt = str(body.startsAt);
        if (!startsAt) return badRequest('Укажите дату и время');
        const id = await createDuel(duelInput(body, startsAt));
        return NextResponse.json({ ok: true, id });
      }

      case 'duel.update': {
        const id = Number(body.id);
        const startsAt = str(body.startsAt);
        if (!Number.isInteger(id)) return badRequest('Дуэль не указана');
        if (!startsAt) return badRequest('Укажите дату и время');
        await updateDuel(id, duelInput(body, startsAt));
        return NextResponse.json({ ok: true });
      }

      case 'duel.delete': {
        const id = Number(body.id);
        if (!Number.isInteger(id)) return badRequest('Дуэль не указана');
        await deleteDuel(id);
        return NextResponse.json({ ok: true });
      }

      case 'duel.poster': {
        const id = Number(body.id);
        const dataUrl = str(body.dataUrl);
        if (!Number.isInteger(id)) return badRequest('Дуэль не указана');

        if (!dataUrl) {
          await clearPoster(id);
          return NextResponse.json({ ok: true, cleared: true });
        }

        const match = /^data:(image\/(?:png|jpeg|jpg|webp|gif));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
        if (!match) return badRequest('Афиша должна быть картинкой PNG, JPEG, WEBP или GIF');

        // База — не файловое хранилище: крупные афиши тормозили бы и запись,
        // и выдачу. Полтора мегабайта хватает для афиши с запасом.
        const bytes = Math.floor((match[2].length * 3) / 4);
        if (bytes > 1_500_000) {
          return badRequest(`Афиша слишком большая (${Math.round(bytes / 1024)} КБ). Нужно до 1500 КБ.`);
        }

        await savePoster(id, match[1], match[2]);
        return NextResponse.json({ ok: true, bytes });
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

function duelInput(body: Record<string, unknown>, startsAt: string) {
  const price = Number(body.price);
  return {
    startsAt,
    teamA: str(body.teamA),
    teamB: str(body.teamB),
    price: Number.isFinite(price) && price >= 0 ? Math.floor(price) : 0,
    ticketUrl: str(body.ticketUrl),
    isActive: body.isActive !== false,
  };
}

function colorIndex(value: unknown): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > MAX_COLOR_INDEX) return 1;
  return n;
}
