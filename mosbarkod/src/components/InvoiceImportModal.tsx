import { useState } from 'react';
import { Btn, Inp, Modal, Sel } from './ui';
import { draftGross, parseInvoiceText, type InvoiceDraft, type ImportRow } from '../lib/invoiceImport';
import { round2, type Product } from '../data';
export default function InvoiceImportModal({text,products,onClose,onApply}:{text:string;products:Product[];onClose:()=>void;onApply:(d:InvoiceDraft,rate:number,pay:'nakit'|'pos'|'veresiye')=>void}) {
 const [draft,setDraft]=useState(()=>parseInvoiceText(text,products));
 const [rate,setRate]=useState(draft.currency==='TRY'?'1':'');
 const [pay,setPay]=useState('');const [checked,setChecked]=useState(false);
 const edit=(p:Partial<InvoiceDraft>)=>{setChecked(false);setDraft(d=>({...d,...p}));};
 const row=(i:number,p:Partial<ImportRow>)=>edit({rows:draft.rows.map((r,j)=>i===j?{...r,...p}:r)});
 const fx=Number(rate);const gross=draftGross(draft.rows,fx);
 const expected=draft.currency==='TRY'?draft.total:draft.totalTRY;
 const mismatch=expected>0&&Math.abs(gross-expected)>0.05;
 const sourceMismatch=draft.total>0&&Math.abs(draftGross(draft.rows,1)-draft.total)>0.05;
 const valid=draft.number.trim()&&draft.date&&fx>0&&Number.isFinite(fx)&&pay&&(pay!=='veresiye'||draft.dueDate)&&draft.rows.length>0&&expected>0&&!mismatch&&!sourceMismatch&&draft.rows.every(r=>r.name.trim()&&r.qty>0&&Number.isFinite(r.qty)&&r.net>=0&&Number.isFinite(r.net)&&r.vatRate>=0&&r.vatRate<=100&&(r.productId||r.createProduct));
 return <Modal title="PDF Kalem Kontrolü" onClose={onClose} w="max-w-6xl" footer={<><Btn onClick={onClose}>Vazgeç</Btn><Btn disabled={!valid||!checked} onClick={()=>onApply(draft,fx,pay as 'nakit'|'pos'|'veresiye')}>Onayla ve Fatura Formuna Aktar</Btn></>}>
  <p className="mb-3 text-sm text-amber">Bu işlem henüz stok değiştirmez. Satırları ve toplamı belgeyle karşılaştırın. Yanlış veya okunmayan satırları düzeltin. Mal kodu barkod olarak kaydedilmez. Koli/adet dönüşümü otomatik yapılmaz; miktar ve birimi kontrol edin.</p>
  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
   <label>Fatura No<Inp value={draft.number} onChange={e=>edit({number:e.target.value})}/></label>
   <label>Fatura Tarihi<Inp type="date" value={draft.date} onChange={e=>edit({date:e.target.value})}/></label>
   <label>Vade Tarihi<Inp type="date" value={draft.dueDate} onChange={e=>edit({dueDate:e.target.value})}/></label>
   <label>Ödeme Durumu<Sel value={pay} onChange={e=>{setChecked(false);setPay(e.target.value);}}><option value="">Seçiniz</option><option value="nakit">Ödendi — Nakit</option><option value="pos">Ödendi — Kart</option><option value="veresiye">Ödenmedi — Veresiye</option></Sel></label>
   <label>Belge Para Birimi<Sel value={draft.currency} onChange={e=>{edit({currency:e.target.value});setRate(e.target.value==='TRY'?'1':'');}}><option>TRY</option><option>USD</option><option>EUR</option></Sel></label>
   <label>1 döviz = kaç TL? (Fatura kuru)<Inp type="number" min="0" step="0.000001" value={rate} disabled={draft.currency==='TRY'} onChange={e=>{setChecked(false);setRate(e.target.value);}}/></label>
   <label>Belge Toplamı ({draft.currency})<Inp type="number" step="0.01" value={draft.total||''} onChange={e=>edit({total:Number(e.target.value)})}/></label>
   <label>Belgedeki Ödenecek TL<Inp type="number" step="0.01" value={draft.currency==='TRY'?draft.total||'':draft.totalTRY||''} onChange={e=>edit(draft.currency==='TRY'?{total:Number(e.target.value)}:{totalTRY:Number(e.target.value)})}/></label>
  </div>
  {draft.currency!=='TRY'&&draft.total>0&&draft.totalTRY>0&&<p className="my-2 text-sm">Toplamlardan hesaplanan yaklaşık kur: {(draft.totalTRY/draft.total).toFixed(6)}. Belgedeki kuru kontrol edip elle girin; güncel kur kullanılmaz.</p>}
  <div className="my-4 overflow-x-auto"><table className="w-full text-sm"><thead><tr>{['Mal Kodu','Ürün Adı','Miktar','Birim','Birim Fiyat (KDV hariç)','Satır Tutarı (İskonto sonrası, KDV hariç)','KDV %','Stok eşleştirme',''].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{draft.rows.map((r,i)=><tr key={i}>
   <td><Inp value={r.code} onChange={e=>row(i,{code:e.target.value})}/></td><td><Inp value={r.name} onChange={e=>row(i,{name:e.target.value})}/></td>
   <td><Inp type="number" min="0" step="any" value={r.qty} onChange={e=>row(i,{qty:Number(e.target.value)})}/></td>
   <td><Inp value={r.unit} onChange={e=>row(i,{unit:e.target.value})}/></td>
   <td><Inp type="number" step="any" value={r.unitPrice} onChange={e=>row(i,{unitPrice:Number(e.target.value)})}/></td>
   <td><Inp type="number" min="0" step="any" value={r.net} onChange={e=>row(i,{net:Number(e.target.value)})}/></td>
   <td><Inp type="number" min="0" max="100" value={r.vatRate} onChange={e=>row(i,{vatRate:Number(e.target.value)})}/></td>
   <td><Sel value={r.createProduct?'__new':r.productId} onChange={e=>row(i,{productId:e.target.value==='__new'?'':e.target.value,createProduct:e.target.value==='__new'})}><option value="">Ürün seçin</option><option value="__new">Yeni ürün oluştur</option>{products.map(p=><option key={p.id} value={p.id}>{p.name} ({p.unit})</option>)}</Sel></td>
   <td><button onClick={()=>edit({rows:draft.rows.filter((_,j)=>i!==j)})}>Sil</button></td>
  </tr>)}</tbody></table></div>
  <Btn onClick={()=>edit({rows:[...draft.rows,{code:'',name:'',qty:1,unit:'adet',unitPrice:0,vatRate:20,net:0,productId:'',createProduct:false}]})}>Eksik Satır Ekle</Btn>
  <p className="my-3">Aktarım maliyeti, iskonto sonrası satır tutarı ÷ miktar × (1 + KDV) × fatura kuru ile hesaplanır. Birim fiyat bilgi amaçlıdır; maliyet satır tutarından alınır. Yeni ürünün barkodu ve satış fiyatı ürün kartından tamamlanmalıdır.</p>
  <p className={mismatch?'text-red':'text-mint'}>Hesaplanan: {gross.toFixed(2)} TL · Belge: {expected.toFixed(2)} TL · Fark: {round2(gross-expected).toFixed(2)} TL (en fazla 0,05 TL yuvarlama farkı)</p>
  {sourceMismatch&&<p className="text-red">Kalemlerin döviz toplamı belge toplamıyla uyuşmuyor. Eksik satır, iskonto ve KDV bilgilerini kontrol edin.</p>}
  {!draft.rows.length&&<p className="text-red">Bu tablo düzeni otomatik ayrıştırılamadı. Metni kontrol ederek satır ekleyin.</p>}
  <details className="my-3"><summary>PDF'den çıkarılan metin</summary><pre className="max-h-60 overflow-auto whitespace-pre-wrap text-xs">{text}</pre></details>
  <label className="flex gap-2"><input type="checkbox" checked={checked} onChange={e=>setChecked(e.target.checked)}/> Tüm kalemleri, ürün eşleştirmelerini, birimleri, kuru ve toplamı kontrol ettim.</label>
 </Modal>;
}
