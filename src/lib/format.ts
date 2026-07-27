/** Разряды разделяются неразрывным пробелом — как в исходной вёрстке. */
export function fmt(n: number): string {
  return n.toLocaleString('ru-RU').replace(/[, ]/g, ' ');
}

export function tenge(n: number): string {
  return `${fmt(n)} ₸`;
}

export function dateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
