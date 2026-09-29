import { DEFAULT_CURRENCIES, round2, type Invoice } from '../data';
export interface SupplierCreditEntry {
  id: string;
  supplier: string;
  date: string;
  // invoice: initial purchase or subsequent goods withdrawal; one debit per document.
  type: 'payment' | 'invoice' | 'refund';
  amount: number; // KDV dahil, account currency (not a TRY-converted value)
  currency?: string; // Missing on legacy entries means TRY; never reinterpret old amounts.
  customer: string;
  reference: string;
  note: string;
  invoiceId?: string;
  voided?: boolean;
}
export const supplierKey = (name: string) => name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('tr-TR');
export const SUPPLIER_CURRENCIES = [...DEFAULT_CURRENCIES.map(c=>({code:c.code,name:c.name})),
  {code:'CHF',name:'İsviçre Frangı (CHF)'},{code:'CAD',name:'Kanada Doları (CAD)'},
  {code:'AUD',name:'Avustralya Doları (AUD)'},{code:'AED',name:'BAE Dirhemi (AED)'}];
export const supplierCurrency = (entry: SupplierCreditEntry) => entry.currency || 'TRY';
/** No app/global FX conversion: these are native-currency balances. */
export const supplierMoney = (amount:number, currency:string) =>
  `${amount.toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2})} ${currency==='TRY'?'TL':currency}`;
/** Only use a recorded amount in the requested currency, never guess today's FX. */
export function supplierInvoiceAmount(invoice:Invoice,currency:string): number | null {
  const amount=currency==='TRY'?invoice.total:invoice.importSource?.currency===currency?invoice.importSource.total:undefined;
  return typeof amount==='number' && Number.isFinite(amount) && amount>0 ? round2(amount) : null;
}
export function supplierTotals(entries: SupplierCreditEntry[], currency='TRY') {
  const sum = (type: SupplierCreditEntry['type']) => round2(entries.filter(e=>!e.voided && supplierCurrency(e)===currency && e.type===type).reduce((s,e)=>s+e.amount,0));
  const payments=sum('payment'), invoices=sum('invoice'), refunds=sum('refund');
  return {payments,invoices,refunds,balance:round2(payments-invoices-refunds)};
}
export function supplierEntryError(entry: SupplierCreditEntry, entries: SupplierCreditEntry[]): string {
  if(!SUPPLIER_CURRENCIES.some(c=>c.code===supplierCurrency(entry))) return 'Desteklenen bir hesap para birimi seçin.';
  if(!entry.supplier.trim()) return 'Toptancı adı zorunludur.';
  if(!/^\d{4}-\d{2}-\d{2}$/.test(entry.date) || !Number.isFinite(Date.parse(entry.date)) || new Date(entry.date).toISOString().slice(0,10)!==entry.date) return 'Geçerli bir tarih girin.';
  if(!Number.isFinite(entry.amount) || entry.amount<=0) return 'Sıfırdan büyük geçerli bir tutar girin.';
  if(entry.type==='payment' && !entry.customer.trim()) return 'Ödeme yapan müşteri adını girin.';
  if(entry.type==='invoice' && !entry.reference.trim()) return 'Fatura / irsaliye numarası zorunludur.';
  if(entry.type==='invoice' && entries.some(e=>!e.voided && e.type==='invoice' && ((entry.invoiceId && entry.invoiceId===e.invoiceId) || (supplierKey(e.supplier)===supplierKey(entry.supplier) && supplierKey(e.reference)===supplierKey(entry.reference))))) return 'Bu fatura toptancı hesabında zaten kayıtlı.';
  return '';
}
