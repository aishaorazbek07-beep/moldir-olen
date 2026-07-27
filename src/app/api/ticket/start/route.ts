import { NextResponse } from 'next/server';
import { findShow } from '@/lib/config';
import { normalizePhone } from '@/lib/phone';
import { badRequest, clientIp, readJson } from '@/lib/request';
import { startPayment } from '@/lib/start-payment';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const body = await readJson<{ showSlug?: unknown; qty?: unknown; phone?: unknown }>(req);
  if (!body) return badRequest('Сұраныс дұрыс емес');

  const show = typeof body.showSlug === 'string' ? findShow(body.showSlug) : undefined;
  const qty = Number(body.qty);
  const phone = normalizePhone(typeof body.phone === 'string' ? body.phone : null);

  if (!show) return badRequest('Кеш табылмады');
  if (!Number.isInteger(qty) || qty < 1 || qty > show.maxQty) {
    return badRequest(`Билет саны 1-ден ${show.maxQty}-ге дейін болуы керек`);
  }
  if (!phone) return badRequest('Kaspi нөміріңізді дұрыс енгізіңіз');

  // Цена берётся из конфига на сервере, а не из запроса.
  const amount = qty * show.price;

  const result = await startPayment({
    kind: 'ticket',
    phone,
    amount,
    description: `Мөлдір өлең — ${show.title} (${qty} билет)`,
    meta: { showSlug: show.slug, qty },
    ip: clientIp(req),
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.code === 'rate_limited' ? 429 : 502 });
  }

  return NextResponse.json({ paymentId: result.paymentId, amount });
}
