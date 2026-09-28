const DB='mos_invoice_attachments';
async function openDB(): Promise<IDBDatabase> {
 return new Promise((resolve,reject)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore('files');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
}
export async function saveInvoiceAttachment(id:string,data:string) {
 const db=await openDB();try {await new Promise<void>((resolve,reject)=>{const tx=db.transaction('files','readwrite');tx.objectStore('files').put(data,id);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}finally{db.close();}
}
export async function loadInvoiceAttachments(): Promise<Record<string,string>> {
 const db=await openDB();try{return await new Promise((resolve,reject)=>{const out:Record<string,string>={};const tx=db.transaction('files','readonly');const r=tx.objectStore('files').openCursor();r.onsuccess=()=>{const c=r.result;if(c){out[String(c.key)]=c.value;c.continue();}};tx.oncomplete=()=>resolve(out);tx.onerror=()=>reject(tx.error);});}finally{db.close();}
}
export async function readAttachment(file:File):Promise<string> {
 if(file.size>10*1024*1024) throw new Error('Belge en fazla 10 MB olabilir.');
 const bytes=new Uint8Array(await file.slice(0,12).arrayBuffer());
 const pdf=new TextDecoder().decode(bytes).startsWith('%PDF-');
 const image=(bytes[0]===0xff&&bytes[1]===0xd8)||(bytes[0]===0x89&&bytes[1]===0x50)||(new TextDecoder().decode(bytes).startsWith('RIFF')&&new TextDecoder().decode(bytes).slice(8)==='WEBP');
 if(!pdf&&!image) throw new Error('Yalnızca PDF, JPEG, PNG veya WebP belgeleri eklenebilir.');
 const type=pdf?'application/pdf':bytes[0]===0xff?'image/jpeg':bytes[0]===0x89?'image/png':'image/webp';
 return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result));r.onerror=()=>reject(new Error('Dosya okunamadı.'));r.readAsDataURL(new Blob([file],{type}));});
}
export async function deleteInvoiceAttachment(id?:string) {
 const db=await openDB();try {await new Promise<void>((resolve,reject)=>{const tx=db.transaction('files','readwrite');const store=tx.objectStore('files');if(id)store.delete(id);else store.clear();tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}finally{db.close();}
}
/** Atomic replacement: a quota/transaction failure keeps the old attachment archive. */
export async function replaceInvoiceAttachments(files:Record<string,string>) {
 const db=await openDB();try {await new Promise<void>((resolve,reject)=>{const tx=db.transaction('files','readwrite');const store=tx.objectStore('files');store.clear();for(const [id,data] of Object.entries(files))store.put(data,id);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}finally{db.close();}
}
