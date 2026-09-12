/**
 * ESC/POS termal fiş kodlayıcı (saf, cihazdan bağımsız).
 *
 * 58mm/80mm termal yazıcıların anladığı ham bayt dizisini üretir.
 * Türkçe karakterler ASCII'ye dönüştürülür (ş→s, ğ→g, ...) böylece
 * kod sayfasından bağımsız olarak her yazıcıda doğru basılır.
 */

import type { Sale, Settings } from '../data';
import { METHOD_META, dstr, tstr } from '../data';

const ESC = 0x1b;
const GS = 0x1d;

/* ---------- komutlar ---------- */
const CMD = {
  init: [ESC, 0x40],
  alignLeft: [ESC, 0x61, 0x00],
  alignCenter: [ESC, 0x61, 0x01],
  alignRight: [ESC, 0x61, 0x02],
  boldOn: [ESC, 0x45, 0x01],
  boldOff: [ESC, 0x45, 0x00],
  underlineOn: [ESC, 0x2d, 0x01],
  underlineOff: [ESC, 0x2d, 0x00],
  doubleOn: [GS, 0x21, 0x11],
  doubleOff: [GS, 0x21, 0x00],
  feedCut: [GS, 0x56, 0x42, 0x00], // kısmi kesim
  openDrawer: [ESC, 0x70, 0x00, 0x19, 0xfa], // çekmece pin 2
  beep: [0x07, 0x07],
};

/* Türkçe → ASCII dönüşümü (kod sayfasından bağımsız güvenli çıktı) */
const TR_MAP: Record<string, string> = {
  ş: 's', Ş: 'S', ğ: 'g', Ğ: 'G', ı: 'i', İ: 'I', ö: 'o', Ö: 'O', ü: 'u', Ü: 'U',
  ç: 'c', Ç: 'C', â: 'a', Â: 'A', î: 'i', Î: 'I', û: 'u', Û: 'U',
};

/** Yazdırılabilir ASCII'ye dönüştür (Türkçe dahil). */
export function toAscii(text: string): string {
  let out = '';
  for (const ch of text) {
    const code = ch.codePointAt(0)!;
    if (code === 0x0a) out += '\n';
    else if (code >= 32 && code < 127) out += ch;
    else if (TR_MAP[ch]) out += TR_MAP[ch];
    else if (code < 256) out += ch; // Latin-1 basılabilir (yazıcıya göre)
    else out += '?';
  }
  return out;
}

/* ---------- satır yardımcıları ---------- */

const WIDTH = 32; // 58mm için karakter genişliği

export function wrap(text: string, width = WIDTH): string[] {
  const lines: string[] = [];
  for (const raw of text.split('\n')) {
    const words = raw.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push('');
      continue;
    }
    let cur = '';
    for (const w of words) {
      if (cur.length === 0) {
        cur = w;
      } else if (cur.length + 1 + w.length <= width) {
        cur += ' ' + w;
      } else {
        lines.push(cur);
        cur = w;
      }
    }
    lines.push(cur);
  }
  return lines;
}

export function padRow(left: string, right: string, width = WIDTH): string {
  const l = toAscii(left);
  const r = toAscii(right);
  const gap = Math.max(1, width - l.length - r.length);
  return l + ' '.repeat(gap) + r;
}

const divider = (width = WIDTH) => '-'.repeat(width);

/* ---------- bayt dizisi üretici ---------- */

export function buildReceipt(sale: Sale, settings: Settings, opts?: { drawer?: boolean; beep?: boolean }): Uint8Array {
  const out: number[] = [];
  const push = (...b: number[]) => out.push(...b);
  const text = (s: string) => {
    for (const ch of toAscii(s)) push(ch.charCodeAt(0));
  };
  const line = (s = '') => {
    text(s);
    push(0x0a);
  };

  push(...CMD.init);

  // Başlık
  push(...CMD.alignCenter);
  push(...CMD.boldOn);
  line(settings.storeName || 'MOS BARKOD');
  push(...CMD.boldOff);
  if (settings.receiptHeader) line(settings.receiptHeader);
  if (settings.address) line(settings.address);
  if (settings.phone) line('Tel: ' + settings.phone);
  push(...CMD.alignLeft);

  line(divider());

  const m = METHOD_META[sale.method];
  line(padRow('BARKOD FISI', sale.no));
  line(`${dstr(sale.date)} ${tstr(sale.date)}`);
  line(`Kasa ${sale.register} · ${sale.cashier}`);
  if (sale.customer) line('Musteri: ' + sale.customer);

  line(divider());

  // Kalemler
  for (const it of sale.items) {
    line(it.name);
    const qty = String(it.qty).replace('.', ',');
    const unitPrice = it.unitPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2 });
    const lineTotal = (it.qty * it.unitPrice).toLocaleString('tr-TR', { minimumFractionDigits: 2 });
    line(padRow(`${qty} ${it.unit} x ${unitPrice}`, lineTotal));
  }

  line(divider());
  line(padRow('ARA TOPLAM', sale.subtotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + ' TL'));
  if (sale.discountPct > 0) {
    line(padRow(`%${sale.discountPct} ISKONTO`, '-' + sale.discountAmt.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + ' TL'));
  }

  push(...CMD.boldOn);
  line(padRow('ODENEN', sale.total.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + ' TL'));
  push(...CMD.boldOff);

  line(`YONTEM: ${m.label.toUpperCase()}`);
  if (sale.received > 0) {
    line(padRow('ALINAN', sale.received.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + ' TL'));
  }
  if (sale.change > 0) {
    line(padRow('PARA USTU', sale.change.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + ' TL'));
  }
  if (sale.posAuth) line('PROVIZYON: ' + sale.posAuth);

  line(divider());
  push(...CMD.alignCenter);
  if (settings.receiptFooter) line(settings.receiptFooter);
  line('MOSBARKOD · X100 UYUMLU');
  push(...CMD.alignLeft);

  // Kağıt ilerlet + kes
  push(0x0a, 0x0a, 0x0a);
  push(...CMD.feedCut);
  if (opts?.drawer) push(...CMD.openDrawer);
  if (opts?.beep) push(...CMD.beep);

  return Uint8Array.from(out);
}

/** Bağlantı testi için kısa deneme fişi. */
export function buildTestReceipt(settings: Settings): Uint8Array {
  const sale: Sale = {
    id: 'test',
    no: 'TEST-0001',
    date: new Date().toISOString(),
    register: 1,
    cashier: 'Sistem',
    mode: 'f1',
    items: [{ name: 'Deneme Urunu', qty: 1, unit: 'adet', unitPrice: 0 }],
    subtotal: 0,
    discountPct: 0,
    discountAmt: 0,
    total: 0,
    method: 'nakit',
    received: 0,
    change: 0,
    cash: 0,
    pos: 0,
  };
  return buildReceipt(sale, settings);
}

/* ---------- base64 ---------- */

export function bytesToBase64(bytes: Uint8Array): string {
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}
