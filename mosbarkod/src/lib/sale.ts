/**
 * Satış kapanışındaki kritik para/stok/veresiye mantığı (saf, test edilebilir).
 * App.tsx bu fonksiyonları kullanır; böylece testler gerçek davranışı doğrular.
 */

import { round2, type Customer, type Product } from '../data';

/* ---------- stok düşümü ---------- */

export interface StockLineRef {
  productId?: string;
  name?: string;
  qty: number;
}

/**
 * Satılan kalemlerin stoktan düşülmesi.
 * Kalem ürünle önce productId, yoksa ad (küçük harf) ile eşleştirilir.
 * Aynı ürün birden fazla kalemde olamaz (sepet birleştirir), tek eşleşme alınır.
 */
export function reduceStock(products: Product[], lines: StockLineRef[]): Product[] {
  return products.map((pr) => {
    const line = lines.find(
      (l) =>
        (l.productId !== undefined && l.productId === pr.id) ||
        (l.productId === undefined && l.name !== undefined && l.name.toLowerCase() === pr.name.toLowerCase())
    );
    if (!line) return pr;
    return { ...pr, stock: round2(pr.stock - line.qty) };
  });
}

/** İade: satılan kalemler stoka geri eklenir. */
export function restock(products: Product[], lines: StockLineRef[]): Product[] {
  return products.map((pr) => {
    const line = lines.find(
      (l) =>
        (l.productId !== undefined && l.productId === pr.id) ||
        (l.productId === undefined && l.name !== undefined && l.name.toLowerCase() === pr.name.toLowerCase())
    );
    if (!line) return pr;
    return { ...pr, stock: round2(pr.stock + line.qty) };
  });
}

/* ---------- veresiye / tahsilat ---------- */

export interface CreditArgs {
  amount: number;
  date: string;
  note: string;
  customerId?: string;
  newCustomerId?: string;
  newCustomerName?: string;
}

/** Veresiye satış: müşteri bakiyesine borç eklenir (veya yeni müşteri açılır). */
export function addCredit(customers: Customer[], args: CreditArgs): Customer[] {
  const entry = { date: args.date, type: 'satış' as const, amount: round2(args.amount), note: args.note };
  if (args.customerId) {
    return customers.map((c) =>
      c.id === args.customerId
        ? { ...c, balance: round2(c.balance + args.amount), entries: [...c.entries, entry] }
        : c
    );
  }
  if (args.newCustomerId && args.newCustomerName) {
    return [
      ...customers,
      { id: args.newCustomerId, name: args.newCustomerName, phone: '', balance: round2(args.amount), entries: [entry] },
    ];
  }
  return customers;
}

/** Tahsilat: müşteri bakiyesinden ödeme düşülür. */
export function collectPayment(customers: Customer[], customerId: string, amount: number, date: string, note?: string): Customer[] {
  return customers.map((c) =>
    c.id === customerId
      ? {
          ...c,
          balance: round2(c.balance - amount),
          entries: [
            ...c.entries,
            { date, type: 'tahsilat' as const, amount: round2(amount), note: note || undefined },
          ],
        }
      : c
  );
}

/* ---------- POS provizyon kapısı ---------- */

/** POS entegrasyonu açık ve POS tutarı varsa provizyon onayı gerekir. */
export function needsPosAuth(posEnabled: boolean, posAmount: number): boolean {
  return posEnabled === true && posAmount > 0;
}
