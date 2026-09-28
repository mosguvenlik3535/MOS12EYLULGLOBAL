import { describe, expect, it } from 'vitest';
import { applyInvoiceStock, duplicateInvoice, draftGross, parseInvoiceText, trNumber } from './invoiceImport';
import type { Invoice, Product } from '../data';
const text=`Fatura No: TEST2026000000001
Fatura Tarihi: 28.09.2026 16:52
Vade Tarihi: 28.09.2026
1 NTC-796 KABLO-NIVATCH NTC-796 BNC KABLOSU 10 Adet 0,5 USD %20,00 1,00 USD 5,00 USD
2 TGG-121 KABLO-TEKNOGREEN TGG-121 DC-BNC HAZIR KABLO 10 Adet 0,75 USD %20,00 1,50 USD 7,50 USD
3 DS-7104HGHI-M1 DVR-HIKVISION DS-7104HGHI-M1 4 KANAL HD-TVI KAYIT 1 Adet 37 USD %20,00 7,40 USD 37,00 USD
4 DS-2CE16D0T-EXLPF28 GK-HIKVISION DS-2CE16D0T-EXLPF 2MP 2.8MM SMART HYBRID LIGHT BULLET KAMERA 3 Adet 14 USD %20,00 8,40 USD 42,00 USD
5 TRK-103 KUTU_GK TRK-103 YUVARLAK KAMERA KUTUSU 10 Adet 0,5 USD %20,00 1,00 USD 5,00 USD
Mal Hizmet Toplam Tutarı 96,50 USD
Toplam İskonto 0,00 USD
Hesaplanan KDV(%20) 19,30 USD
Vergiler Dahil Toplam Tutar 115,80 USD
Ödenecek Tutar 115,80 USD
Mal Hizmet Toplam Tutarı(TL) 4.727,92 TL
Ödenecek Tutar(TL) 5.673,51 TL`;
const product=(id:string,name:string):Product=>({id,name,barcode:'123',category:'Diğer',stock:1,unit:'adet',cost:1,p1:5,p2:5,p3:5,critical:0});
const invoice=(lines:Invoice['lines']):Invoice=>({id:'i',no:'1',date:'2026-09-28',supplier:'Test',supplierNo:'ABC123',payType:'nakit',total:100,status:'odendi',lines});
describe('invoice import',()=>{
 it('parses the supplied screenshot transcription (not the original inaccessible PDF)',()=>{
  const d=parseInvoiceText(text);expect(d.number).toBe('TEST2026000000001');expect(d.date).toBe('2026-09-28');expect(d.dueDate).toBe(d.date);expect(d.currency).toBe('USD');expect(d.total).toBe(115.8);expect(d.totalTRY).toBe(5673.51);expect(d.rows).toHaveLength(5);expect(d.rows.reduce((s,r)=>s+r.qty,0)).toBe(34);expect(draftGross(d.rows,1)).toBe(115.8);expect(draftGross(d.rows,5673.51/115.8)).toBe(5673.51);
 });
 it('does not treat supplier code as barcode or auto-create products',()=>{const d=parseInvoiceText(text);expect(d.rows[0]).toMatchObject({code:'NTC-796',productId:'',createProduct:false});});
 it('proposes only unique exact name matches',()=>{const name=parseInvoiceText(text).rows[0].name;expect(parseInvoiceText(text,[product('1',name)]).rows[0].productId).toBe('1');expect(parseInvoiceText(text,[product('1',name),product('2',name)]).rows[0].productId).toBe('');});
 it('leaves unsupported layouts for manual review',()=>{expect(parseInvoiceText('scanned / unsupported text').rows).toEqual([]);});
 it('parses Turkish numbers and invalid dates conservatively',()=>{expect(trNumber('5.673,51')).toBe(5673.51);expect(parseInvoiceText('Fatura Tarihi: 31.02.2026').date).toBe('');});
 it('recognizes duplicate normalized supplier and document numbers',()=>{expect(duplicateInvoice([invoice([])],' TEST ',' abc123 ')).toBe(true);expect(duplicateInvoice([invoice([])],'Other','ABC123')).toBe(false);expect(duplicateInvoice([invoice([])],'Test','')).toBe(false);});
 it('updates exact product IDs only and sums repeated rows',()=>{const ps=[product('1','Kablo'),product('2','Kablo Uzun')];const updated=applyInvoiceStock(ps,invoice([{name:'Kablo',productId:'1',qty:2,cost:10},{name:'Kablo',productId:'1',qty:3,cost:12}]));expect(updated[0].stock).toBe(6);expect(updated[0].cost).toBe(12);expect(updated[1].stock).toBe(1);expect(ps[0].stock).toBe(1);});
 it('never uses substring matching for legacy lines',()=>{expect(applyInvoiceStock([product('1','Kablo Uzun')],invoice([{name:'Kablo',qty:3,cost:2}]))[0].stock).toBe(1);});
 it('creates a new product only when explicitly approved, without a made-up barcode',()=>{const out=applyInvoiceStock([],invoice([{name:'Yeni',productId:'new',createProduct:true,qty:10,cost:12,vatRate:20,unit:'adet',sourceCode:'SUP-123'}]));expect(out[0]).toMatchObject({id:'new',barcode:'',stock:10,p1:0,cost:12});expect(applyInvoiceStock([],invoice([{name:'Yeni',qty:10,cost:12}]))).toEqual([]);});
 it('uses discounted row amount as the cost basis, not listed unit price',()=>{const d=parseInvoiceText(text);d.rows=[{...d.rows[0],unitPrice:10,qty:10,net:80}];expect(draftGross(d.rows,1)).toBe(96);});
});
