export const VOTE_PRICE = 200;
export const MAX_VOTES_PER_PAYMENT = 99;

export const APPLICATION_FEE = 30_000;
export const APPLICATION_DEADLINE = '15 тамызда';

export interface ShowConfig {
  slug: string;
  tag: string;
  title: string;
  when: string;
  price: number;
  hot?: boolean;
  maxQty: number;
}

export const SHOWS: ShowConfig[] = [
  {
    slug: 'superfinal',
    tag: 'Суперфинал',
    title: 'Суперфинал кеші',
    when: '30 қыркүйек · 19:00 · Алматы',
    price: 10_000,
    hot: true,
    maxQty: 10,
  },
  {
    slug: 'semifinal',
    tag: 'Жартылай финал',
    title: 'Жартылай финал',
    when: '17 қыркүйек · 19:00 · Алматы',
    price: 7_000,
    maxQty: 10,
  },
  {
    slug: 'poetry-night',
    tag: 'Кезекті кеш',
    title: 'Поэзия кеші',
    when: '10 қыркүйек · 19:00 · Алматы',
    price: 5_000,
    maxQty: 10,
  },
];

export function findShow(slug: string): ShowConfig | undefined {
  return SHOWS.find((s) => s.slug === slug);
}

/** Ограничения на создание счетов — чтобы нельзя было засыпать чужой номер счетами. */
export const RATE_LIMIT = {
  windowMinutes: 10,
  maxPerPhone: 8,
  maxPerIp: 20,
};

export const PROJECT_STATS = [
  { value: 20, label: 'өңір' },
  { value: 60, label: 'ақын' },
  { value: 20, label: 'команда' },
];

export const NAV_LINKS = [
  { href: '/', label: 'Басты' },
  { href: '/dauys', label: 'Дауыс' },
  { href: '/bilet', label: 'Билет' },
  { href: '/otinim', label: 'Өтінім' },
];

/**
 * Три режима работы платежей:
 *
 *  offline — в ApiPay не ходим вообще. Нужен, пока нет ключа или интернета:
 *            оплата подтверждается локально тем же confirmPayment.
 *  sandbox — настоящие вызовы ApiPay с ключом вТЕСТ-режиме. Оплата
 *            подтверждается через POST /invoices/{id}/simulate-status, то есть
 *            приходит настоящий webhook. Это проверяет боевой путь целиком.
 *  live    — боевые счета в Kaspi.
 */
export type PaymentsMode = 'offline' | 'sandbox' | 'live';

/**
 * Умолчание — БОЕВОЙ режим.
 *
 * Именно так, а не наоборот: незаданная переменная не должна открывать
 * тестовые лазейки. Если PAYMENTS_MODE забыли выставить на проде, сайт
 * работает строго, а не раздаёт голоса даром.
 */
export function paymentsMode(): PaymentsMode {
  const mode = process.env.PAYMENTS_MODE;
  if (mode === 'offline') return 'offline';
  if (mode === 'sandbox') return 'sandbox';
  return 'live';
}

/** Ходим ли мы в ApiPay по сети. */
export function callsApiPay(): boolean {
  return paymentsMode() !== 'offline';
}

/**
 * Доступно ли подтверждение оплаты без денег.
 *
 * Требует ДВУХ условий сразу: небоевой режим и явное разрешение отдельной
 * переменной. Одного PAYMENTS_MODE мало — песочница вполне может стоять на
 * публичном домене, и тогда маршрут раздавал бы голоса всем желающим.
 */
export function testPaymentsEnabled(): boolean {
  return paymentsMode() !== 'live' && process.env.ENABLE_TEST_PAYMENTS === 'true';
}
