import { createHmac, timingSafeEqual } from 'node:crypto';

export const ADMIN_COOKIE = 'mo_admin';
export const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

/**
 * Значение cookie: "<срок в мс>.<подпись срока>".
 *
 * Срок лежит внутри подписи, поэтому продлить сессию правкой cookie нельзя —
 * подпись перестанет сходиться.
 */
export function createSessionValue(secret: string, expiresAtMs: number): string {
  const exp = String(Math.floor(expiresAtMs));
  return `${exp}.${sign(secret, exp)}`;
}

export function verifySessionValue(
  secret: string,
  value: string | null | undefined,
  nowMs: number,
): boolean {
  if (!secret || typeof value !== 'string') return false;

  const separator = value.indexOf('.');
  if (separator <= 0) return false;

  const exp = value.slice(0, separator);
  const signature = value.slice(separator + 1);

  if (!/^\d+$/.test(exp) || signature.length === 0) return false;

  const expected = Buffer.from(sign(secret, exp), 'utf8');
  const received = Buffer.from(signature, 'utf8');
  if (expected.length !== received.length) return false;
  if (!timingSafeEqual(expected, received)) return false;

  return Number(exp) > nowMs;
}

function sign(secret: string, payload: string): string {
  return createHmac('sha256', secret).update(payload, 'utf8').digest('hex');
}

/** Сравнение пароля админки без утечки длины совпавшего префикса по времени. */
export function passwordMatches(provided: string, expected: string): boolean {
  if (!expected) return false;

  const a = createHmac('sha256', 'pw').update(provided, 'utf8').digest();
  const b = createHmac('sha256', 'pw').update(expected, 'utf8').digest();

  return timingSafeEqual(a, b);
}
