import { describe, expect, it } from 'vitest';
import type { Product } from '../data';
import {
  COUNTRY_VAT_PROFILES,
  getCountryVatName,
  getCountryVatProfile,
  getCountryVatRates,
  resolveProductVatRate,
  suggestCountryVat,
} from './countryVat';

const product = (name: string, category: string, vatRate?: number): Product => ({
  id: 'p1',
  name,
  barcode: '8690000000000',
  category,
  stock: 10,
  unit: 'adet',
  p1: 10,
  p2: 12,
  p3: 14,
  cost: 6,
  critical: 2,
  vatRate,
});

describe('ülke KDV profilleri', () => {
  it('Türkiye profili doğru oranları içerir', () => {
    const tr = getCountryVatProfile('tr');
    expect(tr.vatName).toBe('KDV');
    expect(tr.defaultRate).toBe(20);
    expect(tr.rates).toEqual([0, 1, 10, 18, 20]);
  });

  it('ülkeye göre farklı oran listeleri döner', () => {
    expect(getCountryVatRates('en')).toEqual([0, 5, 20]);
    expect(getCountryVatRates('de')).toEqual([0, 7, 19]);
  });

  it('ülke isimleri (KDV/VAT/IVA/MwSt.) doğru gelir', () => {
    expect(getCountryVatName('tr')).toBe('KDV');
    expect(getCountryVatName('en')).toBe('VAT');
    expect(getCountryVatName('es')).toBe('IVA');
    expect(getCountryVatName('de')).toBe('MwSt.');
  });

  it('bilinmeyen ülke Türkiye profiline düşer', () => {
    expect(getCountryVatProfile('xx' as never).locale).toBe('tr');
    expect(getCountryVatRates('xx' as never)).toEqual([0, 1, 10, 18, 20]);
  });

  it('tüm profillerin varsayılan oranı geçerli listesindedir', () => {
    for (const prof of Object.values(COUNTRY_VAT_PROFILES)) {
      expect(prof.rates).toContain(prof.defaultRate);
    }
  });
});

describe('kategori bazlı KDV önerisi (suggestCountryVat)', () => {
  it('kuru yemiş Türkiye\'de %1 KDV alır', () => {
    expect(suggestCountryVat('Kuru Yemiş', 'tr')).toBe(1);
  });

  it('bira Türkiye\'de %20 KDV alır', () => {
    expect(suggestCountryVat('Bira', 'tr')).toBe(20);
  });

  it('bilinmeyen kategori varsayılan oranı kullanır', () => {
    expect(suggestCountryVat('', 'tr')).toBe(20);
    expect(suggestCountryVat('Elektronik', 'en')).toBe(20);
  });

  it('İngiltere\'de kuru yemiş %0, içecek %20 alır', () => {
    expect(suggestCountryVat('Kuru Yemiş', 'en')).toBe(0);
    expect(suggestCountryVat('Meşrubat', 'en')).toBe(20);
  });

  it('önerilen oran her zaman ülkenin geçerli listesinde kalır', () => {
    for (const locale of ['tr', 'en', 'es', 'de', 'fr'] as const) {
      const rate = suggestCountryVat('Sigara', locale);
      expect(getCountryVatRates(locale)).toContain(rate);
    }
  });
});

describe('ürün KDV çözümleme (resolveProductVatRate)', () => {
  it('ürün kartındaki geçerli oranı kullanır', () => {
    const p = product('Su', 'İçecek', 10);
    expect(resolveProductVatRate('Su', [p], 'tr')).toBe(10);
  });

  it('ülkede geçersiz oranı reddedip kategoriye düşer', () => {
    // 8 Türkiye'de geçerli bir oran değil → kategori (kuru yemiş = %1) kullanılır
    const p = product('Fındık', 'Kuru Yemiş', 8);
    expect(resolveProductVatRate('Fındık', [p], 'tr')).toBe(1);
  });

  it('ürün yoksa ülkenin varsayılan oranını döner', () => {
    expect(resolveProductVatRate('Bilinmeyen', [], 'tr')).toBe(20);
    expect(resolveProductVatRate('Bilinmeyen', [], 'de')).toBe(19);
  });
});
