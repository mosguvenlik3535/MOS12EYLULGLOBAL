/**
 * Stok içe aktarma çekirdeği (saf, test edilebilir).
 *
 * Farklı programların (Mikro, Logo, Paraşüt, Nebim, Zirve, İngilizce SAP vb.)
 * dışa aktardığı Excel/CSV şablonlarını sütun başlıklarından tanır, alanlara
 * eşler ve MOSBARKOD ürün kayıtlarına dönüştürür. Sütun eşleme hem otomatik
 * hem elle yapılabilir.
 */

import { CATEGORIES, uid, type Product } from '../data';

export type FieldKey =
  | 'barcode'
  | 'name'
  | 'brand'
  | 'gram'
  | 'category'
  | 'unit'
  | 'stock'
  | 'cost'
  | 'p1'
  | 'p2'
  | 'p3'
  | 'critical'
  | 'expiry';

export interface ImportFieldDef {
  key: FieldKey;
  label: string;
  required?: boolean;
}

export const IMPORT_FIELDS: ImportFieldDef[] = [
  { key: 'name', label: 'Ürün Adı', required: true },
  { key: 'barcode', label: 'Barkod' },
  { key: 'brand', label: 'Marka' },
  { key: 'gram', label: 'Gramaj / Boyut' },
  { key: 'category', label: 'Kategori' },
  { key: 'unit', label: 'Birim' },
  { key: 'stock', label: 'Stok' },
  { key: 'cost', label: 'Alış (Maliyet)' },
  { key: 'p1', label: 'Fiyat 1 (F1)' },
  { key: 'p2', label: 'Fiyat 2 (F2)' },
  { key: 'p3', label: 'Fiyat 3 (F3)' },
  { key: 'critical', label: 'Kritik Stok' },
  { key: 'expiry', label: 'SKT' },
];

export type FieldPatterns = Partial<Record<FieldKey, string[]>>;

export interface ProgramPreset {
  id: string;
  name: string;
  hint: string;
  /** Bu programı ayırt eden başlık imzaları */
  signatures: string[];
  /** Alana özel başlık anahtar kelimeleri (genel sözlüğün üzerine yazılır) */
  patterns: FieldPatterns;
}

/* Genel sözlük — bilinmeyen şablonlar için yedek */
const GENERIC_PATTERNS: FieldPatterns = {
  barcode: ['barkod', 'barcode', 'ean', 'gtin', 'ürün kodu', 'urun kodu', 'stok kodu', 'malzeme no', 'malzeme kodu'],
  name: ['ürün adı', 'urun adi', 'ürün adi', 'ürün', 'urun', 'malzeme adı', 'açıklama', 'aciklama', 'description', 'tanım', 'tanim', 'product name', 'stok adı', 'adı'],
  brand: ['marka', 'brand', 'üretici', 'uretici'],
  gram: ['gramaj', 'gram', 'boyut', 'hacim', 'ağırlık', 'agirlik', 'size', 'ebat', 'ölçü'],
  category: ['kategori', 'category', 'grup adı', 'grup', 'sınıf', 'sinif', 'rehber', 'ana grup', 'department'],
  unit: ['birim', 'unit', 'birimi'],
  stock: ['stok adedi', 'stok miktarı', 'mevcut stok', 'stok', 'stock', 'mevcut', 'bakiye', 'miktar', 'quantity', 'devreden', 'devir'],
  cost: ['alış fiyatı', 'alis fiyati', 'alış', 'alis', 'maliyet', 'cost', 'alım', 'alim'],
  p1: ['fiyat 1', 'f1', 'satış fiyatı', 'satis fiyati', 'satış', 'satis', 'perakende', 'liste fiyat', 'price', 'birim fiyat'],
  p2: ['fiyat 2', 'f2', 'toptan'],
  p3: ['fiyat 3', 'f3', 'bayi', 'kampanya'],
  critical: ['kritik', 'critical', 'min stok', 'asgari', 'minimum', 'emin'],
  expiry: ['skt', 'son kullanma', 'son kullanım', 'son kullanim', 'expiry', 'expiration', 'miad', 'miat'],
};

export const PROGRAM_PRESETS: ProgramPreset[] = [
  {
    id: 'generic',
    name: 'Otomatik / Genel',
    hint: 'Başlıkları kendisi tanır (çoğu program için uygun)',
    signatures: [],
    patterns: {},
  },
  {
    id: 'mikro',
    name: 'Mikro Yazılım',
    hint: 'Mikro stok/cari dışa aktarımı (Ürün Kodu, Mevcut Stok, Satış Fiyatı…)',
    signatures: ['ürün kodu', 'mevcut stok', 'cari', 'stok miktarı'],
    patterns: {
      barcode: ['barkodu', 'ürün kodu', 'stok kodu'],
      name: ['ürün adı', 'ürün adi', 'malzeme adı'],
      unit: ['birimi', 'birim'],
      stock: ['mevcut stok', 'stok miktarı', 'devreden stok', 'devir'],
      cost: ['alış fiyatı', 'alis fiyati', 'maliyet'],
      p1: ['satış fiyatı', 'satis fiyati', 'perakende fiyat', 'fiyat'],
      category: ['grup', 'kategori', 'rehber'],
    },
  },
  {
    id: 'logo',
    name: 'Logo (Tiger/Go)',
    hint: 'Logo büyük harfli dışa aktarım (KOD, AÇIKLAMA, BİRİM, STOK…)',
    signatures: ['açıklama', 'kodu', 'birim'],
    patterns: {
      barcode: ['barkod', 'kod'],
      name: ['açıklama', 'aciklama', 'tanım', 'tanim'],
      unit: ['birim', 'birimi'],
      stock: ['stok', 'miktar'],
      cost: ['alış', 'alis', 'maliyet'],
      p1: ['satış', 'satis', 'fiyat'],
      category: ['grup', 'kategori'],
    },
  },
  {
    id: 'parasut',
    name: 'Paraşüt',
    hint: 'Paraşüt ürün dışa aktarımı (Ürün Adı, Stok Adedi, Satış Fiyatı…)',
    signatures: ['stok adedi', 'satış fiyatı', 'alış fiyatı'],
    patterns: {
      barcode: ['barkod', 'kod'],
      name: ['ürün adı', 'ürün adi', 'adı'],
      unit: ['birim', 'birimi'],
      stock: ['stok adedi', 'stok', 'miktar'],
      cost: ['alış fiyatı', 'alis fiyati', 'maliyet'],
      p1: ['satış fiyatı', 'satis fiyati', 'perakende', 'fiyat'],
      category: ['kategori', 'grup'],
    },
  },
  {
    id: 'nebim',
    name: 'Nebim V3',
    hint: 'Nebim dışa aktarımı (Barkod No, Ürün Adı, Grup Adı…)',
    signatures: ['barkod no', 'grup adı', 'ürün adı'],
    patterns: {
      barcode: ['barkod no', 'barkod', 'ürün kodu'],
      name: ['ürün adı', 'ürün adi', 'ürün'],
      unit: ['birim', 'birimi'],
      stock: ['stok', 'mevcut', 'miktar'],
      cost: ['alış', 'alis', 'maliyet'],
      p1: ['satış', 'satis', 'fiyat'],
      category: ['grup adı', 'grup', 'kategori'],
    },
  },
  {
    id: 'zirve',
    name: 'Zirve',
    hint: 'Zirve stok dışa aktarımı (Ürün Kodu, Açıklama, Grup…)',
    signatures: ['ürün kodu', 'açıklama', 'grup'],
    patterns: {
      barcode: ['barkod', 'ürün kodu', 'kod'],
      name: ['açıklama', 'aciklama', 'ürün adı', 'tanım'],
      unit: ['birim', 'birimi'],
      stock: ['stok', 'miktar', 'mevcut'],
      cost: ['alış', 'alis', 'maliyet'],
      p1: ['satış', 'satis', 'fiyat'],
      category: ['grup', 'kategori'],
    },
  },
  {
    id: 'english',
    name: 'İngilizce (SAP vb.)',
    hint: 'Material, Description, Barcode, Stock, Cost, Price başlıklı şablonlar',
    signatures: ['material', 'description', 'barcode', 'stock', 'price'],
    patterns: {
      barcode: ['barcode', 'material', 'ean', 'gtin'],
      name: ['description', 'material', 'product', 'item'],
      brand: ['brand', 'manufacturer'],
      unit: ['unit', 'uom'],
      stock: ['stock', 'quantity', 'qty', 'on hand'],
      cost: ['cost', 'purchase'],
      p1: ['price', 'retail', 'sale'],
      category: ['category', 'group', 'department'],
    },
  },
];

/* ---------- normalizasyon ---------- */

const normHeader = (s: string): string =>
  s
    .toLocaleLowerCase('tr-TR')
    .replace(/[ıİ]/g, (c) => (c === 'ı' ? 'i' : 'i'))
    .replace(/[çÇ]/g, (c) => (c === 'ç' ? 'c' : 'c'))
    .replace(/[ğĞ]/g, 'g')
    .replace(/[şŞ]/g, 's')
    .replace(/[öÖ]/g, 'o')
    .replace(/[üÜ]/g, 'u')
    .replace(/[âÂ]/g, 'a')
    .trim();

/* ---------- sayı / metin yardımcıları ---------- */

/** Türkçe sayı: "1.234,56" / "12,5" / "1234.56" → 1234.56 */
export const toNum = (v: unknown): number => {
  if (typeof v === 'number') return isFinite(v) ? v : 0;
  let s = String(v ?? '').trim().replace(/[₺$€\s]/g, '');
  if (!s) return 0;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  const n = Number(s);
  return isFinite(n) ? n : 0;
};

/* ---------- CSV ayrıştırma ---------- */

/** CSV metni → satırlar (ayraç tespiti + tırnak toleransı + BOM/UTF-16) */
export const parseCsvText = (text: string): (string | number)[][] => {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim() !== '');
  if (lines.length === 0) return [];
  const semi = (lines[0].match(/;/g) ?? []).length;
  const comma = (lines[0].match(/,/g) ?? []).length;
  const tab = (lines[0].match(/\t/g) ?? []).length;
  const sep = tab > semi && tab > comma ? '\t' : semi >= comma ? ';' : ',';
  const parseLine = (str: string): string[] => {
    const res: string[] = [];
    let cur = '';
    let inside = false;
    for (let i = 0; i < str.length; i++) {
      const ch = str[i];
      if (ch === '"') inside = !inside;
      else if (ch === sep && !inside) {
        res.push(cur.trim());
        cur = '';
      } else cur += ch;
    }
    res.push(cur.trim());
    return res;
  };
  return lines.map(parseLine);
};

/* ---------- sütun eşleme ---------- */

const emptyMapping = (): Record<FieldKey, number> => ({
  barcode: -1, name: -1, brand: -1, gram: -1, category: -1, unit: -1,
  stock: -1, cost: -1, p1: -1, p2: -1, p3: -1, critical: -1, expiry: -1,
});

const fieldMatch = (header: string, patterns: string[]): boolean => {
  const h = normHeader(header);
  if (!h) return false;
  return patterns.some((p) => {
    const np = normHeader(p);
    if (!np) return false;
    // Tek yönlü: başlık, kalıbı İÇERMELİ. (Kısa kalıpların uzun kalıpları çalması engellenir.)
    return h.includes(np);
  });
};

/** Kısa/ayırt edici olmayan kalıplar yalnızca ikinci geçişte denenir. */
const STRONG_TOKENS = new Set(['ean', 'gtin', 'f1', 'f2', 'f3', 'skt', 'size', 'uom', 'qty', 'price', 'cost']);

const strongOnly = (p: string): boolean => {
  const np = normHeader(p);
  if (STRONG_TOKENS.has(np)) return true;
  return np.length >= 5;
};

/**
 * Başlık satırından alan→sütun eşlemesi üretir.
 * 1) Sayısal fiyat sütunları (f1/f2/f3) net ayırt edilir.
 * 2) Güçlü (uzun) kalıplarla eşleme yapılır.
 * 3) Eşleşmeyen alanlar kısa kalıplarla tamamlanır.
 * Aynı sütun iki alana birden atanmaz.
 */
export const guessColumns = (header: (string | number)[], patterns?: FieldPatterns): Record<FieldKey, number> => {
  const H = header.map((h) => String(h ?? ''));
  const map = emptyMapping();
  const claimed = new Set<number>();

  const numericPrice = (h: string): FieldKey | null => {
    const nh = normHeader(h);
    if (nh.includes('f1') || nh.includes('fiyat 1')) return 'p1';
    if (nh.includes('f2') || nh.includes('fiyat 2')) return 'p2';
    if (nh.includes('f3') || nh.includes('fiyat 3')) return 'p3';
    return null;
  };

  const effective = (key: FieldKey): string[] => {
    const fromPreset = patterns?.[key];
    const generic = GENERIC_PATTERNS[key] ?? [];
    return fromPreset && fromPreset.length ? [...fromPreset, ...generic] : generic;
  };

  const order: FieldKey[] = [
    'barcode', 'name', 'brand', 'gram', 'category', 'unit', 'stock', 'cost', 'p1', 'p2', 'p3', 'critical', 'expiry',
  ];

  // 1) sayısal fiyat sütunları
  H.forEach((h, i) => {
    const fk = numericPrice(h);
    if (fk && !claimed.has(i)) {
      map[fk] = i;
      claimed.add(i);
    }
  });

  // 2) güçlü kalıplar
  for (const key of order) {
    if (map[key] >= 0) continue;
    const pats = effective(key).filter(strongOnly);
    for (let i = 0; i < H.length; i++) {
      if (claimed.has(i)) continue;
      if (fieldMatch(H[i], pats)) {
        map[key] = i;
        claimed.add(i);
        break;
      }
    }
  }

  // 3) kısa kalıplar (kalan alanlar için)
  for (const key of order) {
    if (map[key] >= 0) continue;
    const pats = effective(key);
    for (let i = 0; i < H.length; i++) {
      if (claimed.has(i)) continue;
      if (fieldMatch(H[i], pats)) {
        map[key] = i;
        claimed.add(i);
        break;
      }
    }
  }

  return map;
};

/** Hangi program şablonu olduğunu tahmin eder (imza sayısına göre). */
export const detectPreset = (header: (string | number)[]): string => {
  const H = header.map((h) => normHeader(String(h ?? '')));
  let best = 'generic';
  let bestScore = 0;
  for (const p of PROGRAM_PRESETS) {
    let score = 0;
    for (const sig of p.signatures) {
      const ns = normHeader(sig);
      if (ns && H.some((h) => h.includes(ns))) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      best = p.id;
    }
  }
  return best;
};

/* ---------- satırları ürünlere dönüştürme ---------- */

export interface BuildResult {
  products: Product[];
  added: number;
  updated: number;
  skipped: number;
}

const cell = (row: (string | number)[], i: number): string =>
  i >= 0 && i < row.length ? String(row[i] ?? '').trim() : '';

export interface BuildOptions {
  existing: Product[];
  mapping: Record<FieldKey, number>;
  criticalDefault: number;
  categoryFallback?: string;
}

export const buildImportRows = (rows: (string | number)[][], opts: BuildOptions): BuildResult => {
  const { existing, mapping, criticalDefault } = opts;
  const categoryFallback = opts.categoryFallback ?? CATEGORIES[0]?.name ?? '';
  const out = [...existing];
  let added = 0;
  let updated = 0;
  let skipped = 0;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every((c) => String(c ?? '').trim() === '')) continue;
    const name = cell(row, mapping.name);
    const barcode = cell(row, mapping.barcode);
    if (!name && !barcode) {
      skipped++;
      continue;
    }
    const idx = out.findIndex((p) =>
      barcode ? p.barcode === barcode : p.name.toLocaleLowerCase('tr-TR') === name.toLocaleLowerCase('tr-TR')
    );
    const prev = idx >= 0 ? out[idx] : null;
    // Eşlenmemiş sütunlar mevcut ürünün değerini EZMEMELİ (veri kaybını önler).
    const mapped = (key: FieldKey) => (mapping[key] ?? -1) >= 0;
    const rec: Product = {
      id: prev ? prev.id : 'p' + uid(),
      name: name || prev?.name || 'İsimsiz Ürün',
      brand: mapped('brand') ? cell(row, mapping.brand) || undefined : prev?.brand,
      gram: mapped('gram') ? cell(row, mapping.gram) || undefined : prev?.gram,
      barcode: mapped('barcode') ? barcode : prev?.barcode ?? '',
      category: mapped('category')
        ? cell(row, mapping.category) || prev?.category || categoryFallback
        : prev?.category || categoryFallback,
      unit: mapped('unit') ? cell(row, mapping.unit) || prev?.unit || 'adet' : prev?.unit || 'adet',
      stock: mapped('stock') ? toNum(cell(row, mapping.stock)) : prev?.stock ?? 0,
      cost: mapped('cost') ? toNum(cell(row, mapping.cost)) : prev?.cost ?? 0,
      p1: mapped('p1') ? toNum(cell(row, mapping.p1)) : prev?.p1 ?? 0,
      p2: mapped('p2') ? toNum(cell(row, mapping.p2)) : prev?.p2 ?? 0,
      p3: mapped('p3') ? toNum(cell(row, mapping.p3)) : prev?.p3 ?? 0,
      critical: mapped('critical')
        ? toNum(cell(row, mapping.critical)) || prev?.critical || criticalDefault
        : prev?.critical ?? criticalDefault,
      expiry: mapped('expiry') ? cell(row, mapping.expiry) || undefined : prev?.expiry,
      image: prev?.image,
    };
    if (idx >= 0) {
      out[idx] = rec;
      updated++;
    } else {
      out.push(rec);
      added++;
    }
  }
  return { products: out, added, updated, skipped };
};
