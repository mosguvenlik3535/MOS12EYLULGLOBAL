/**
 * Ürün Yapay Zekâ Kütüphanesi (Ürün Ekleme Sihirbazı için).
 *
 * - Open Food Facts küresel veri tabanından isim/barkod ile ürün meta verisi çeker
 * - Yerel kategori eşlemesi yapar
 * - Barkodsuz ürünler için EAN-13 (869 Türkiye önekli) barkod üretir
 *
 * Tümü tarayıcıdan doğrudan çalışır; ağ yoksa hata fırlatır (arayüz fallback gösterir).
 */

export interface AiProductMeta {
  barcode: string;
  name: string;
  brand: string;
  gram: string;
  image: string;
  /** Yerel kategori adı (eşleşme yoksa null — mevcut kategori korunur) */
  category: string | null;
  source: 'openfoodfacts' | 'local';
}

/* ---------- EAN-13 barkod üretimi ---------- */

export function ean13Checksum(base12: string): number {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const d = base12.charCodeAt(i) - 48;
    sum += i % 2 === 0 ? d : d * 3;
  }
  return (10 - (sum % 10)) % 10;
}

/** 869 (Türkiye) önekli, geçerli kontrollü EAN-13 üretir. Seed verilirse deterministik olur. */
export function generateEan13(seed = ''): string {
  const digits = (seed || '').replace(/\D/g, '');
  let rand = digits.slice(0, 9);
  while (rand.length < 9) rand += String(Math.floor(Math.random() * 10));
  const base = '869' + rand.slice(0, 9);
  const cs = ean13Checksum(base);
  return base + String(cs);
}

/* ---------- Open Food Facts ---------- */

interface OffProduct {
  code?: string;
  product_name?: string;
  product_name_tr?: string;
  generic_name?: string;
  brands?: string;
  quantity?: string;
  image_url?: string;
  categories?: string;
  categories_tags?: string[];
}

const OFF_FIELDS =
  'code,product_name,product_name_tr,generic_name,brands,quantity,image_url,categories,categories_tags';

/* Yerel kategori eşlemesi — OFF etiketlerinden MOS BARKOD kategorilerine */
const OFF_CAT_MAP: { re: RegExp; cat: string }[] = [
  { re: /beer/i, cat: 'Bira' },
  { re: /rak[ıi]/i, cat: 'Raki' },
  { re: /spirits|vodka|whisky|whiskey|gin\b|rum\b|liqueur|cognac/i, cat: 'Viski' },
  { re: /tobacco|cigarette/i, cat: 'Sigara & Tütün' },
  { re: /cola|soda|soft.?drink|lemonade|energy.?drink|juice/i, cat: 'Meşrubat' },
  { re: /chips|crisps|snack|biscuit|cookie|chocolate|candy|confectionery/i, cat: 'Atıştırmalık' },
  { re: /nuts|seed|dried.?fruit|almond|pistachio|hazelnut|peanut/i, cat: 'Kuru Yemiş' },
  { re: /coffee|tea\b|teas/i, cat: 'Kahve & Çay' },
];

export function mapOffCategory(tags: string[] = [], categoriesText = '', name = ''): string | null {
  const hay = [...tags, categoriesText, name].join(' ').toLowerCase();
  for (const m of OFF_CAT_MAP) {
    if (m.re.test(hay)) return m.cat;
  }
  return null;
}

function metaFromOff(p: OffProduct): AiProductMeta {
  const name = (p.product_name_tr || p.product_name || p.generic_name || '').trim();
  return {
    barcode: (p.code || '').trim(),
    name,
    brand: (p.brands || '').trim(),
    gram: (p.quantity || '').trim(),
    image: p.image_url || '',
    category: mapOffCategory(p.categories_tags ?? [], p.categories ?? '', name),
    source: 'openfoodfacts',
  };
}

/** Ürün adı ile küresel veri tabanında arama yapar (en alakalı sonuçlar). */
export async function searchProductsByName(query: string, limit = 6): Promise<AiProductMeta[]> {
  const url =
    'https://world.openfoodfacts.org/cgi/search.pl' +
    `?search_terms=${encodeURIComponent(query)}` +
    '&search_simple=1&action=process&json=1' +
    `&page_size=${limit}&fields=${encodeURIComponent(OFF_FIELDS)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('off-http');
  const data = (await res.json()) as { products?: OffProduct[] };
  const products = Array.isArray(data?.products) ? data.products : [];
  return products
    .filter((p) => p.code)
    .map(metaFromOff)
    .filter((m) => m.name || m.barcode)
    .slice(0, limit);
}

/** Barkod ile ürün arar; bulunamazsa null döner. */
export async function fetchProductByBarcode(code: string): Promise<AiProductMeta | null> {
  const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json`);
  if (!res.ok) return null;
  const data = (await res.json()) as { status?: number; product?: OffProduct };
  if (data.status !== 1 || !data.product) return null;
  return metaFromOff(data.product);
}
