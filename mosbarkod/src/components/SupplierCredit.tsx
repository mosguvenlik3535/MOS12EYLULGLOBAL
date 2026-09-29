import { useState } from 'react';
import { Btn, Confirm, Inp, Sel, Stat } from './ui';
import { dstr, fmt, todayKey, uid, round2, type Customer, type Invoice } from '../data';
import { supplierEntryError, supplierKey, supplierTotals, type SupplierCreditEntry } from '../lib/supplierCredit';

type Props={entries:SupplierCreditEntry[];update:(fn:(entries:SupplierCreditEntry[])=>SupplierCreditEntry[])=>void;invoices:Invoice[];customers:Customer[];toast:(text:string,tone?:'err'|'ok')=>void};
const labels={payment:'Müşteriden doğrudan ödeme',invoice:'Ürün / mal çekişi (bakiyeden düş)',refund:'Toptancıdan iade / alacağı kapatma'};
export default function SupplierCredit({entries,update,invoices,customers,toast}:Props){
 const [supplier,setSupplier]=useState(''); const [date,setDate]=useState(todayKey());
 const [type,setType]=useState<SupplierCreditEntry['type']>('payment');
 const [amount,setAmount]=useState('');const [customer,setCustomer]=useState('');const [reference,setReference]=useState('');const [note,setNote]=useState('');const [invoiceId,setInvoiceId]=useState('');
 const [voidId,setVoidId]=useState('');const [showVoided,setShowVoided]=useState(false);
 const names=Array.from(new Map([...entries.map(e=>e.supplier),...invoices.map(i=>i.supplier)].filter(Boolean).map(n=>[supplierKey(n),n])).values()).sort((a,b)=>a.localeCompare(b,'tr'));
 const key=supplierKey(supplier);const selected=entries.filter(e=>supplierKey(e.supplier)===key);const totals=supplierTotals(selected);
 const all=names.map(name=>({name,...supplierTotals(entries.filter(e=>supplierKey(e.supplier)===supplierKey(name)))}));
 const outstanding=round2(all.reduce((s,e)=>s+Math.max(0,e.balance),0));const debt=round2(all.reduce((s,e)=>s+Math.max(0,-e.balance),0));
 const reset=()=>{setAmount('');setCustomer('');setReference('');setNote('');setInvoiceId('');};
 const withdrawalAmount=round2(Number(amount.replace(',','.')));
 const remaining=round2(totals.balance-(Number.isFinite(withdrawalAmount)&&withdrawalAmount>0?withdrawalAmount:0));
 const save=()=>{
  const linked=invoiceId?invoices.find(i=>i.id===invoiceId):undefined;
  if(invoiceId && !linked){toast('Bağlı fatura bulunamadı. Faturayı yeniden seçin.','err');return;}
  const entry:SupplierCreditEntry={id:uid(),supplier:(linked?.supplier||supplier).trim(),date:linked?linked.date.slice(0,10):date,type,amount:linked?linked.total:round2(Number(amount.replace(',','.'))),customer:customer.trim(),reference:linked?(linked.supplierNo||linked.no):reference.trim(),note:note.trim(),...(linked?{invoiceId:linked.id}:{})};
  const error=supplierEntryError(entry,entries);if(error){toast(error,'err');return;}
  update(current=>supplierEntryError(entry,current)?current:[entry,...current]);reset();toast(type==='invoice'?'Ürün / mal çekişi kaydedildi; tutar toptancı alacağınızdan düşüldü.':'Toptancı hesap hareketi kaydedildi.');
 };
 return <div className="h-full overflow-y-auto p-4 space-y-4">
  <div><h2 className="font-bold text-xl">TOPTANCI ALACAKLARI</h2><p className="text-sm text-mut">Müşteriden toptancıya doğrudan ödeme − KDV dahil ürün / mal çekişleri − iade / kapatma = alacağınız.</p></div>
  <div className="grid gap-3 sm:grid-cols-2"><Stat label="Toptancılardan toplam alacağınız" value={fmt(outstanding,'TRY')} tone="mint"/><Stat label="Toptancılara toplam borcunuz" value={fmt(debt,'TRY')} tone="red"/></div>
  <p className="rounded-lg border border-amber/40 p-3 text-sm">Bu bölüm ayrı bir takip defteridir. Kasa, sizin POS cironuz, stok ve müşteri veresiye bakiyesi değişmez; alış faturası ödeme durumu da otomatik kapanmaz. Aynı ödemeyi ayrıca kasa tahsilatı olarak girmeyin. Tüm tutarlar TL ve KDV dahildir.</p>
  <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
   <aside className="space-y-2"><h3 className="font-bold">Toptancı hesapları</h3>{all.length===0&&<p className="text-mut text-sm">İlk hareket için toptancı adını yazın.</p>}{all.map(e=><button key={supplierKey(e.name)} className={'w-full rounded-lg border p-3 text-left '+(key===supplierKey(e.name)?'border-amber':'border-line')} onClick={()=>{setSupplier(e.name);reset();}}><strong className="block">{e.name}</strong><span className={e.balance<0?'text-red':'text-mint'}>{fmt(Math.abs(e.balance),'TRY')} · {e.balance>0?'Alacağınız':e.balance<0?'Borcunuz':'Hesap kapalı'}</span></button>)}</aside>
   <section className="space-y-4 min-w-0">
    <div className="rounded-lg border border-mint/40 p-4 space-y-2"><p className="font-bold">{supplier||'Seçilen toptancı'} · {totals.balance<0?'Mevcut borcunuz':'Mevcut alacağınız'}: {fmt(Math.abs(totals.balance),'TRY')}</p><Btn v="mint" disabled={!supplier.trim()} onClick={()=>{setType('invoice');reset();setDate(todayKey());}}>Alacağımdan Ürün / Mal Çek</Btn><p className="text-sm text-mut">Toptancıyı seçin, bu düğmeye basın ve aşağıdaki forma çektiğiniz malın KDV dahil TL tutarını girin veya alış faturasını seçin. Kaydedince kalan alacağınız otomatik azalır.</p></div>
    <div className="rounded-lg border border-line p-4 space-y-3"><h3 className="font-bold">Hesap hareketi ekle</h3>
     <div className="grid gap-3 sm:grid-cols-2">
      <label>Toptancı adı *<Inp list="supplier-credit-names" value={supplier} onChange={e=>{setSupplier(e.target.value);setInvoiceId('');}}/><datalist id="supplier-credit-names">{names.map(n=><option key={n} value={n}/>)}</datalist></label>
      <label>İşlem türü<Sel value={type} onChange={e=>{setType(e.target.value as SupplierCreditEntry['type']);reset();}}>{Object.entries(labels).map(([v,l])=><option key={v} value={v}>{l}</option>)}</Sel></label>
      {type==='invoice'&&<label>Kayıtlı alış faturası (isteğe bağlı)<Sel value={invoiceId} onChange={e=>{const i=invoices.find(i=>i.id===e.target.value);setInvoiceId(e.target.value);if(i){setSupplier(i.supplier);setReference(i.supplierNo||i.no);setAmount(String(i.total));setDate(i.date.slice(0,10));}}}><option value="">Elle fatura bilgisi gir</option>{invoices.filter(i=>supplierKey(i.supplier)===key).map(i=><option key={i.id} value={i.id}>{i.supplierNo||i.no} · {fmt(i.total,'TRY')}</option>)}</Sel></label>}
      <label>Tarih *<Inp type="date" value={date} disabled={!!invoiceId} onChange={e=>setDate(e.target.value)}/></label>
      <label>Tutar (TL, KDV dahil) *<Inp type="number" min="0.01" step="0.01" value={amount} disabled={!!invoiceId} onChange={e=>setAmount(e.target.value)}/></label>
      {type==='payment'&&<label>Ödeme yapan müşteri *<Inp list="supplier-credit-customers" value={customer} onChange={e=>setCustomer(e.target.value)}/><datalist id="supplier-credit-customers">{customers.map(c=><option key={c.id} value={c.name}/>)}</datalist></label>}
      <label>{type==='invoice'?'Fatura / irsaliye numarası *':'İşlem / slip referansı'}<Inp value={reference} disabled={!!invoiceId} onChange={e=>setReference(e.target.value)}/></label>
      <label>Açıklama<Inp value={note} onChange={e=>setNote(e.target.value)} placeholder={type==='payment'?'Toptancının POS cihazından kredi kartı ödemesi':'İşlem açıklaması'}/></label>
     </div>
     {type==='invoice'&&<p className="text-sm text-mut">Bu mal çekişinin tutarı mevcut alacağınızdan düşülür. Aynı alıma ait fatura daha önce bu deftere girildiyse tekrar kaydetmeyin. Tutar bu deftere bir kez kaydedilir; yeni stok veya gider oluşturulmaz. Bağlı faturanın sonraki değişiklikleri bu tutarı değiştirmez. Düzeltmek için hareketi iptal edip yeniden ekleyin.</p>}
     {type==='refund'&&<p className="text-sm text-mut">Toptancı alacağınızı geri ödediğinde veya başka şekilde kapattığında kullanın. Bu kayıt kasa hareketi oluşturmaz.</p>}
     {type==='invoice'&&<div className="rounded-lg border border-line p-3" aria-live="polite"><p>Çekiş öncesi net bakiye: {fmt(totals.balance,'TRY')}</p><p className="font-bold">{remaining<0?'Çekiş sonrası toptancıya borcunuz':'Çekiş sonrası kalan alacağınız'}: {fmt(Math.abs(remaining),'TRY')}</p>{remaining<0&&<p className="text-amber">Mal tutarı alacağınızı aşıyor. Kaydederseniz aşan tutar borcunuz olarak görünecek.</p>}<p className="text-sm text-mut">Bu bir ön izlemedir; bakiye yalnızca kaydettiğinizde değişir. Stok girişi Alış Faturası bölümünden yapılır.</p></div>}
     <Btn v="primary" onClick={save}>{type==='invoice'?'Mal Çekişini Kaydet ve Bakiyeden Düş':'Hareketi Kaydet'}</Btn>
    </div>
    <div className="rounded-lg border border-line p-4"><h3 className="font-bold">{supplier||'Seçilen toptancı'} — hesap özeti</h3><p>Doğrudan ödeme: {fmt(totals.payments,'TRY')} · Ürün / mal çekişi: {fmt(totals.invoices,'TRY')} · İade / kapatma: {fmt(totals.refunds,'TRY')}</p><p className={'text-lg font-bold '+(totals.balance<0?'text-red':'text-mint')}>{totals.balance<0?'Toptancıya borcunuz':'Toptancıdan alacağınız'}: {fmt(Math.abs(totals.balance),'TRY')}</p></div>
    <label className="flex gap-2"><input type="checkbox" checked={showVoided} onChange={e=>setShowVoided(e.target.checked)}/>İptal edilmiş hareketleri göster</label>
    <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr>{['Tarih','İşlem','Müşteri / Referans','Tutar (TL)','Açıklama',''].map((h,i)=><th className="p-2 text-left" key={i}>{h}</th>)}</tr></thead><tbody>{selected.filter(e=>showVoided||!e.voided).sort((a,b)=>b.date.localeCompare(a.date)).map(e=><tr key={e.id} className={'border-t border-line '+(e.voided?'opacity-50':'')}><td className="p-2">{dstr(e.date)}</td><td>{labels[e.type]}{e.voided?' (İptal)':''}</td><td>{e.customer}<br/>{e.reference}{e.invoiceId&&<span className="block text-mut">Alış faturası bağlantılı</span>}</td><td className="whitespace-nowrap">{e.type==='payment'?'+':'−'}{fmt(e.amount,'TRY')}</td><td>{e.note}</td><td>{!e.voided&&<Btn v="danger" onClick={()=>setVoidId(e.id)}>İptal</Btn>}</td></tr>)}</tbody></table>{selected.length===0&&<p className="p-3 text-mut">Bu toptancı için henüz hareket yok.</p>}</div>
   </section>
  </div>
  {voidId&&<Confirm title="Hareketi iptal et" msg="Bu hareket bakiyeden çıkarılacak, geçmişte iptal edilmiş olarak saklanacaktır. Bağlı alış faturası, stok ve kasa değişmez. Devam edilsin mi?" label="Hareketi İptal Et" onCancel={()=>setVoidId('')} onOk={()=>{update(current=>current.map(e=>e.id===voidId?{...e,voided:true}:e));setVoidId('');}}/>}
 </div>;
}
