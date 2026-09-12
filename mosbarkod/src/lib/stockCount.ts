/**
 * Stok sayımı çekirdeği (saf, test edilebilir).
 *
 * Sayım sonucunu denetim iziyle birlikte hesaplar: her ürün için önceki/sonraki
 * stok ve fark; fire/zayi değer özeti (maliyet üzerinden). Uygulama bu
 * fonksiyonları kullanarak sayım oturumunu kaydeder ve stokları düzeltir.
 */

import { round2, type Product } from '../data';

export interface StockCountEntry {
  productId: string;
  name: string;
  unit: string;
  before: number;
  after: number;
  /** after - before */
  diff: number;
  /** fire/zayi değeri (maliyet veya satış fiyatı üzerinden) */
  value: number;
}

export interface StockCountSummary {
  plusCount: number;  // sayımı yüksek çıkan (fazla) ürün sayısı
  minusCount: number; // sayımı düşük çıkan (fire/zayi) ürün sayısı
  plusQty: number;
  minusQty: number;
  plusValue: number;  // pozitif fark değeri
  minusValue: number; // negatif fark değeri (mutlak)
  netValue: number;   // plusValue - minusValue
}

const parseCount = (v: string | number | undefined | null): number | null => {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  if (s === '') return null;
  const n = Number(s.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

const unitValue = (p: Product): number => (p.cost > 0 ? p.cost : p.p1);

/** Girilen sayımlardan fark kayıtları üretir (yalnızca değişenler). */
export function buildCountEntries(products: Product[], counts: Record<string, string | number | undefined>): StockCountEntry[] {
  const out: StockCountEntry[] = [];
  for (const p of products) {
    const after = parseCount(counts[p.id]);
    if (after === null) continue;
    const before = round2(p.stock);
    const diff = round2(after - before);
    if (diff === 0) continue;
    out.push({
      productId: p.id,
      name: p.name,
      unit: p.unit,
      before,
      after: round2(after),
      diff,
      value: round2(diff * unitValue(p)),
    });
  }
  return out;
}

export function summarizeCount(entries: StockCountEntry[]): StockCountSummary {
  let plusCount = 0, minusCount = 0, plusQty = 0, minusQty = 0, plusValue = 0, minusValue = 0;
  for (const e of entries) {
    if (e.diff > 0) {
      plusCount++;
      plusQty = round2(plusQty + e.diff);
      plusValue = round2(plusValue + e.value);
    } else if (e.diff < 0) {
      minusCount++;
      minusQty = round2(minusQty - e.diff);
      minusValue = round2(minusValue - e.value);
    }
  }
  return {
    plusCount,
    minusCount,
    plusQty,
    minusQty,
    plusValue,
    minusValue,
    netValue: round2(plusValue - minusValue),
  };
}

/** Sayımı stoklara uygular (girilmeyen ürünler aynen kalır). */
export function applyCountToProducts(products: Product[], counts: Record<string, string | number | undefined>): Product[] {
  return products.map((p) => {
    const after = parseCount(counts[p.id]);
    if (after === null) return p;
    return { ...p, stock: round2(after) };
  });
}
