import { NextResponse } from 'next/server';
import { MAX_VOTES_PER_PAYMENT, VOTE_PRICE } from '@/lib/config';
import { normalizePhone } from '@/lib/phone';
import { badRequest, clientIp, readJson } from '@/lib/request';
import { teamExists } from '@/lib/repo';
import { startPayment } from '@/lib/start-payment';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const body = await readJson<{ teamId?: unknown; quantity?: unknown; phone?: unknown }>(req);
  if (!body) return badRequest('Сұраныс дұрыс емес');

  const teamId = Number(body.teamId);
  const quantity = Number(body.quantity);
  const phone = normalizePhone(typeof body.phone === 'string' ? body.phone : null);

  if (!Number.isInteger(teamId) || teamId <= 0) return badRequest('Команда таңдалмаған');
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_VOTES_PER_PAYMENT) {
    return badRequest(`Дауыс саны 1-ден ${MAX_VOTES_PER_PAYMENT}-ге дейін болуы керек`);
  }
  if (!phone) return badRequest('Kaspi нөміріңізді дұрыс енгізіңіз');

  if (!(await teamExists(teamId))) return badRequest('Команда табылмады');

  // Сумму считает сервер. Всё, что прислал клиент, — только количество.
  const amount = quantity * VOTE_PRICE;

  const result = await startPayment({
    kind: 'vote',
    phone,
    amount,
    description: `Мөлдір өлең — ${quantity} дауыс`,
    meta: { teamId, quantity },
    ip: clientIp(req),
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.code === 'rate_limited' ? 429 : 502 });
  }

  return NextResponse.json({ paymentId: result.paymentId, amount });
}
