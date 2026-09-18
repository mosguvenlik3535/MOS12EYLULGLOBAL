/**
 * Paylaşım yardımcıları (mobil odaklı).
 *
 * Telefonda "Yazdır" çoğu zaman işe yaramıyor (sistem yazdırma penceresi
 * ya hiç açılmıyor ya da termal yazıcıyı görmüyor). Bu yüzden fiş, yedek
 * ve rapor dosyalarını doğrudan WhatsApp / Drive / e-posta gibi
 * uygulamalara paylaşmak çok daha kullanışlı.
 *
 * `navigator.share` desteklenmiyorsa dosya indirmeye düşer.
 */

import { fmt, type Sale, type Settings } from '../data';

type NavigatorWithShare = Navigator & {
  canShare?: (data: { files?: File[] }) => boolean;
  share?: (data: { files?: File[]; title?: string; text?: string }) => Promise<void>;
};

export type ShareResult = { ok: boolean; via?: 'share' | 'download'; cancelled?: boolean; error?: string };

/** Cihaz dosya paylaşımını destekliyor mu? (Android Chrome / PWA: evet) */
export function canShareFiles(): boolean {
  const n = navigator as NavigatorWithShare;
  if (typeof n === 'undefined' || typeof n.share !== 'function' || typeof n.canShare !== 'function') return false;
  try {
    return n.canShare({ files: [new File(['x'], 'x.txt', { type: 'text/plain' })] });
  } catch {
    return false;
  }
}

/** Dosyaları sistem paylaşım penceresiyle paylaş (WhatsApp dahil). */
export async function shareFiles(files: File[], title: string, text = ''): Promise<ShareResult> {
  const n = navigator as NavigatorWithShare;
  if (typeof n.share !== 'function' || !canShareFiles()) return { ok: false, error: 'paylaşım-desteklenmiyor' };
  try {
    await n.share({ files, title, text });
    return { ok: true, via: 'share' };
  } catch (e) {
    const name = (e as { name?: string }).name ?? '';
    if (name === 'AbortError') return { ok: false, cancelled: true };
    return { ok: false, error: String(e) };
  }
}

/** Dosyayı indir (paylaşım desteklenmeyen cihazlarda yedek yol). */
export function downloadFile(file: File) {
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** Önce paylaşmayı dener, olmazsa indirir. */
export async function shareOrDownload(files: File[], title: string, text = ''): Promise<ShareResult> {
  const r = await shareFiles(files, title, text);
  if (r.ok) return r;
  if (r.cancelled) return r;
  files.forEach(downloadFile);
  return { ok: true, via: 'download' };
}

/* ---------------- fiş metni (WhatsApp / SMS için) ---------------- */

const METHOD_LABEL: Record<string, string> = {
  nakit: 'Nakit',
  kart: 'Kredi Kartı',
  'nakit+pos': 'Nakit + POS',
  veresiye: 'Veresiye',
};

/** Satışın düz metin fişi — WhatsApp ile göndermek için ideal. */
export function buildReceiptText(sale: Sale, settings: Settings): string {
  const L: string[] = [];
  L.push(`*${(settings.storeName || 'MOSBARKOD').toUpperCase()}*`);
  if (settings.address) L.push(settings.address);
  if (settings.phone) L.push(settings.phone);
  L.push('────────────────────');
  L.push(`Fiş No : ${sale.no}`);
  L.push(`Tarih  : ${new Date(sale.date).toLocaleString('tr-TR')}`);
  if (sale.customer) L.push(`Müşteri: ${sale.customer}`);
  L.push('────────────────────');
  for (const it of sale.items) {
    L.push(`${it.qty} ${it.unit || 'adet'} x ${it.name}`);
    L.push(`   ${fmt(it.unitPrice)}  →  ${fmt(it.qty * it.unitPrice)}`);
  }
  L.push('────────────────────');
  L.push(`Ara Toplam : ${fmt(sale.subtotal)}`);
  if (sale.discountAmt > 0) L.push(`İskonto    : -${fmt(sale.discountAmt)} (${sale.discountPct}%)`);
  L.push(`*TOPLAM     : ${fmt(sale.total)}*`);
  L.push(`Ödeme      : ${METHOD_LABEL[sale.method] ?? sale.method}`);
  if (sale.received > 0) {
    L.push(`Alınan     : ${fmt(sale.received)}`);
    L.push(`Para Üstü  : ${fmt(sale.change)}`);
  }
  L.push('');
  L.push('Teşekkür ederiz, iyi günler dileriz.');
  return L.join('\n');
}

/** WhatsApp Web / uygulama bağlantısı (numara boşsa metin panoya kopyalanır). */
export function whatsAppLink(phone: string, text: string): string {
  const digits = (phone || '').replace(/\D/g, '');
  const n = digits.startsWith('90') ? digits : digits.startsWith('0') ? `9${digits}` : `90${digits}`;
  return `https://wa.me/${n}?text=${encodeURIComponent(text)}`;
}
