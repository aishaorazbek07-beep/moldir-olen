import { describe, expect, it } from 'vitest';
import { createSessionValue, verifySessionValue } from './admin-session';

const SECRET = 'a'.repeat(64);
const NOW = 1_785_000_000_000;
const HOUR = 3_600_000;

describe('admin session cookie', () => {
  it('принимает свежую подписанную сессию', () => {
    const value = createSessionValue(SECRET, NOW + 8 * HOUR);
    expect(verifySessionValue(SECRET, value, NOW)).toBe(true);
  });

  it('отвергает просроченную сессию', () => {
    const value = createSessionValue(SECRET, NOW - 1);
    expect(verifySessionValue(SECRET, value, NOW)).toBe(false);
  });

  it('отвергает подделанный срок действия', () => {
    const value = createSessionValue(SECRET, NOW - HOUR);
    const [, sig] = value.split('.');
    const forged = `${NOW + 100 * HOUR}.${sig}`;
    expect(verifySessionValue(SECRET, forged, NOW)).toBe(false);
  });

  it('отвергает сессию, подписанную другим секретом', () => {
    const value = createSessionValue('b'.repeat(64), NOW + HOUR);
    expect(verifySessionValue(SECRET, value, NOW)).toBe(false);
  });

  it('отвергает мусор и пустоту', () => {
    expect(verifySessionValue(SECRET, '', NOW)).toBe(false);
    expect(verifySessionValue(SECRET, 'что-то', NOW)).toBe(false);
    expect(verifySessionValue(SECRET, 'abc.def', NOW)).toBe(false);
    expect(verifySessionValue(SECRET, null, NOW)).toBe(false);
  });

  it('без секрета не пускает никого', () => {
    const value = createSessionValue(SECRET, NOW + HOUR);
    expect(verifySessionValue('', value, NOW)).toBe(false);
  });
});
