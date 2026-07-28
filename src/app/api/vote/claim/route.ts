import { NextResponse } from 'next/server';
import { MAX_VOTE_AMOUNT, RATE_LIMIT, VOTE_PACKS } from '@/lib/config';
import { loadSettings, loadTeams } from '@/lib/content';
import { normalizePhone } from '@/lib/phone';
import { badRequest, clientIp, readJson } from '@/lib/request';
import { countRecentClaims, insertClaim, isDuplicateSubmit, loadCounts } from '@/lib/repo';
import { buildTeams, votesForAmount } from '@/lib/votes';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Записывает заявку на голос.
 *
 * Оплата здесь НЕ проверяется: организаторы сверяют её вручную по выписке
 * Kaspi. Значит заявка означает «человек сказал, что заплатил», а не «деньги
 * получены». Отсюда всё остальное в этом файле:
 *
 *   — заявка пишется со статусом claimed и может быть отклонена в админке,
 *     тогда голос уходит из счётчика;
 *   — ФИО и номер отправителя обязательны: по ним платёж и ищут в выписке;
 *   — повтор той же суммы с того же номера в пределах минуты отсекается —
 *     это двойное нажатие, а не второй платёж;
 *   — ограничение по адресу, иначе счётчик накрутят скриптом за минуту.
 */
export async function POST(req: Request) {
  const body = await readJson<{
    teamSlug?: unknown;
    amount?: unknown;
    payerName?: unknown;
    phone?: unknown;
  }>(req);
  if (!body) return badRequest('Сұраныс дұрыс емес');

  const { teams } = await loadTeams();
  const { settings } = await loadSettings();

  const team = teams.find((t) => t.slug === body.teamSlug);
  const amount = Math.floor(Number(body.amount));
  const payerName = typeof body.payerName === 'string' ? body.payerName.trim().slice(0, 120) : '';
  const phone = normalizePhone(typeof body.phone === 'string' ? body.phone : null);

  if (!team) return badRequest('Қала таңдалмаған');
  if (!Number.isFinite(amount) || amount < settings.votePrice) {
    return badRequest(`Ең аз сома — ${settings.votePrice} ₸`);
  }
  if (amount > MAX_VOTE_AMOUNT) return badRequest('Сома тым үлкен');
  if (payerName.length < 3) return badRequest('Аты-жөніңізді толық жазыңыз');
  if (!phone) return badRequest('Төлем жасалған нөмірді дұрыс енгізіңіз');

  const quantity = votesForAmount(amount, settings.votePrice);

  // Принимаем только суммы, ровно соответствующие разрешённым пакетам.
  // Проверка на сервере, а не только в интерфейсе: иначе правило обходится
  // одним запросом мимо сайта.
  if (!VOTE_PACKS.includes(quantity) || quantity * settings.votePrice !== amount) {
    return badRequest(`Дауыс саны ${VOTE_PACKS.join(', ')} болуы керек`);
  }

  const ip = clientIp(req);

  try {
    if ((await countRecentClaims(ip, RATE_LIMIT.windowMinutes)) >= RATE_LIMIT.maxPerIp) {
      return NextResponse.json(
        { error: 'Тым көп сұраныс жіберілді. Сәл кейін қайталап көріңіз.' },
        { status: 429 },
      );
    }

    if (await isDuplicateSubmit(phone, amount)) {
      return NextResponse.json(
        { error: 'Дәл осындай өтінім жаңа ғана тіркелді. Қайта жіберудің қажеті жоқ.' },
        { status: 409 },
      );
    }

    await insertClaim({ teamSlug: team.slug, quantity, amount, payerName, phone, ip });
  } catch {
    return NextResponse.json(
      { error: 'Дауысты тіркеу мүмкін болмады. Ұйымдастырушыларға жазыңыз.' },
      { status: 503 },
    );
  }

  const { counts } = await loadCounts();

  return NextResponse.json({ ok: true, quantity, teams: buildTeams(teams, counts) });
}
