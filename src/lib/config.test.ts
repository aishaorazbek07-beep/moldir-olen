import { afterEach, describe, expect, it } from 'vitest';
import { callsApiPay, paymentsMode, testPaymentsEnabled } from './config';

const ORIGINAL = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL };
});

describe('paymentsMode — умолчание должно быть безопасным', () => {
  it('незаданная переменная означает БОЕВОЙ режим, а не тестовый', () => {
    delete process.env.PAYMENTS_MODE;
    expect(paymentsMode()).toBe('live');
  });

  it('мусор в переменной тоже означает боевой режим', () => {
    process.env.PAYMENTS_MODE = 'SANDBOX';
    expect(paymentsMode()).toBe('live');
    process.env.PAYMENTS_MODE = 'test';
    expect(paymentsMode()).toBe('live');
    process.env.PAYMENTS_MODE = '';
    expect(paymentsMode()).toBe('live');
  });

  it('распознаёт заданные явно режимы', () => {
    process.env.PAYMENTS_MODE = 'offline';
    expect(paymentsMode()).toBe('offline');
    process.env.PAYMENTS_MODE = 'sandbox';
    expect(paymentsMode()).toBe('sandbox');
    process.env.PAYMENTS_MODE = 'live';
    expect(paymentsMode()).toBe('live');
  });
});

describe('callsApiPay', () => {
  it('в ApiPay не ходим только в offline', () => {
    process.env.PAYMENTS_MODE = 'offline';
    expect(callsApiPay()).toBe(false);

    process.env.PAYMENTS_MODE = 'sandbox';
    expect(callsApiPay()).toBe(true);

    delete process.env.PAYMENTS_MODE;
    expect(callsApiPay()).toBe(true);
  });
});

describe('testPaymentsEnabled — подтверждение оплаты без денег', () => {
  it('выключено, когда ничего не задано', () => {
    delete process.env.PAYMENTS_MODE;
    delete process.env.ENABLE_TEST_PAYMENTS;
    expect(testPaymentsEnabled()).toBe(false);
  });

  it('выключено в песочнице без явного разрешения', () => {
    process.env.PAYMENTS_MODE = 'sandbox';
    delete process.env.ENABLE_TEST_PAYMENTS;
    expect(testPaymentsEnabled()).toBe(false);
  });

  it('выключено в offline без явного разрешения', () => {
    process.env.PAYMENTS_MODE = 'offline';
    delete process.env.ENABLE_TEST_PAYMENTS;
    expect(testPaymentsEnabled()).toBe(false);
  });

  it('НЕ включается в боевом режиме, даже если разрешение выставлено', () => {
    process.env.PAYMENTS_MODE = 'live';
    process.env.ENABLE_TEST_PAYMENTS = 'true';
    expect(testPaymentsEnabled()).toBe(false);
  });

  it('включается только при двух условиях сразу', () => {
    process.env.PAYMENTS_MODE = 'sandbox';
    process.env.ENABLE_TEST_PAYMENTS = 'true';
    expect(testPaymentsEnabled()).toBe(true);
  });

  it('не включается от значений вроде "1" или "yes"', () => {
    process.env.PAYMENTS_MODE = 'sandbox';
    for (const v of ['1', 'yes', 'TRUE', 'on']) {
      process.env.ENABLE_TEST_PAYMENTS = v;
      expect(testPaymentsEnabled()).toBe(false);
    }
  });
});
