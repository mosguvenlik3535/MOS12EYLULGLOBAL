/**
 * Stok Zekâsı — ABC analizi, satış hızı ve "kaç gün yeter" kestirimi.
 *
 * Satış geçmişini ürün bazında toplayıp:
 *  - A/B/C sınıflandırması (cironun ~%80'ini yaratan ürünler A, %15'i B, kalan C)
 *  - günlük satış hızı (adet/gün)
 *  - mevcut stokla kaç gün idare edeceği
 * hesaplar. Eski kayıtlarda ürün kimliği olmadığından isim eşleşmesine düşer.
 */

import type { Product, Sale } from '../data';

export type AbcClass = 'A' | 'B' | 'C';

export interface AbcRow {
  product: Product;
  revenue: number;      // dönem cirosu (satış fiyatı üzerinden)
  qty: number;          // dönemde satılan adet
  sharePct: number;     // dönem cirosundaki pay (%)
  cumPct: number;       // kümülatif pay (%)
  cls: AbcClass;
  velocity: number;     // adet/gün
  daysLeft: number | null; // stok kaç gün yeter (hareket yoksa null)
  moving: boolean;      // dönemde satışı var mı
}

export interface StockIntel {
  rows: AbcRow[];
  totalRevenue: number;
  windowDays: number;
  movingCount: number;  // dönemde hareket gören ürün sayısı
  deadCount: number;    // stok>0 ama hareketsiz
  outRiskCount: number; // stok kritik altında veya tükenmiş
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const norm = (s: string) => s.toLocaleLowerCase('tr-TR').replace(/\s+/g, ' ').trim();

export function analyzeStock(products: Product[], sales: Sale[], days = 30): StockIntel {
  const now = Date.now();
  const cutoff = now - days * 86400000;
  const recent = sales.filter((s) => new Date(s.date).getTime() >= cutoff);

  const byId = new Map(products.map((p) => [p.id, p]));
  const byName = new Map(products.map((p) => [norm(p.name), p]));

  const rev = new Map<string, number>();
  const qty = new Map<string, number>();

  for (const sale of recent) {
    for (const it of sale.items) {
      const prod = (it.productId && byId.get(it.productId)) || byName.get(norm(it.name));
      if (!prod) continue;
      rev.set(prod.id, (rev.get(prod.id) ?? 0) + it.qty * it.unitPrice);
      qty.set(prod.id, (qty.get(prod.id) ?? 0) + it.qty);
    }
  }

  const rows: AbcRow[] = products.map((p) => {
    const revenue = round2(rev.get(p.id) ?? 0);
    const sold = qty.get(p.id) ?? 0;
    const velocity = sold / days;
    return {
      product: p,
      revenue,
      qty: sold,
      sharePct: 0,
      cumPct: 0,
      cls: 'C' as AbcClass,
      velocity,
      daysLeft: velocity > 0 ? Math.floor(p.stock / velocity) : p.stock > 0 ? null : 0,
      moving: sold > 0,
    };
  });

  const totalRevenue = round2(rows.reduce((s, r) => s + r.revenue, 0));

  // Ciroya göre azalan sırala, yalnızca hareketli ürünlerde kümülatif ABC uygula
  const sorted = [...rows].sort((a, b) => b.revenue - a.revenue || a.product.name.localeCompare(b.product.name));
  let cum = 0;
  for (const r of sorted) {
    if (r.revenue <= 0) {
      r.cls = 'C';
      continue;
    }
    r.sharePct = totalRevenue > 0 ? (r.revenue / totalRevenue) * 100 : 0;
    cum += r.sharePct;
    r.cumPct = cum;
    r.cls = cum <= 80 ? 'A' : cum <= 95 ? 'B' : 'C';
  }

  return {
    rows: sorted,
    totalRevenue,
    windowDays: days,
    movingCount: rows.filter((r) => r.moving).length,
    deadCount: rows.filter((r) => !r.moving && r.product.stock > 0).length,
    outRiskCount: rows.filter((r) => r.product.stock <= r.product.critical).length,
  };
}

export const ABC_META: Record<AbcClass, { label: string; chip: string; dot: string; desc: string }> = {
  A: { label: 'A', chip: 'bg-mint/10 text-mint border-mint/30', dot: '#2fd6a5', desc: 'Cironun ~%80’ini yaratan kritik ürünler' },
  B: { label: 'B', chip: 'bg-amber/10 text-amber2 border-amber/30', dot: '#f5b545', desc: 'Cironun ~%15’i — orta öncelik' },
  C: { label: 'C', chip: 'bg-panel3 text-mut border-line2', dot: '#8b95a3', desc: 'Kalan ~%5 — düşük hareket / atıl riski' },
};
