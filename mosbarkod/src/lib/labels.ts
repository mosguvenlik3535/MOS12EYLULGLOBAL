/**
 * ZPL (Zebra) / TSPL (TSC) termal etiket üretici — saf, cihazdan bağımsız.
 *
 * Etiket yazıcısına doğrudan TCP 9100 üzerinden gönderilecek ham komut metnini
 * üretir. Yazıcı barkodu (EAN-13) kendisi çizer; biz yalnızca komutu veririz.
 * Türkçe karakterler ASCII'ye indirgenir; ^ ve ~ (ZPL kontrol) temizlenir.
 */

import type { Product, Settings } from '../data';

/* ---------- yardımcılar ---------- */

const TR_MAP: Record<string, string> = {
  ş: 's', Ş: 'S', ğ: 'g', Ğ: 'G', ı: 'i', İ: 'I', ö: 'o', Ö: 'O', ü: 'u', Ü: 'U',
  ç: 'c', Ç: 'C', â: 'a', Â: 'A', î: 'i', Î: 'I', û: 'u', Û: 'U',
};

/** Yazıcı-güvenli ASCII: Türkçe indirgenir, ZPL kontrol karakterleri temizlenir. */
export function labelAscii(text: string): string {
  let out = '';
  for (const ch of text) {
    const code = ch.codePointAt(0)!;
    if (code >= 32 && code < 127) {
      out += ch === '^' || ch === '~' || ch === '"' ? ' ' : ch;
    } else if (TR_MAP[ch]) out += TR_MAP[ch];
    else if (code < 256) out += ch;
    else out += ' ';
  }
  return out.trim();
}

const ean13Checksum = (base12: string): number => {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const d = base12.charCodeAt(i) - 48;
    sum += i % 2 === 0 ? d : d * 3;
  }
  return (10 - (sum % 10)) % 10;
};

/** Ürün için geçerli 13 haneli EAN-13 üretir (mevcut barkoddan veya deterministik). */
export function eanFor(product: Product, index = 0): string {
  const bc = (product.barcode || '').replace(/\D/g, '');
  if (bc.length === 13) return bc;
  if (bc.length === 12) return bc + String(ean13Checksum(bc));
  const seed = (product.id || '') + String(index);
  const digits = seed.replace(/\D/g, '').slice(0, 9);
  let rand = digits;
  let n = 0;
  while (rand.length < 9) {
    rand += String((seed.charCodeAt(n % seed.length) + n) % 10);
    n++;
  }
  const base = '869' + rand.slice(0, 9);
  return base + String(ean13Checksum(base));
}

const priceText = (p: Product): string => {
  const n = p.p1.toLocaleString('tr-TR', { minimumFractionDigits: 2 });
  return `${n} TL`;
};

/* ---------- ölçüler ---------- */

const dots = (mm: number, dpi: number) => Math.max(1, Math.round((mm * dpi) / 25.4));

const measures = (s: Settings) => {
  const dpi = s.label?.density || 203;
  return {
    W: dots(s.label?.widthMm || 40, dpi),
    H: dots(s.label?.heightMm || 25, dpi),
    dpi,
  };
};

/* ---------- ZPL II ---------- */

export function zplLabel(product: Product, settings: Settings, index = 0): string {
  const { W, H } = measures(settings);
  const name = labelAscii(product.name);
  const category = labelAscii(product.category || '');
  const ean = eanFor(product, index);
  const price = priceText(product);

  const nameY = 4;
  const catY = 48;
  const barY = 66;
  const barH = Math.max(30, H - barY - 46);
  const priceY = barY + barH + 6;
  const copies = Math.max(1, settings.label?.copies || 1);

  const lines = [
    '^XA',
    `^PW${W}`,
    `^LL${H}`,
    `^FO${4},${nameY}^A0N,22,22^FB${W - 8},2,0,L,0^FD${name}^FS`,
    `^FO${4},${catY}^A0N,18,18^FB${W - 8},1,0,L,0^FD${category}^FS`,
    `^FO${4},${barY}^BY2,2,${barH}^BCN,${barH},Y,N,N^FD${ean}^FS`,
    `^FO${4},${priceY}^A0N,26,26^FB${W - 8},1,0,L,0^FD${settings.label?.showPrice === false ? '' : price}^FS`,
    `^PQ${copies}`,
    '^XZ',
  ];
  return lines.join('\n');
}

/* ---------- TSPL (TSC) ---------- */

export function tsplLabel(product: Product, settings: Settings, index = 0): string {
  const { W, H } = measures(settings);
  const name = labelAscii(product.name);
  const category = labelAscii(product.category || '');
  const ean = eanFor(product, index);
  const price = priceText(product);

  const barY = 66;
  const barH = Math.max(30, H - barY - 46);
  const priceY = barY + barH + 8;
  const copies = Math.max(1, settings.label?.copies || 1);

  const lines = [
    'SIZE ' + W + ' dot,' + H + ' dot',
    'GAP 2 mm,0 mm',
    'DIRECTION 1',
    'CLS',
    `TEXT 4,4,"3",0,1,1,"${name}"`,
    `TEXT 4,48,"2",0,1,1,"${category}"`,
    `BARCODE 4,${barY},"EAN13",${barH},1,0,2,2,"${ean}"`,
    `TEXT 4,${priceY},"4",0,1,1,"${settings.label?.showPrice === false ? '' : price}"`,
    `PRINT ${copies},1`,
  ];
  return lines.join('\n');
}

/* ---------- toplu etiket ---------- */

/** Birden çok ürünü tek yazdırma işinde birleştirir. */
export function encodeLabelBatch(products: Product[], settings: Settings): string {
  const proto = settings.label?.protocol || 'zpl';
  return products.map((p, i) => (proto === 'tspl' ? tsplLabel(p, settings, i) : zplLabel(p, settings, i))).join('\n');
}

/** Test etiketi için sahte ürün. */
export function labelTestProduct(): Product {
  return {
    id: 'test',
    name: 'Test Urunu',
    barcode: '8690000000005',
    category: 'Gida',
    stock: 1,
    unit: 'adet',
    p1: 12.5,
    p2: 12.5,
    p3: 12.5,
    cost: 6,
    critical: 0,
  };
}
