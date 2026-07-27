import { describe, expect, it } from 'vitest';
import { formatPhoneForDisplay, maskPhone, normalizePhone } from './phone';

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
