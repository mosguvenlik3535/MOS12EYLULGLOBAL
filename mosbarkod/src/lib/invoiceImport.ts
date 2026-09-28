import { round2, type Invoice, type Product } from '../data';
export interface ImportRow { code: string; name: string; qty: number; unit: string; unitPrice: number; vatRate: number; net: number; productId: string; createProduct: boolean }
export interface InvoiceDraft { number: string; date: string; dueDate: string; currency: string; total: number; totalTRY: number; rows: ImportRow[]; text: string }
export const invoiceNumber = (s: string) => s.replace(/\s/g, '').toLocaleUpperCase('tr-TR');
export const supplierKey = (s: string) => s.trim().replace(/\s+/g, ' ').toLocaleLowerCase('tr-TR');
export function duplicateInvoice(invoices: Invoice[], supplier: string, number: string) {
  return !!number.trim() && invoices.some(i => supplierKey(i.supplier) === supplierKey(supplier) && invoiceNumber(i.supplierNo || '') === invoiceNumber(number));
}
export function trNumber(raw: string): number {
  const s = raw.trim().replace(/\s/g,'');
  return Number(s.includes(',') ? s.replace(/\./g,'').replace(',', '.') : s);
}
function isoDate(text: string, label: string) {
  const m = text.match(new RegExp(label + '\\s*:?\\s*(\\d{2})[./](\\d{2})[./](\\d{4})', 'i'));
  if (!m) return '';
  const out = `${m[3]}-${m[2]}-${m[1]}`;
  const d = new Date(out + 'T12:00:00');
  return Number.isFinite(d.getTime()) && d.getDate() === +m[1] && d.getMonth()+1 === +m[2] ? out : '';
}
/** Conservative reader for Turkish tabular invoices. Unknown formats remain manual. */
export function parseInvoiceText(text: string, products: Product[] = []): InvoiceDraft {
  const number = text.match(/Fatura\s*No\s*:?\s*([A-Z0-9-]{8,})/i)?.[1] || '';
  const currency = /\bUSD\b/.test(text) ? 'USD' : /\bEUR\b/.test(text) ? 'EUR' : 'TRY';
  const lines = text.split('\n');
  const blocks: string[] = [];
  for (const line of lines) {
    if (/^\s*\d+\s+\S+/.test(line)) blocks.push(line.trim());
    else if (blocks.length && !/Mal Hizmet Toplam|Toplam İskonto|Hesaplanan|Ödenecek|Vergiler Dahil/i.test(line)) blocks[blocks.length-1] += ' ' + line.trim();
  }
  const rows: ImportRow[] = [];
  const n = '([\\d.,]+)';
  const money = '(?:USD|EUR|TRY|TL|₺)';
  const re = new RegExp('^\\d+\\s+(\\S+)\\s+(.+?)\\s+'+n+'\\s+(Adet|Koli|Paket|KG|Kilogram|LT|Litre|Metre|M2|M3)\\s+'+n+'\\s*'+money+'\\s+%?'+n+'\\s*%?\\s+'+n+'\\s*'+money+'\\s+'+n+'\\s*'+money, 'i');
  for (const block of blocks) {
    const m = block.match(re); if (!m) continue;
    const qty=trNumber(m[3]), unitPrice=trNumber(m[5]), vatRate=trNumber(m[6]), net=trNumber(m[8]);
    if (!(qty>0 && unitPrice>=0 && vatRate>=0 && vatRate<=100 && net>=0)) continue;
    const name=m[2].trim();
    const matches=products.filter(p => p.name.trim().toLocaleLowerCase('tr-TR') === name.toLocaleLowerCase('tr-TR'));
    rows.push({code:m[1],name,qty,unit:m[4],unitPrice,vatRate,net,productId:matches.length===1 ? matches[0].id : '',createProduct:false});
  }
  // Prefer VAT-inclusive gross totals to payable totals (which can include deductions).
  // Match the denomination too, so the TL summary is never read as the foreign total.
  const totalFrom = (code: string) => {
    for (const label of ['Vergiler Dahil Toplam Tutar', 'Ödenecek Tutar']) {
      const suffix = code === 'TRY' ? '(?:\\s*\\(\\s*(?:TL|TRY)\\s*\\))?' : '';
      const unit = code === 'TRY' ? '(?:TRY|TL|₺)' : code;
      const r = new RegExp(label + suffix + '\\s*:?\\s*([\\d.,]+)\\s*' + unit + '(?![A-Z])', 'i');
      const m = text.match(r);
      if (m) return trNumber(m[1]);
    }
    return 0;
  };
  const total = totalFrom(currency);
  const totalTRY = totalFrom('TRY');
  return {number,date:isoDate(text,'Fatura Tarihi'),dueDate:isoDate(text,'Vade Tarihi'),currency,total,totalTRY,rows,text};
}
/** Effective rate printed into the invoice totals, not a live/official market quote.
 * Keep full precision for conversion; round only the displayed rate and final money.
 */
export function invoiceExchangeRate(currency: string, totalTRY: number, totalForeign: number): number | null {
  if(currency === 'TRY') return 1;
  if(!Number.isFinite(totalTRY) || !Number.isFinite(totalForeign) || totalTRY <= 0 || totalForeign <= 0) return null;
  const rate = totalTRY / totalForeign;
  return Number.isFinite(rate) && rate > 0 ? rate : null;
}
export function draftGross(rows: ImportRow[], rate: number) {
  return round2(rows.reduce((sum,r) => sum + r.net * (1+r.vatRate/100) * rate, 0));
}
/** Exact product IDs only for new imports. Legacy records fall back to unique exact name. */
export function applyInvoiceStock(products: Product[], invoice: Invoice): Product[] {
  const next=products.map(p=>({...p}));
  for (const l of invoice.lines) {
    const matches=l.productId ? next.filter(p=>p.id===l.productId) : next.filter(p=>p.name.trim().toLocaleLowerCase('tr-TR')===l.name.trim().toLocaleLowerCase('tr-TR'));
    if (matches.length===1) {
      const p=matches[0];p.stock=round2(p.stock+l.qty);p.cost=l.cost; if (l.sale && l.sale>0) p.p1=l.sale;
    } else if (matches.length===0 && l.createProduct && l.productId) {
      next.push({id:l.productId,name:l.name,barcode:'',category:'Diğer',unit:l.unit || 'adet',stock:l.qty,cost:l.cost,p1:l.sale || 0,p2:l.sale || 0,p3:l.sale || 0,critical:0,vatRate:l.vatRate,supplier:invoice.supplier});
    }
  }
  return next;
}
