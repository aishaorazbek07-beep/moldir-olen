import { NextResponse } from 'next/server';
import { ADMIN_COOKIE, SESSION_TTL_MS, createSessionValue, passwordMatches } from '@/lib/admin-session';
import { readJson } from '@/lib/request';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const body = await readJson<{ password?: unknown }>(req);
  const password = typeof body?.password === 'string' ? body.password : '';

  const expected = process.env.ADMIN_PASSWORD ?? '';
  const secret = process.env.ADMIN_SESSION_SECRET ?? '';

  if (!expected || !secret) {
    // Называем недостающее поимённо: иначе непонятно, что чинить, и легко
    // принять это за «неверный пароль».
    const missing = [!expected && 'ADMIN_PASSWORD', !secret && 'ADMIN_SESSION_SECRET']
      .filter(Boolean)
      .join(' и ');

    return NextResponse.json(
      {
        error:
          `Админка не настроена: на сервере не задана переменная ${missing}. ` +
          'Добавьте её в Vercel → Settings → Environment Variables и сделайте Redeploy.',
      },
      { status: 500 },
    );
  }

  if (!passwordMatches(password, expected)) {
    // Небольшая задержка, чтобы перебор пароля не был мгновенным.
    await new Promise((resolve) => setTimeout(resolve, 400));
    return NextResponse.json({ error: 'Неверный пароль' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });

  res.cookies.set({
    name: ADMIN_COOKIE,
    value: createSessionValue(secret, Date.now() + SESSION_TTL_MS),
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });

  return res;
}
