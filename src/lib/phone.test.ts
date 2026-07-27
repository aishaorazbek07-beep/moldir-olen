import { describe, expect, it } from 'vitest';
import { formatPhoneForDisplay, formatPhoneInput, maskPhone, normalizePhone } from './phone';

describe('normalizePhone', () => {
  it('приводит все обычные записи казахстанского номера к 87XXXXXXXXX', () => {
    expect(normalizePhone('87001234567')).toBe('87001234567');
    expect(normalizePhone('77001234567')).toBe('87001234567');
    expect(normalizePhone('+77001234567')).toBe('87001234567');
    expect(normalizePhone('7001234567')).toBe('87001234567');
    expect(normalizePhone('+7 (700) 123-45-67')).toBe('87001234567');
    expect(normalizePhone('8 700 123 45 67')).toBe('87001234567');
  });

  it('отвергает номера неверной длины', () => {
    expect(normalizePhone('700123456')).toBeNull();
    expect(normalizePhone('870012345678')).toBeNull();
    expect(normalizePhone('')).toBeNull();
  });

  it('отвергает не мобильные и не казахстанские номера', () => {
    expect(normalizePhone('87271234567')).toBeNull();
    expect(normalizePhone('12125551234')).toBeNull();
  });

  it('отвергает мусор', () => {
    expect(normalizePhone('телефон')).toBeNull();
    expect(normalizePhone(null as unknown as string)).toBeNull();
  });
});

describe('formatPhoneInput — маска поля ввода', () => {
  it('пустое поле показывает +7', () => {
    expect(formatPhoneInput('')).toBe('+7 ');
    expect(formatPhoneInput('+7 ')).toBe('+7 ');
  });

  it('расставляет пробелы по мере набора', () => {
    expect(formatPhoneInput('+7 7')).toBe('+7 7');
    expect(formatPhoneInput('+7 700')).toBe('+7 700');
    expect(formatPhoneInput('+7 7001')).toBe('+7 700 1');
    expect(formatPhoneInput('+7 700123')).toBe('+7 700 123');
    expect(formatPhoneInput('+7 70012345')).toBe('+7 700 123 45');
    expect(formatPhoneInput('+7 7001234567')).toBe('+7 700 123 45 67');
  });

  it('не съедает семёрку кода оператора при наборе с нуля', () => {
    // Все казахстанские мобильные коды начинаются с 7 — её нельзя принять
    // за код страны и отрезать.
    expect(formatPhoneInput('7')).toBe('+7 7');
    expect(formatPhoneInput('77')).toBe('+7 77');
    expect(formatPhoneInput('771')).toBe('+7 771');
  });

  it('приводит вставленный номер в любом виде к одному результату', () => {
    const expected = '+7 700 123 45 67';
    expect(formatPhoneInput('+77001234567')).toBe(expected);
    expect(formatPhoneInput('87001234567')).toBe(expected);
    expect(formatPhoneInput('8 700 123 45 67')).toBe(expected);
    expect(formatPhoneInput('+7 (700) 123-45-67')).toBe(expected);
    expect(formatPhoneInput('7001234567')).toBe(expected);
  });

  it('лишние набранные цифры игнорирует, а не сдвигает номер', () => {
    expect(formatPhoneInput('+7 700 123 45 679')).toBe('+7 700 123 45 67');
    expect(formatPhoneInput('+7 700 123 45 6789')).toBe('+7 700 123 45 67');
  });

  it('стирание доходит только до +7 и дальше не идёт', () => {
    expect(formatPhoneInput('+7 7')).toBe('+7 7');
    expect(formatPhoneInput('+7 ')).toBe('+7 ');
    expect(formatPhoneInput('+7')).toBe('+7 ');
    expect(formatPhoneInput('+')).toBe('+7 ');
  });

  it('результат маски всегда проходит нормализацию', () => {
    expect(normalizePhone(formatPhoneInput('87001234567'))).toBe('87001234567');
    expect(normalizePhone(formatPhoneInput('7001234567'))).toBe('87001234567');
  });
});

describe('formatPhoneForDisplay', () => {
  it('показывает номер читаемо', () => {
    expect(formatPhoneForDisplay('87001234567')).toBe('+7 700 123 45 67');
  });
});

describe('maskPhone', () => {
  it('скрывает середину номера для админки', () => {
    expect(maskPhone('87001234567')).toBe('+7 700 ***-45-67');
  });
});
