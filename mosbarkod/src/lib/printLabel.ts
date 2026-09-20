/**
 * Etiket yazdırma yöneticisi.
 *
 * ZPL/TSPL komut metnini ağ (TCP 9100) termal etiket yazıcısına gönderir
 * (masaüstünde mosPrint köprüsüyle). USB/ayarsız durumda metni panoya kopyalar,
 * böylece kullanıcı yazıcının kendi aracına (ZebraDesigner vb.) yapıştırabilir.
 */

import type { Product, Settings } from '../data';
import { encodeLabelBatch, labelTestProduct } from './labels';

declare global {
  interface Window {
    mosPrint?: {
      sendTcp: (payload: { ip: string; port: number; data: string }) => Promise<{ ok: boolean; error?: string }>;
    };
  }
}

export type LabelPrintResult = { ok: boolean; error?: string; via?: 'tcp' | 'clipboard' };

const textToBase64 = (text: string): string => {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
};

export async function sendLabels(products: Product[], settings: Settings): Promise<LabelPrintResult> {
  if (!products.length) return { ok: false, error: 'Yazdırılacak ürün seçilmedi.' };
  if (!settings.label?.enabled) {
    return { ok: false, error: 'Etiket yazıcı ayarlı değil. Ayarlar → Donanım → Etiket Yazıcı bölümünden açıp IP girin.' };
  }

  const text = encodeLabelBatch(products, settings);

  if (settings.label.connection === 'tcp') {
    if (!window.mosPrint) {
      return { ok: false, error: 'Termal yazdırma yalnızca masaüstü uygulamasında (MOSBARKOD.exe / AppImage) çalışır.' };
    }
    try {
      const res = await window.mosPrint.sendTcp({
        ip: settings.label.ip,
        port: settings.label.port || 9100,
        data: textToBase64(text),
      });
      if (res?.ok) return { ok: true, via: 'tcp' };
      return { ok: false, error: res?.error || 'Etiket yazıcı yanıt vermedi', via: 'tcp' };
    } catch (e) {
      return { ok: false, error: String(e), via: 'tcp' };
    }
  }

  // USB / ayarsız: panoya kopyala
  try {
    await navigator.clipboard.writeText(text);
    return { ok: true, via: 'clipboard' };
  } catch {
    return { ok: false, error: 'Etiket komutu panoya kopyalanamadı.' };
  }
}

export async function sendLabelTest(settings: Settings): Promise<LabelPrintResult> {
  return sendLabels([labelTestProduct()], settings);
}
