/**
 * Казахстанские мобильные: код страны 7, затем код оператора. ApiPay ждёт 87XXXXXXXXX.
 *
 * Коды перечислены списком, а не шаблоном `87\d{9}`: под такой шаблон попадают и
 * городские номера (727 — Алматы, 717 — Астана), на которые счёт в Kaspi отправить
 * нельзя. Если появится новый оператор, код добавляется сюда.
 */
const KZ_MOBILE_CODES = new Set([
  '700', '701', '702', '703', '704', '705', '706', '707', '708', '709',
  '747', '750', '751', '760', '761', '762', '763', '764',
  '771', '775', '776', '777', '778',
]);

const KZ_SHAPE = /^87\d{9}$/;

function isKzMobile(candidate: string): boolean {
  return KZ_SHAPE.test(candidate) && KZ_MOBILE_CODES.has(candidate.slice(1, 4));
}

export function normalizePhone(input: string | null | undefined): string | null {
  if (typeof input !== 'string') return null;

  const digits = input.replace(/\D/g, '');
  let candidate: string;

  if (digits.length === 10) {
    candidate = `8${digits}`;
  } else if (digits.length === 11 && (digits.startsWith('7') || digits.startsWith('8'))) {
    candidate = `8${digits.slice(1)}`;
  } else {
    return null;
  }

  return isKzMobile(candidate) ? candidate : null;
}

export function formatPhoneForDisplay(normalized: string): string {
  if (!isKzMobile(normalized)) return normalized;
  const d = normalized.slice(1);
  return `+7 ${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 8)} ${d.slice(8, 10)}`;
}

/** Для админки: видно, чей номер, но полностью он не светится на экране. */
export function maskPhone(normalized: string): string {
  if (!isKzMobile(normalized)) return normalized;
  const d = normalized.slice(1);
  return `+7 ${d.slice(0, 3)} ***-${d.slice(6, 8)}-${d.slice(8, 10)}`;
}
