import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Подпись webhook'а ApiPay: HMAC-SHA256 по СЫРОМУ телу запроса.
 *
 * Сырому — значит по той самой строке, что пришла по сети. Если разобрать JSON и
 * собрать обратно, порядок ключей или пробелы могут измениться, и подпись перестанет
 * сходиться. Поэтому обработчик обязан читать req.text() до любого разбора.
 */
export function computeSignature(rawBody: string, secret: string): string {
  return `sha256=${createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex')}`;
}

export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null | undefined,
  secret: string,
): boolean {
  if (!secret || !signatureHeader) return false;

  const expected = computeSignature(rawBody, secret);
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(signatureHeader, 'utf8');

  // timingSafeEqual падает на буферах разной длины, поэтому длину сверяем заранее.
  // Утечки тут нет: длина подписи фиксирована и не секретна.
  if (a.length !== b.length) return false;

  return timingSafeEqual(a, b);
}
