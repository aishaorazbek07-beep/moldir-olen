import { describe, expect, it } from 'vitest';
import { amountsMatch, toTiyn } from './amount';

describe('toTiyn', () => {
  it('переводит строку ApiPay в тиыны', () => {
    expect(toTiyn('200.00')).toBe(20000);
    expect(toTiyn('15000.00')).toBe(1500000);
    expect(toTiyn('7000.5')).toBe(700050);
  });

  it('принимает число', () => {
    expect(toTiyn(200)).toBe(20000);
  });

  it('возвращает null на мусоре', () => {
    expect(toTiyn('abc')).toBeNull();
    expect(toTiyn('')).toBeNull();
    expect(toTiyn(Number.NaN)).toBeNull();
    expect(toTiyn(null as unknown as string)).toBeNull();
  });
});

describe('amountsMatch', () => {
  it('совпадение суммы из webhook и ожидаемой', () => {
    expect(amountsMatch('2000.00', 2000)).toBe(true);
    expect(amountsMatch(2000, 2000)).toBe(true);
  });

  it('недоплата не проходит', () => {
    expect(amountsMatch('200.00', 2000)).toBe(false);
  });

  it('переплата тоже не проходит — сумма должна быть ровной', () => {
    expect(amountsMatch('2500.00', 2000)).toBe(false);
  });

  it('нечитаемая сумма не проходит', () => {
    expect(amountsMatch('нет', 2000)).toBe(false);
  });
});
