import { NextResponse } from 'next/server';
import { MAX_VOTE_AMOUNT, RATE_LIMIT } from '@/lib/config';
import { loadSettings, loadTeams } from '@/lib/content';
import { badRequest, clientIp, readJson } from '@/lib/request';
import { countRecentClaims, insertClaim, loadCounts, receiptAlreadyUsed } from '@/lib/repo';
import { buildTeams, votesForAmount } from '@/lib/votes';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Записывает заявку на голос.
 *
 * Оплата здесь НЕ проверяется: по решению организаторов её сверяют вручную по
 * скриншотам в WhatsApp и номеру чека. Значит заявка означает «человек сказал,
 * что заплатил», а не «деньги получены». Отсюда всё остальное в этом файле:
 *
 *   — заявка пишется со статусом claimed и может быть отклонена в админке,
 *     тогда голос уходит из счётчика;
 *   — номер чека обязателен: у заплатившего он под рукой, выдуманный не
 *     сойдётся с выпиской;
 *   — один чек не может быть засчитан дважды;
 *   — ограничение по адресу, иначе счётчик накрутят скриптом за минуту.
 */
export async function POST(req: Request) {
  const body = await readJson<{
    teamSlug?: unknown;
    amount?: unknown;
    payerName?: unknown;
    receipt?: unknown;
  }>(req);
  if (!body) return badRequest('Сұраныс дұрыс емес');

  const { teams } = await loadTeams();
  const { settings } = await loadSettings();

  const team = teams.find((t) => t.slug === body.teamSlug);
  const amount = Math.floor(Number(body.amount));
  const payerName = typeof body.payerName === 'string' ? body.payerName.trim().slice(0, 120) : '';
  const receipt = typeof body.receipt === 'string' ? body.receipt.trim().slice(0, 60) : '';

  if (!team) return badRequest('Қала таңдалмаған');
  if (!Number.isFinite(amount) || amount < settings.votePrice) {
    return badRequest(`Ең аз сома — ${settings.votePrice} ₸`);
  }
  if (amount > MAX_VOTE_AMOUNT) return badRequest('Сома тым үлкен');
  if (payerName.length < 2) return badRequest('Kaspi-дегі атыңызды жазыңыз');
  if (receipt.length < 4) return badRequest('Чек нөмірін толық жазыңыз');

  const quantity = votesForAmount(amount, settings.votePrice);
  if (quantity < 1) return badRequest(`Ең аз сома — ${settings.votePrice} ₸`);

  const ip = clientIp(req);

  try {
    if ((await countRecentClaims(ip, RATE_LIMIT.windowMinutes)) >= RATE_LIMIT.maxPerIp) {
      return NextResponse.json(
        { error: 'Тым көп сұраныс жіберілді. Сәл кейін қайталап көріңіз.' },
        { status: 429 },
      );
    }

    if (await receiptAlreadyUsed(receipt)) {
      return NextResponse.json(
        { error: 'Бұл чек нөмірі бұрын тіркелген. Әр төлемнің чегі бір рет есептеледі.' },
        { status: 409 },
      );
    }

    await insertClaim({ teamSlug: team.slug, quantity, amount, payerName, receipt, ip });
  } catch {
    return NextResponse.json(
      { error: 'Дауысты тіркеу мүмкін болмады. Ұйымдастырушыларға жазыңыз.' },
      { status: 503 },
    );
  }

  const { counts } = await loadCounts();

  return NextResponse.json({ ok: true, quantity, teams: buildTeams(teams, counts) });
}
