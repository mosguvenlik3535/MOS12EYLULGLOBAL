import { describe, it, expect } from 'vitest';
import { resolveSaleCustomer, type Customer } from '../data';

const musteriler: Customer[] = [
  { id: 'c1', name: 'Ahmet Yılmaz', phone: '', balance: 0, entries: [] },
  { id: 'c2', name: 'Mehmet Demir', phone: '', balance: 120, entries: [] },
];

describe('satışa müşteri adı / açıklama', () => {
  it('elle yazılan ad her zaman önceliklidir', () => {
    expect(resolveSaleCustomer({ customerName: '  Ayşe Kaya  ' }, musteriler)).toBe('Ayşe Kaya');
    expect(
      resolveSaleCustomer({ customerName: 'Ayşe Kaya', customerId: 'c1' }, musteriler),
    ).toBe('Ayşe Kaya');
  });

  it('veresiyede yazılan yeni müşteri adı kullanılır', () => {
    expect(resolveSaleCustomer({ newCustomerName: 'Veli Şahin' }, musteriler)).toBe('Veli Şahin');
  });

  it('veresiyede defterden seçilen müşterinin adı kullanılır', () => {
    expect(resolveSaleCustomer({ customerId: 'c2' }, musteriler)).toBe('Mehmet Demir');
  });

  it('hiçbiri yoksa müşteri adı boş kalır', () => {
    expect(resolveSaleCustomer({}, musteriler)).toBeUndefined();
    expect(resolveSaleCustomer({ customerName: '   ' }, musteriler)).toBeUndefined();
    expect(resolveSaleCustomer({ customerId: 'yok' }, musteriler)).toBeUndefined();
  });
});
