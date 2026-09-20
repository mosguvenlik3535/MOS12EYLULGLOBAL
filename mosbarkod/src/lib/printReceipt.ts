/**
 * Fiş yazdırma yöneticisi.
 *
 * Elektron masaüstünde ağ (TCP 9100) termal yazıcıya ESC/POS baytları
 * gönderir; yazıcı ayarlı değilse sistem yazdırma penceresine düşer.
 */

import type { Sale, Settings } from '../data';
import { buildReceipt, buildTestReceipt, bytesToBase64 } from './escpos';

declare global {
  interface Window {
    mosPrint?: {
      sendTcp: (payload: { ip: string; port: number; data: string }) => Promise<{ ok: boolean; error?: string }>;
    };
  }
}

export type PrintResult = { ok: boolean; error?: string; via?: 'escpos' | 'system' };

const hasTcpPrinter = (s: Settings) => Boolean(s.printer?.enabled && s.printer?.ip);

export async function printSale(sale: Sale, settings: Settings): Promise<PrintResult> {
  if (hasTcpPrinter(settings) && window.mosPrint) {
    try {
      const bytes = buildReceipt(sale, settings, { drawer: settings.pos?.openDrawer, beep: settings.pos?.beepOnPrint });
      const res = await window.mosPrint.sendTcp({
        ip: settings.printer.ip,
        port: settings.printer.port || 9100,
        data: bytesToBase64(bytes),
      });
      if (res?.ok) return { ok: true, via: 'escpos' };
      return { ok: false, error: res?.error || 'yazıcı yanıt vermedi', via: 'escpos' };
    } catch (e) {
      return { ok: false, error: String(e), via: 'escpos' };
    }
  }
  // Yazıcı ayarlı değilse sistem yazdırma penceresi
  window.print();
  return { ok: true, via: 'system' };
}

export async function printTest(settings: Settings): Promise<PrintResult> {
  if (settings.printer?.enabled && settings.printer.connection === 'tcp' && !window.mosPrint) {
    return { ok: false, error: 'Fiş yazıcı köprüsü yalnızca masaüstü uygulamasında (MOSBARKOD.exe / AppImage) çalışır.' };
  }
  if (hasTcpPrinter(settings) && window.mosPrint) {
    try {
      const bytes = buildTestReceipt(settings);
      const res = await window.mosPrint.sendTcp({
        ip: settings.printer.ip,
        port: settings.printer.port || 9100,
        data: bytesToBase64(bytes),
      });
      if (res?.ok) return { ok: true, via: 'escpos' };
      return { ok: false, error: res?.error || 'yazıcı yanıt vermedi', via: 'escpos' };
    } catch (e) {
      return { ok: false, error: String(e), via: 'escpos' };
    }
  }
  return { ok: false, error: 'Yazıcı adresi ayarlanmamış. Ayarlar → Donanım bölümünden fiş yazıcısı IP adresini girin.' };
}
