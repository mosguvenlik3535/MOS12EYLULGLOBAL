import { describe, expect, it } from 'vitest';
import type { Customer, Product } from '../data';
import { addCredit, collectPayment, needsPosAuth, reduceStock, restock } from './sale';

const product = (id: string, name: string, stock: number): Product => ({
  id,
  name,
  barcode: '869' + id,
  category: 'İçecek',
  stock,
  unit: 'adet',
  p1: 10,
  p2: 12,
  p3: 14,
  cost: 6,
  critical: 5,
});

const customer = (id: string, balance: number): Customer => ({
  id,
  name: 'Müşteri ' + id,
  phone: '',
  balance,
  entries: [],
});

describe('stok düşümü (reduceStock)', () => {
  it('satılan miktarı ürün stokundan düşer', () => {
    const products = [product('p1', 'Su', 100), product('p2', 'Çay', 50)];
    const next = reduceStock(products, [{ productId: 'p1', qty: 7 }]);
    expect(next.find((p) => p.id === 'p1')!.stock).toBe(93);
  });

  it('satılmayan ürünler değişmez', () => {
    const products = [product('p1', 'Su', 100), product('p2', 'Çay', 50)];
    const next = reduceStock(products, [{ productId: 'p1', qty: 7 }]);
    expect(next.find((p) => p.id === 'p2')!.stock).toBe(50);
  });

  it('productId yoksa ad ile eşleşir (iade/manuel sepet)', () => {
    const products = [product('p1', 'Su', 100)];
    const next = reduceStock(products, [{ name: 'su', qty: 5 }]);
    expect(next[0].stock).toBe(95);
  });

  it('kesirli miktarları 2 ondalığa yuvarlar', () => {
    const products = [product('p1', 'Kuruyemiş', 10.5)];
    const next = reduceStock(products, [{ productId: 'p1', qty: 3.33 }]);
    expect(next[0].stock).toBe(7.17);
  });

  it('stok yetersizse negatife düşebilir (fazla satış kaydı tutar)', () => {
    const products = [product('p1', 'Su', 3)];
    const next = reduceStock(products, [{ productId: 'p1', qty: 5 }]);
    expect(next[0].stock).toBe(-2);
  });
});

describe('iade (restock)', () => {
  it('iade edilen miktarı stoka geri ekler', () => {
    const products = [product('p1', 'Su', 50)];
    const next = restock(products, [{ name: 'Su', qty: 3 }]);
    expect(next[0].stock).toBe(53);
  });
});

describe('veresiye (addCredit)', () => {
  it('mevcut müşteri bakiyesine borç ekler', () => {
    const customers = [customer('c1', 100)];
    const next = addCredit(customers, {
      amount: 45.5,
      date: '2026-09-12T10:00:00.000Z',
      note: 'Satış F-1',
      customerId: 'c1',
    });
    expect(next[0].balance).toBe(145.5);
    expect(next[0].entries).toHaveLength(1);
    expect(next[0].entries[0].type).toBe('satış');
  });

  it('yeni müşteri açarak borcu başlatır', () => {
    const next = addCredit([], {
      amount: 80,
      date: '2026-09-12T10:00:00.000Z',
      note: 'Satış F-2',
      newCustomerId: 'c9',
      newCustomerName: 'Ayşe',
    });
    expect(next).toHaveLength(1);
    expect(next[0]).toMatchObject({ id: 'c9', name: 'Ayşe', balance: 80 });
  });

  it('diğer müşteriler etkilenmez', () => {
    const customers = [customer('c1', 100), customer('c2', 0)];
    const next = addCredit(customers, { amount: 10, date: 'x', note: 'n', customerId: 'c1' });
    expect(next.find((c) => c.id === 'c2')!.balance).toBe(0);
  });
});

describe('tahsilat (collectPayment)', () => {
  it('bakiyeden ödemeyi düşer ve kayıt ekler', () => {
    const customers = [customer('c1', 200)];
    const next = collectPayment(customers, 'c1', 75.25, '2026-09-12T10:00:00.000Z', 'Nakit');
    expect(next[0].balance).toBe(124.75);
    expect(next[0].entries[0]).toMatchObject({ type: 'tahsilat', amount: 75.25 });
  });

  it('borcun tamamı ödenirse bakiye 0 olur', () => {
    const customers = [customer('c1', 200)];
    const next = collectPayment(customers, 'c1', 200, '2026-09-12T10:00:00.000Z');
    expect(next[0].balance).toBe(0);
  });
});

describe('POS provizyon kapısı (needsPosAuth)', () => {
  it('POS entegrasyonu açık ve POS tutarı varsa onay ister', () => {
    expect(needsPosAuth(true, 50)).toBe(true);
  });

  it('POS tutarı 0 ise onay istemez', () => {
    expect(needsPosAuth(true, 0)).toBe(false);
  });

  it('POS entegrasyonu kapalıysa onay istemez', () => {
    expect(needsPosAuth(false, 50)).toBe(false);
  });
});
