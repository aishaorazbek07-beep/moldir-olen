import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { ADMIN_COOKIE, verifySessionValue } from './admin-session';

/** Проверка сессии админки на сервере. Вызывается в каждой странице и ручке админки. */
export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  const value = store.get(ADMIN_COOKIE)?.value ?? null;

  return verifySessionValue(process.env.ADMIN_SESSION_SECRET ?? '', value, Date.now());
}

/** Для API-маршрутов: возвращает готовый 401, если сессии нет. */
export async function requireAdminApi(): Promise<NextResponse | null> {
  if (await isAdmin()) return null;
  return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
}
