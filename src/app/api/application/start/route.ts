import { NextResponse } from 'next/server';
import { APPLICATION_FEE } from '@/lib/config';
import { normalizePhone } from '@/lib/phone';
import { badRequest, clientIp, readJson } from '@/lib/request';
import { startPayment } from '@/lib/start-payment';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CURRENT_YEAR = 2026;

export async function POST(req: Request) {
  const body = await readJson<{
    name?: unknown;
    birthYear?: unknown;
    region?: unknown;
    resume?: unknown;
    phone?: unknown;
  }>(req);
  if (!body) return badRequest('Сұраныс дұрыс емес');

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const birthYear = Number(body.birthYear);
  const region = typeof body.region === 'string' ? body.region.trim() : '';
  const resume = typeof body.resume === 'string' ? body.resume.trim() : '';
  const phone = normalizePhone(typeof body.phone === 'string' ? body.phone : null);

  if (name.length < 2 || name.length > 120) return badRequest('Аты-жөніңізді енгізіңіз');
  if (!Number.isInteger(birthYear) || birthYear < 1930 || birthYear > CURRENT_YEAR - 10) {
    return badRequest('Туған жылыңызды дұрыс енгізіңіз');
  }
  if (region.length > 120) return badRequest('Өңір атауы тым ұзын');
  if (resume.length > 4000) return badRequest('Резюме тым ұзын');
  if (!phone) return badRequest('Kaspi нөміріңізді дұрыс енгізіңіз');

  const result = await startPayment({
    kind: 'application',
    phone,
    amount: APPLICATION_FEE,
    description: 'Мөлдір өлең — 2-маусымға өтінім',
    meta: { name, birthYear, region, resume },
    ip: clientIp(req),
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.code === 'rate_limited' ? 429 : 502 });
  }

  return NextResponse.json({ paymentId: result.paymentId, amount: APPLICATION_FEE });
}
