import { describe, expect, it } from 'vitest';
import { computeSignature, verifyWebhookSignature } from './webhook-signature';

const SECRET = 'whsec_test_secret';
const BODY = JSON.stringify({ event: 'invoice.status_changed', invoice: { id: 42 } });

describe('verifyWebhookSignature', () => {
  it('принимает подпись, посчитанную тем же секретом', () => {
    const sig = computeSignature(BODY, SECRET);
    expect(verifyWebhookSignature(BODY, sig, SECRET)).toBe(true);
  });

  it('отвергает подпись от другого секрета', () => {
    const sig = computeSignature(BODY, 'другой_секрет');
    expect(verifyWebhookSignature(BODY, sig, SECRET)).toBe(false);
  });

  it('отвергает подпись, если тело подменили', () => {
    const sig = computeSignature(BODY, SECRET);
    const tampered = JSON.stringify({ event: 'invoice.status_changed', invoice: { id: 43 } });
    expect(verifyWebhookSignature(tampered, sig, SECRET)).toBe(false);
  });

  it('отвергает отсутствующий заголовок подписи', () => {
    expect(verifyWebhookSignature(BODY, null, SECRET)).toBe(false);
    expect(verifyWebhookSignature(BODY, '', SECRET)).toBe(false);
  });

  it('отвергает подпись без префикса sha256=', () => {
    const sig = computeSignature(BODY, SECRET).replace('sha256=', '');
    expect(verifyWebhookSignature(BODY, sig, SECRET)).toBe(false);
  });

  it('отвергает всё, если секрет не задан', () => {
    const sig = computeSignature(BODY, SECRET);
    expect(verifyWebhookSignature(BODY, sig, '')).toBe(false);
  });
});
