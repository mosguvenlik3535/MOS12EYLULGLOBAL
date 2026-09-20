import { describe, expect, it } from 'vitest';
import type { Product } from '../data';
import { applyCountToProducts, buildCountEntries, summarizeCount } from './stockCount';

const product = (id: string, name: string, stock: number, cost = 5): Product => ({
  id,
  name,
  barcode: '8690000000005',
  category: 'İçecek',
  stock,
  unit: 'adet',
  p1: 10,
  p2: 12,
  p3: 14,
  cost,
  critical: 3,
});

describe('buildCountEntries (fark kayıtları)', () => {
  it('yalnızca değişen ürünleri kaydeder', () => {
    const products = [product('p1', 'Su', 100), product('p2', 'Çay', 50)];
    const entries = buildCountEntries(products, { p1: '90', p2: '50' });
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ productId: 'p1', before: 100, after: 90, diff: -10 });
  });

  it('virgüllü ve boş girdileri doğru işler', () => {
    const entries = buildCountEntries([product('p1', 'Su', 10)], { p1: '12,5' });
    expect(entries[0]).toMatchObject({ after: 12.5, diff: 2.5 });

    expect(buildCountEntries([product('p1', 'Su', 10)], { p1: '' })).toHaveLength(0);
    expect(buildCountEntries([product('p1', 'Su', 10)], { p1: 'abc' })).toHaveLength(0);
  });

  it('fire/zayi değerini maliyet üzerinden hesaplar', () => {
    const entries = buildCountEntries([product('p1', 'Su', 100, 5)], { p1: '90' });
    expect(entries[0].value).toBe(-50); // -10 * 5
  });

  it('maliyet girilmemişse satış fiyatı kullanılır', () => {
    const entries = buildCountEntries([product('p1', 'Su', 100, 0)], { p1: '90' });
    expect(entries[0].value).toBe(-100); // -10 * 10 (p1)
  });
});

describe('summarizeCount (özet)', () => {
  it('fazla + fire toplamlarını ayırır', () => {
    const products = [product('p1', 'Su', 100, 5), product('p2', 'Çay', 50, 5), product('p3', 'Kola', 30, 5)];
    const entries = buildCountEntries(products, { p1: '90', p2: '55', p3: '30' });
    const s = summarizeCount(entries);
    expect(s.minusCount).toBe(1);
    expect(s.plusCount).toBe(1);
    expect(s.minusQty).toBe(10);
    expect(s.plusQty).toBe(5);
    expect(s.minusValue).toBe(50);
    expect(s.plusValue).toBe(25);
    expect(s.netValue).toBe(-25);
  });

  it('boş giriş için sıfır döner', () => {
    expect(summarizeCount([])).toEqual({
      plusCount: 0, minusCount: 0, plusQty: 0, minusQty: 0, plusValue: 0, minusValue: 0, netValue: 0,
    });
  });
});

describe('applyCountToProducts (stok düzeltme)', () => {
  it('sayılan ürünlerin stokunu günceller, diğerlerini korur', () => {
    const products = [product('p1', 'Su', 100), product('p2', 'Çay', 50)];
    const next = applyCountToProducts(products, { p1: '88.5' });
    expect(next.find((p) => p.id === 'p1')!.stock).toBe(88.5);
    expect(next.find((p) => p.id === 'p2')!.stock).toBe(50);
  });

  it('kesirli sayımı 2 ondalığa yuvarlar', () => {
    const next = applyCountToProducts([product('p1', 'Su', 10.555)], { p1: '3.333' });
    expect(next[0].stock).toBe(3.33);
  });
});
