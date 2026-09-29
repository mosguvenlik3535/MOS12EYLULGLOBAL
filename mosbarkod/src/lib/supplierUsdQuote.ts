/** Informational USD valuation only. Never changes accounting or global FX rates. */
export interface SupplierUsdQuote { tryPerUsd:number; rateDate:string; fetchedAt:string; source:'ExchangeRate-API'|'Frankfurter' }
const KEY='mos_supplier_usd_quote_v1';
export function validSupplierQuote(value:unknown): value is SupplierUsdQuote {
 if(!value || typeof value!=='object')return false;
 const q=value as SupplierUsdQuote;
 return Number.isFinite(q.tryPerUsd)&&q.tryPerUsd>0&&['ExchangeRate-API','Frankfurter'].includes(q.source)&&Number.isFinite(Date.parse(q.rateDate))&&Number.isFinite(Date.parse(q.fetchedAt));
}
export function parseSupplierQuote(data:unknown,source:SupplierUsdQuote['source']):SupplierUsdQuote|null {
 if(!data||typeof data!=='object')return null;
 const d=data as Record<string,unknown>;
 if((d.base_code??d.base)!=='USD'||(d.result!==undefined&&d.result!=='success'))return null;
 const rates=d.rates as Record<string,unknown>|undefined;
 const rawDate=source==='ExchangeRate-API'?(typeof d.time_last_update_unix==='number'?d.time_last_update_unix*1000:NaN):d.date;
 const time=typeof rawDate==='number'?rawDate:typeof rawDate==='string'?Date.parse(rawDate):NaN;
 if(!Number.isFinite(time)||Math.abs(time)>8.64e15||time>Date.now()+86400000)return null;
 const quote={tryPerUsd:rates?.TRY,rateDate:new Date(time).toISOString(),fetchedAt:new Date().toISOString(),source};
 return validSupplierQuote(quote)?quote:null;
}
export function readSupplierQuote():SupplierUsdQuote|null {
 try{const q=JSON.parse(localStorage.getItem(KEY)||'null');return validSupplierQuote(q)?q:null;}catch{return null;}
}
export async function fetchSupplierQuote():Promise<SupplierUsdQuote|null> {
 for(const [url,source] of [ ['https://open.er-api.com/v6/latest/USD','ExchangeRate-API'], ['https://api.frankfurter.dev/v1/latest?base=USD&symbols=TRY','Frankfurter'] ] as const){
  const ctrl=new AbortController();const timer=setTimeout(()=>ctrl.abort(),8000);
  try{const res=await fetch(url,{signal:ctrl.signal});if(!res.ok)continue;const q=parseSupplierQuote(await res.json(),source);if(q){try{localStorage.setItem(KEY,JSON.stringify(q));}catch{/* display still works without storage */}return q;}}catch{/* try alternate provider */}finally{clearTimeout(timer);}
 }
 return null;
}
export function supplierUsdEquivalent(tl:number,quote:SupplierUsdQuote|null):number|null {
 return quote&&validSupplierQuote(quote)&&Number.isFinite(tl)?tl/quote.tryPerUsd:null;
}
