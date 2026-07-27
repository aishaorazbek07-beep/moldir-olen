/**
 * ApiPay присылает суммы строками вида "15000.00". Сравнивать их как числа с
 * плавающей точкой нельзя, поэтому переводим в тиыны и сравниваем целые.
 */
export function toTiyn(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;

  let raw: number;
  if (typeof value === 'number') {
    raw = value;
  } else {
    const cleaned = String(value).replace(/\s/g, '');
    // Number('') возвращает 0, поэтому пустую строку отсекаем до преобразования.
    if (cleaned.length === 0) return null;
    raw = Number(cleaned);
  }

  if (!Number.isFinite(raw)) return null;

  return Math.round(raw * 100);
}

/**
 * Сумма из webhook'а должна совпасть с ожидаемой ровно.
 *
 * Переплату тоже отклоняем: несовпадение суммы означает, что что-то пошло не по
 * нашему сценарию, и такой платёж должен увидеть человек, а не автоматика.
 */
export function amountsMatch(incoming: string | number | null | undefined, expectedTenge: number): boolean {
  const incomingTiyn = toTiyn(incoming);
  const expectedTiyn = toTiyn(expectedTenge);

  if (incomingTiyn === null || expectedTiyn === null) return false;

  return incomingTiyn === expectedTiyn;
}
