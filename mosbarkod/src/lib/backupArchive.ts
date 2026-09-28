import JSZip from 'jszip';
import { loadInvoiceAttachments, replaceInvoiceAttachments } from './invoiceAttachments';
import type { AppState } from '../data';
import { buildBackupFile, checksumOf, type BackupFile, type BackupScope, type ParseResult } from './backup';
export const MAX_BACKUP_BYTES=200*1024*1024;
export async function collectBackupFile(data:Partial<AppState>,scope:BackupScope):Promise<BackupFile> {
 // Freeze the state before the asynchronous attachment read.
 const file=buildBackupFile(JSON.parse(JSON.stringify(data)),scope);
 if(scope==='settings')return file;
 const legacy=JSON.parse(localStorage.getItem('mosbarkod_purchase_images')||'{}');
 const all={...legacy,...await loadInvoiceAttachments()};
 const attachments:Record<string,string>=Object.create(null);
 for(const inv of file.data.invoices||[]) if(typeof all[inv.id]==='string'){if(!/^data:(application\/pdf|image\/(jpeg|png|webp|gif));base64,[A-Za-z0-9+/]*={0,2}$/.test(all[inv.id]))throw new Error('Fatura belgesi yedeklenemedi: desteklenmeyen veya bozuk ek.');attachments[inv.id]=all[inv.id];}
 file.attachments=attachments;file.attachmentChecksum=checksumOf(JSON.stringify(attachments));file.version=3;
 return file;
}
export async function zipBackup(file:BackupFile):Promise<Uint8Array<ArrayBuffer>> {
 const json=JSON.stringify(file);
 if(new TextEncoder().encode(json).length>MAX_BACKUP_BYTES)throw new Error('Yedek 200 MB sınırını aşıyor. Belgeleri ayrıca arşivleyin.');
 const zip=new JSZip();zip.file('backup.json',json);
 return new Uint8Array(await zip.generateAsync({type:'uint8array',compression:'DEFLATE',compressionOptions:{level:6}}));
}
export async function readBackupBytes(bytes:Uint8Array):Promise<string> {
 if(bytes.byteLength>MAX_BACKUP_BYTES)throw new Error('Yedek dosyası çok büyük (200 MB sınırı).');
 if(bytes[0]!==0x50||bytes[1]!==0x4b)return new TextDecoder().decode(bytes);
 const zip=await JSZip.loadAsync(bytes,{checkCRC32:false});
 const entry=zip.file('backup.json');if(!entry)throw new Error('ZIP içinde backup.json bulunamadı.');
 // Check advertised inflated size before allocating; stream enforces actual limit too.
 const size=(entry as unknown as {_data?:{uncompressedSize?:number}})._data?.uncompressedSize;
 if(size!==undefined && size>MAX_BACKUP_BYTES)throw new Error('Açılmış yedek 200 MB sınırını aşıyor.');
 return new Promise((resolve,reject)=>{let total=0;const chunks:Uint8Array[]=[];const stream=(entry as unknown as {internalStream:(type:string)=>{on:(event:string,cb:(arg:any)=>void)=>void;pause:()=>void;resume:()=>void}}).internalStream('uint8array');stream.on('data',(chunk:Uint8Array)=>{total+=chunk.length;if(total>MAX_BACKUP_BYTES){stream.pause();reject(new Error('Açılmış yedek çok büyük.'));return;}chunks.push(chunk);});stream.on('error',reject);stream.on('end',()=>{const out=new Uint8Array(total);let offset=0;for(const c of chunks){out.set(c,offset);offset+=c.length;}resolve(new TextDecoder().decode(out));});stream.resume();});
}
export async function restoreBackupAttachments(parsed:ParseResult) {
 if(!parsed.ok||parsed.scope==='settings'||parsed.attachments===undefined)return;
 await replaceInvoiceAttachments(parsed.attachments);
 // The new archive is authoritative, including when an invoice has no attachment.
 localStorage.removeItem('mosbarkod_purchase_images');
}
