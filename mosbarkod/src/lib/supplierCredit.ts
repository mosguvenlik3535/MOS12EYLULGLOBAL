import { round2 } from '../data';
export interface SupplierCreditEntry {
  id: string;
  supplier: string;
  date: string;
  type: 'payment' | 'invoice' | 'refund';
  amount: number; // KDV dahil, TL
  customer: string;
  reference: string;
  note: string;
  invoiceId?: string;
  voided?: boolean;
}
export const supplierKey = (name: string) => name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('tr-TR');
export function supplierTotals(entries: SupplierCreditEntry[]) {
  const sum = (type: SupplierCreditEntry['type']) => round2(entries.filter(e=>!e.voided && e.type===type).reduce((s,e)=>s+e.amount,0));
  const payments=sum('payment'), invoices=sum('invoice'), refunds=sum('refund');
  return {payments,invoices,refunds,balance:round2(payments-invoices-refunds)};
}
export function supplierEntryError(entry: SupplierCreditEntry, entries: SupplierCreditEntry[]): string {
  if(!entry.supplier.trim()) return 'Toptancı adı zorunludur.';
  if(!/^\d{4}-\d{2}-\d{2}$/.test(entry.date) || !Number.isFinite(Date.parse(entry.date)) || new Date(entry.date).toISOString().slice(0,10)!==entry.date) return 'Geçerli bir tarih girin.';
  if(!Number.isFinite(entry.amount) || entry.amount<=0) return 'Sıfırdan büyük geçerli bir tutar girin.';
  if(entry.type==='payment' && !entry.customer.trim()) return 'Ödeme yapan müşteri adını girin.';
  if(entry.type==='invoice' && !entry.reference.trim()) return 'Fatura numarası zorunludur.';
  if(entry.type==='invoice' && entries.some(e=>!e.voided && e.type==='invoice' && ((entry.invoiceId && entry.invoiceId===e.invoiceId) || (supplierKey(e.supplier)===supplierKey(entry.supplier) && supplierKey(e.reference)===supplierKey(entry.reference))))) return 'Bu fatura toptancı hesabında zaten kayıtlı.';
  return '';
}
