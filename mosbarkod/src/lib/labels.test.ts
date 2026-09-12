import { describe, expect, it } from 'vitest';
import type { Product, Settings } from '../data';
import { isEan13Valid } from './barcode';
import { eanFor, encodeLabelBatch, labelAscii, tsplLabel, zplLabel } from './labels';

const product = (over: Partial<Product> = {}): Product => ({
  id: 'p1',
  name: 'Çay Filtre 100\'lü',
  barcode: '',
  category: 'Kahve & Çay',
  stock: 50,
  unit: 'kutu',
  p1: 12.5,
  p2: 13,
  p3: 14,
  cost: 6,
  critical: 5,
  ...over,
});

const settings = {
  label: {
    enabled: true,
    protocol: 'zpl' as const,
    connection: 'tcp' as const,
    ip: '192.168.1.50',
    port: 9100,
    widthMm: 40,
    heightMm: 25,
    density: 203 as const,
    copies: 1,
    showPrice: true,
  },
} as Settings;

describe('labelAscii (Türkçe ve kontrol karakter temizliği)', () => {
  it('Türkçe karakterleri ASCII\'ye çevirir', () => {
    expect(labelAscii('Şekerli Çay')).toBe('Sekerli Cay');
  });

  it('ZPL kontrol karakterlerini (^ ~ ") temizler', () => {
    expect(labelAscii('A^B~C"D')).toBe('A B C D');
  });
});

describe('eanFor (geçerli EAN-13 üretimi)', () => {
  it('mevcut 13 haneli barkodu aynen kullanır', () => {
    expect(eanFor(product({ barcode: '8690000000005' }))).toBe('8690000000005');
  });

  it('12 haneden kontrol basamağını tamamlar', () => {
    const ean = eanFor(product({ barcode: '869000000000' }));
    expect(ean).toBe('8690000000005');
    expect(isEan13Valid(ean)).toBe(true);
  });

  it('barkod yoksa deterministik geçerli EAN üretir', () => {
    const a = eanFor(product({ id: 'abc' }), 0);
    const b = eanFor(product({ id: 'abc' }), 0);
    expect(a).toBe(b);
    expect(isEan13Valid(a)).toBe(true);
    expect(a.startsWith('869')).toBe(true);
  });
});

describe('zplLabel', () => {
  const z = zplLabel(product({ barcode: '8690000000005' }), settings);

  it('ZPL sarmalayıcıları içerir', () => {
    expect(z).toContain('^XA');
    expect(z).toContain('^XZ');
    expect(z).toContain('^PW');
  });

  it('ürün adı, kategori, fiyat ve barkodu içerir', () => {
    expect(z).toContain('Cay Filtre 100'); // ç → c, ' → temizlendi
    expect(z).toContain('8690000000005');
    expect(z).toContain('12,50 TL');
    expect(z).toContain('^BC');
  });
});

describe('tsplLabel', () => {
  const t = tsplLabel(product({ barcode: '8690000000005' }), settings);

  it('TSPL komutlarını içerir', () => {
    expect(t).toContain('SIZE');
    expect(t).toContain('CLS');
    expect(t).toContain('BARCODE');
    expect(t).toContain('PRINT');
  });

  it('EAN13 barkod tipi ve fiyatı içerir', () => {
    expect(t).toContain('"EAN13"');
    expect(t).toContain('8690000000005');
    expect(t).toContain('12,50 TL');
  });
});

describe('encodeLabelBatch', () => {
  it('her ürün için bir etiket üretir', () => {
    const batch = encodeLabelBatch(
      [product({ barcode: '8690000000005' }), product({ barcode: '8690000000012' })],
      settings
    );
    expect(batch.split('^XA').length - 1).toBe(2);
    expect(batch).toContain('8690000000012');
  });

  it('tspl protokolünde PRINT satırı kadar ürün içerir', () => {
    const t = { ...settings, label: { ...settings.label, protocol: 'tspl' as const } } as Settings;
    const batch = encodeLabelBatch([product(), product()], t);
    expect(batch.split('PRINT').length - 1).toBe(2);
  });
});
