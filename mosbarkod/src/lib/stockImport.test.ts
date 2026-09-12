import { describe, expect, it } from 'vitest';
import type { Product } from '../data';
import {
  buildImportRows,
  detectPreset,
  guessColumns,
  parseCsvText,
  toNum,
  PROGRAM_PRESETS,
} from './stockImport';

const existing = (): Product[] => [
  {
    id: 'p1', name: 'Su 0.5L', barcode: '8690000000005', category: 'İçecek', stock: 40,
    unit: 'adet', p1: 5, p2: 5, p3: 5, cost: 2, critical: 5,
  },
];

describe('toNum (Türkçe sayı çözümleme)', () => {
  it('nokta binlik + virgül ondalık', () => {
    expect(toNum('1.234,56')).toBe(1234.56);
    expect(toNum('12,5')).toBe(12.5);
  });

  it('nokta ondalık', () => {
    expect(toNum('1234.56')).toBe(1234.56);
  });

  it('para birimi ve boşlukları temizler', () => {
    expect(toNum('₺ 45,00')).toBe(45);
    expect(toNum('')).toBe(0);
  });

  it('sayı zaten number ise aynen', () => {
    expect(toNum(7)).toBe(7);
  });
});

describe('parseCsvText (ayraç tespiti + tırnak + BOM)', () => {
  it('noktalı virgül ayracı', () => {
    const rows = parseCsvText('Barkod;Ürün Adı;Stok\n8690000000005;Su;40');
    expect(rows).toHaveLength(2);
    expect(rows[1]).toEqual(['8690000000005', 'Su', '40']);
  });

  it('virgül ayracı ve tırnak toleransı', () => {
    const rows = parseCsvText('Barkod,Ürün Adı,Stok\n8690000000005,"Su, Soda",40');
    expect(rows[1]).toEqual(['8690000000005', 'Su, Soda', '40']);
  });

  it('tab ayracı', () => {
    const rows = parseCsvText('Barkod\tÜrün Adı\tStok\n8690000000005\tSu\t40');
    expect(rows[1]).toEqual(['8690000000005', 'Su', '40']);
  });

  it('BOM ve boş satırları temizler', () => {
    const rows = parseCsvText('\uFEFFBarkod;Ürün Adı\n\n8690000000005;Su\n');
    expect(rows).toHaveLength(2);
    expect(rows[0][0]).toBe('Barkod');
  });
});

describe('guessColumns (otomatik sütun eşleme)', () => {
  it('genel Türkçe başlıkları eşler', () => {
    const m = guessColumns(['Barkod', 'Ürün Adı', 'Kategori', 'Birim', 'Stok', 'Alış', 'F1', 'F2', 'F3', 'Kritik', 'SKT']);
    expect(m.barcode).toBe(0);
    expect(m.name).toBe(1);
    expect(m.category).toBe(2);
    expect(m.unit).toBe(3);
    expect(m.stock).toBe(4);
    expect(m.cost).toBe(5);
    expect(m.p1).toBe(6);
    expect(m.p2).toBe(7);
    expect(m.p3).toBe(8);
    expect(m.critical).toBe(9);
    expect(m.expiry).toBe(10);
  });

  it('Mikro benzeri başlıkları eşler', () => {
    const m = guessColumns(['Ürün Kodu', 'Ürün Adı', 'Birimi', 'Mevcut Stok', 'Alış Fiyatı', 'Satış Fiyatı']);
    expect(m.barcode).toBe(0);
    expect(m.name).toBe(1);
    expect(m.unit).toBe(2);
    expect(m.stock).toBe(3);
    expect(m.cost).toBe(4);
    expect(m.p1).toBe(5);
  });

  it('aynı sütunu iki alana atamaz (Satış Fiyatı → p1, Toptan → p2)', () => {
    const m = guessColumns(['Ürün', 'Satış Fiyatı', 'Toptan']);
    expect(m.p1).toBe(1);
    expect(m.p2).toBe(2);
  });

  it('bulunamayan alan -1 olur', () => {
    const m = guessColumns(['Ürün Adı']);
    expect(m.name).toBe(0);
    expect(m.stock).toBe(-1);
    expect(m.expiry).toBe(-1);
  });
});

describe('detectPreset (program şablonu tanıma)', () => {
  it('Mikro şablonunu tanır', () => {
    expect(detectPreset(['Ürün Kodu', 'Ürün Adı', 'Mevcut Stok', 'Satış Fiyatı'])).toBe('mikro');
  });

  it('Paraşüt şablonunu tanır', () => {
    expect(detectPreset(['Ürün Adı', 'Stok Adedi', 'Satış Fiyatı', 'Alış Fiyatı'])).toBe('parasut');
  });

  it('İngilizce SAP şablonunu tanır', () => {
    expect(detectPreset(['Material', 'Description', 'Barcode', 'Stock', 'Price'])).toBe('english');
  });

  it('bilinmeyen başlıkta generic döner', () => {
    expect(detectPreset(['a', 'b', 'c'])).toBe('generic');
  });

  it('tüm presetlerin id ve adı var', () => {
    for (const p of PROGRAM_PRESETS) {
      expect(p.id).toBeTruthy();
      expect(p.name).toBeTruthy();
    }
  });
});

describe('buildImportRows (ürün dönüşümü)', () => {
  const mapping = guessColumns(['Barkod', 'Ürün Adı', 'Stok', 'Alış', 'F1']);

  it('yeni ürün ekler', () => {
    const r = buildImportRows(
      [['Barkod', 'Ürün Adı', 'Stok', 'Alış', 'F1'], ['8690000000012', 'Çay', '50', '4', '12.5']],
      { existing: existing(), mapping, criticalDefault: 5 }
    );
    expect(r.added).toBe(1);
    expect(r.updated).toBe(0);
    expect(r.products).toHaveLength(2);
    expect(r.products[1]).toMatchObject({ name: 'Çay', stock: 50, p1: 12.5 });
  });

  it('mevcut ürünü barkoda göre günceller (çoğaltmaz)', () => {
    const r = buildImportRows(
      [['Barkod', 'Ürün Adı', 'Stok', 'Alış', 'F1'], ['8690000000005', 'Su 0.5L', '99', '2', '6']],
      { existing: existing(), mapping, criticalDefault: 5 }
    );
    expect(r.added).toBe(0);
    expect(r.updated).toBe(1);
    expect(r.products).toHaveLength(1);
    expect(r.products[0].stock).toBe(99);
    expect(r.products[0].p1).toBe(6);
  });

  it('barkodsuz satırı ada göre eşleştirir', () => {
    const m = guessColumns(['Ürün Adı', 'Stok']);
    const r = buildImportRows(
      [['Ürün Adı', 'Stok'], ['su 0.5l', '77']],
      { existing: existing(), mapping: m, criticalDefault: 5 }
    );
    expect(r.updated).toBe(1);
    expect(r.products[0].stock).toBe(77);
  });

  it('eşlenmemiş sütunlar mevcut ürünün değerini ezmez', () => {
    const m = guessColumns(['Barkod', 'Ürün Adı']); // stok/fiyat sütunu YOK
    const r = buildImportRows(
      [['Barkod', 'Ürün Adı'], ['8690000000005', 'Su 0.5L']],
      { existing: existing(), mapping: m, criticalDefault: 5 }
    );
    expect(r.updated).toBe(1);
    expect(r.products[0].stock).toBe(40);
    expect(r.products[0].cost).toBe(2);
    expect(r.products[0].p1).toBe(5);
    expect(r.products[0].category).toBe('İçecek');
    expect(r.products[0].unit).toBe('adet');
    expect(r.products[0].critical).toBe(5);
  });

  it('eşlenmiş sütun mevcut ürünü günceller', () => {
    const m = guessColumns(['Barkod', 'Ürün Adı', 'Stok']);
    const r = buildImportRows(
      [['Barkod', 'Ürün Adı', 'Stok'], ['8690000000005', 'Su 0.5L', '3']],
      { existing: existing(), mapping: m, criticalDefault: 5 }
    );
    expect(r.products[0].stock).toBe(3);
    expect(r.products[0].cost).toBe(2); // eşlenmemiş → korunur
  });

  it('ad ve barkodu boş satırları atlar', () => {
    const r = buildImportRows(
      [['Barkod', 'Ürün Adı', 'Stok'], ['', '', '50'], ['8690000000012', 'Çay', '50']],
      { existing: existing(), mapping: guessColumns(['Barkod', 'Ürün Adı', 'Stok']), criticalDefault: 5 }
    );
    expect(r.skipped).toBe(1);
    expect(r.added).toBe(1);
  });
});
