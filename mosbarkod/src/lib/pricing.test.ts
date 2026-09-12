import { describe, expect, it } from 'vitest';
import {
  PRICE_MODES,
  priceOf,
  round2,
  lineNet,
  type CartLine,
  type Product,
  type Settings,
} from '../data';
import {
  applyDiscount,
  computeChange,
  discountAmount,
  lineTotal,
  splitCashPos,
} from './pricing';

const settings = {} as Settings;

const product = (over: Partial<Product> = {}): Product => ({
  id: 'p1',
  name: 'Test Ürün',
  barcode: '8690000000000',
  category: 'İçecek',
  stock: 100,
  unit: 'adet',
  p1: 10,
  p2: 12,
  p3: 14,
  cost: 6,
  critical: 5,
  ...over,
});

describe('round2 (para yuvarlama)', () => {
  it('2 ondalık basamağa yuvarlar', () => {
    expect(round2(1.234)).toBe(1.23);
    expect(round2(3.4567)).toBe(3.46);
    expect(round2(19.999)).toBe(20);
  });

  it('kayan nokta hatalarını giderir (0.1 + 0.2)', () => {
    expect(round2(0.1 + 0.2)).toBe(0.3);
  });

  it('negatif değerleri doğru yuvarlar', () => {
    expect(round2(-1.234)).toBe(-1.23);
  });
});

describe('lineNet (sepet satırı net tutar)', () => {
  const line = (over: Partial<CartLine> = {}): CartLine => ({
    id: 'l1',
    productId: 'p1',
    name: 'Test Ürün',
    unit: 'adet',
    unitPrice: 12.5,
    qty: 3,
    level: 'f1',
    mode: 'f1',
    p1: 10,
    p2: 12,
    p3: 14,
    lineDiscount: 0,
    ...over,
  });

  it('miktar x birim fiyat hesaplar', () => {
    expect(lineNet(line({ unitPrice: 12.5, qty: 3 }))).toBe(37.5);
  });

  it('satır indirimini uygular', () => {
    expect(lineNet(line({ unitPrice: 100, qty: 1, lineDiscount: 10 }))).toBe(90);
  });
});

describe('priceOf / PRICE_MODES', () => {
  it('f1/f2/f3 sırasıyla p1/p2/p3 döndürür', () => {
    const p = product();
    expect(priceOf(p, 'f1', settings)).toBe(10);
    expect(priceOf(p, 'f2', settings)).toBe(12);
    expect(priceOf(p, 'f3', settings)).toBe(14);
  });

  it('kkart fiyatı F1 ile aynıdır', () => {
    expect(priceOf(product(), 'kkart', settings)).toBe(10);
  });

  it('taksit fiyatı karttaki installment ise onu, yoksa F1 kullanır', () => {
    expect(priceOf(product({ installment: 25 }), 'taksit', settings)).toBe(25);
    expect(priceOf(product({ installment: 0 }), 'taksit', settings)).toBe(10);
  });

  it('tüm modlar tanımlıdır', () => {
    expect(PRICE_MODES.map((m) => m.id).sort()).toEqual(['f1', 'f2', 'f3', 'kkart', 'taksit']);
  });
});

describe('indirim (discount)', () => {
  it('indirim tutarını yüzde üzerinden hesaplar', () => {
    expect(discountAmount(1000, 10)).toBe(100);
    expect(discountAmount(250.5, 8)).toBe(20.04);
  });

  it('%0 indirim toplamı değiştirmez', () => {
    expect(applyDiscount(500, 0)).toEqual({ discAmt: 0, total: 500 });
  });

  it('indirimli toplam = ara toplam - indirim', () => {
    expect(applyDiscount(1000, 10)).toEqual({ discAmt: 100, total: 900 });
  });

  it('kayan noktayı yuvarlayarak tutar tutarlılığı sağlar', () => {
    const r = applyDiscount(19.99, 10);
    expect(r.total).toBe(round2(19.99 - r.discAmt));
    expect(r.discAmt).toBe(2);
  });
});

describe('para üstü (change)', () => {
  it('alınan - toplam hesaplar', () => {
    expect(computeChange(100, 75.5)).toBe(24.5);
  });

  it('eksik ödemede negatif döner', () => {
    expect(computeChange(50, 75.5)).toBe(-25.5);
  });

  it('tam ödemede 0 döner', () => {
    expect(computeChange(75.5, 75.5)).toBe(0);
  });
});

describe('nakit + POS bölüştürme', () => {
  it('kalan tutarı POS tarafına yazar', () => {
    expect(splitCashPos(100, 40)).toEqual({ cash: 40, pos: 60 });
  });

  it('tamamı nakit ödenirse POS 0 olur', () => {
    expect(splitCashPos(100, 100)).toEqual({ cash: 100, pos: 0 });
  });

  it('hiç nakit ödenmezse tümü POS olur', () => {
    expect(splitCashPos(100, 0)).toEqual({ cash: 0, pos: 100 });
  });
});

describe('lineTotal (saf satır toplamı)', () => {
  it('indirimsiz satır toplamı', () => {
    expect(lineTotal(12.5, 3)).toBe(37.5);
  });

  it('satır indirimiyle', () => {
    expect(lineTotal(10, 2, 10)).toBe(18);
  });
});
