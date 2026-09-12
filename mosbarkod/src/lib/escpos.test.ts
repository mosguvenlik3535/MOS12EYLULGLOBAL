import { describe, expect, it } from 'vitest';
import type { Sale, Settings } from '../data';
import { buildReceipt, bytesToBase64, padRow, toAscii, wrap } from './escpos';

const sale: Sale = {
  id: 's1',
  no: 'F-2026-0001',
  date: '2026-09-12T10:30:00.000Z',
  register: 1,
  cashier: 'Admin',
  mode: 'f1',
  items: [{ name: 'Su 0.5L', qty: 3, unit: 'adet', unitPrice: 7.5 }],
  subtotal: 22.5,
  discountPct: 0,
  discountAmt: 0,
  total: 22.5,
  method: 'nakit',
  received: 25,
  change: 2.5,
  cash: 22.5,
  pos: 0,
};

const settings = {
  storeName: 'MOS BARKOD',
  receiptHeader: 'Yapay Zeka Destekli Satış',
  address: 'İzmir',
  phone: '0232 000 00 00',
  receiptFooter: 'Bizi tercih ettiğiniz için teşekkürler',
} as Settings;

describe('toAscii (Türkçe karakter dönüşümü)', () => {
  it('Türkçe karakterleri ASCII\'ye çevirir', () => {
    expect(toAscii('Şekerli Çay')).toBe('Sekerli Cay');
    expect(toAscii('ğüşiöç ĞÜŞİÖÇ')).toBe('gusioc GUSIOC');
  });

  it('ASCII metni değiştirmez', () => {
    expect(toAscii('Merhaba 123')).toBe('Merhaba 123');
  });
});

describe('padRow / wrap', () => {
  it('satırı sabit genişliğe tamamlar', () => {
    expect(padRow('ARA TOPLAM', '22,50 TL', 32)).toHaveLength(32);
  });

  it('uzun metni kelime sınırından sarar', () => {
    const lines = wrap('MOSBARKODYAZILIM SATIS PROGRAMI');
    expect(lines.length).toBeGreaterThanOrEqual(1);
    for (const l of lines) expect(l.length).toBeLessThanOrEqual(32);
  });
});

describe('buildReceipt (ESC/POS bayt üretimi)', () => {
  const bytes = buildReceipt(sale, settings);

  it('başlangıç komutu ile başlar (ESC @)', () => {
    expect(bytes[0]).toBe(0x1b);
    expect(bytes[1]).toBe(0x40);
  });

  it('kesme komutu içerir (GS V B)', () => {
    const joined = Array.from(bytes).join(',');
    expect(joined).toContain('29,86,66,0');
  });

  it('işyeri adı, tutar ve yöntem basılır', () => {
    const ascii = Array.from(bytes)
      .map((b) => String.fromCharCode(b))
      .join('');
    expect(ascii).toContain('MOS BARKOD');
    expect(ascii).toContain('ODENEN');
    expect(ascii).toContain('NAKIT'); // yöntem etiketi
    expect(ascii).toContain('22,50');
  });

  it('Türkçe karakterler ASCII olarak basılır (ş → s)', () => {
    const ascii = Array.from(bytes)
      .map((b) => String.fromCharCode(b))
      .join('');
    expect(ascii).toContain('Satis');
    expect(ascii).not.toContain('ş');
  });
});

describe('bytesToBase64', () => {
  it('bayt dizisini base64 olarak kodlar', () => {
    const bytes = buildReceipt(sale, settings);
    const b64 = bytesToBase64(bytes);
    expect(typeof b64).toBe('string');
    expect(b64.length).toBeGreaterThan(0);
    // başlangıç komutu (0x1b 0x40) base64'te 'G0A' ile başlar
    expect(b64.startsWith('G0A')).toBe(true);
  });
});
