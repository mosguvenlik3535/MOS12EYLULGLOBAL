import { describe, expect, it } from 'vitest';
import { isValidLicenseKey, normalizeLicenseKey, sha256hex } from './licenseCore';

describe('sha256hex (saf SHA-256)', () => {
  it('bilinen vektörlerle eşleşir', () => {
    expect(sha256hex('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(sha256hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  it('UTF-8 (Türkçe / nokta karakter) doğru kodlanır', () => {
    // 'ş' = 0xC5 0x9F, '·' = 0xC2 0xB7 — Node crypto ile aynı sonucu üretmeli
    expect(sha256hex('şifre·123')).toHaveLength(64);
  });
});

describe('normalizeLicenseKey', () => {
  it('girdiyi MOS-XXXX-XXXX-XXXX biçimine getirir', () => {
    expect(normalizeLicenseKey('mos1234abcd9999')).toBe('MOS-1234-ABCD-9999');
    expect(normalizeLicenseKey('MOS-1234-ABCD-9999')).toBe('MOS-1234-ABCD-9999');
    expect(normalizeLicenseKey('mos 1234 abcd 9999')).toBe('MOS-1234-ABCD-9999');
  });

  it('15 karakterle sınırlar', () => {
    expect(normalizeLicenseKey('MOS1234ABCD9999XXXXX')).toBe('MOS-1234-ABCD-9999');
  });
});

describe('isValidLicenseKey (anahtar koddan okunamaz)', () => {
  it('gerçek anahtarı kabul eder', () => {
    expect(isValidLicenseKey('MOS-1234-ABCD-9999')).toBe(true);
    expect(isValidLicenseKey('mos-1234-abcd-9999')).toBe(true);
  });

  it('rastgele / yanlış anahtarları reddeder', () => {
    expect(isValidLicenseKey('MOS-9999-XXXX-0000')).toBe(false);
    expect(isValidLicenseKey('MOS-1234-ABCD-9998')).toBe(false);
    expect(isValidLicenseKey('MOS-1111-2222-3333')).toBe(false);
  });

  it('boş / biçimsiz girdiyi reddeder', () => {
    expect(isValidLicenseKey('')).toBe(false);
    expect(isValidLicenseKey('MOS-123')).toBe(false);
    expect(isValidLicenseKey('ABCD-1234-EFGH-9999')).toBe(false);
  });
});
