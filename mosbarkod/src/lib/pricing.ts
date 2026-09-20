/**
 * Para hesaplama fonksiyonları (saf, test edilebilir).
 * Satış kapanışında kullanılan kritik matematik tek yerde toplanır.
 */

import { round2 } from '../data';

/** İndirim tutarı (subtotal üzerinden yüzde). */
export const discountAmount = (subtotal: number, pct: number): number => round2((subtotal * (pct || 0)) / 100);

/** İndirim uygulanmış toplam: { discAmt, total }. */
export const applyDiscount = (subtotal: number, pct: number): { discAmt: number; total: number } => {
  const s = round2(subtotal);
  const discAmt = discountAmount(s, pct);
  return { discAmt, total: round2(s - discAmt) };
};

/** Para üstü (eksikse negatif döner — çağıran doğrular). */
export const computeChange = (received: number, total: number): number => round2(received - total);

/** Nakit + POS bölüştürme: kalan tutar POS'a yazılır. */
export const splitCashPos = (total: number, cash: number): { cash: number; pos: number } => {
  const c = round2(cash);
  return { cash: c, pos: round2(total - c) };
};

/** Bir sepet kaleminin net tutarı (satır indirimi dahil). */
export const lineTotal = (unitPrice: number, qty: number, lineDiscountPct = 0): number =>
  round2(unitPrice * qty * (1 - (lineDiscountPct || 0) / 100));
