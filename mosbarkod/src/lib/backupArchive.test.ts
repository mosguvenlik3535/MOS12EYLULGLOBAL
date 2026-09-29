import 'fake-indexeddb/auto';
import { beforeEach,describe,it,expect,vi } from 'vitest';
import JSZip from 'jszip';
import { defaultState,type Invoice } from '../data';
import { collectBackupFile,zipBackup,readBackupBytes,restoreBackupAttachments } from './backupArchive';
import { parseBackupFile,buildBackupFile,createSnapshot,readBackup,listBackups,deleteBackup,checksumOf } from './backup';
import { saveInvoiceAttachment,loadInvoiceAttachments,deleteInvoiceAttachment } from './invoiceAttachments';
import { packForCloud,unpackFromCloud,encryptCloudText,cloudUpload,cloudDownloadText } from './cloudBackup';
const pdf='data:application/pdf;base64,JVBERi0xLjc=';
const photo='data:image/png;base64,iVBORw==';
function state(){const s=defaultState();s.invoices=[{id:'invoice-1',supplier:'Test',date:'2026-09-29',no:'1',lines:[],payType:'nakit',status:'odendi',total:0} as Invoice];return s;}
beforeEach(async()=>{const values=new Map<string,string>();vi.stubGlobal('localStorage',{getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>values.set(k,v),removeItem:(k:string)=>values.delete(k)});await deleteInvoiceAttachment();});
describe('document-inclusive ZIP backups',()=>{
 it('preserves supplier receivables in ZIP with invoice documents',async()=>{const s=state();s.supplierCredits=[{id:'credit-1',supplier:'Test',date:'2026-09-29',type:'payment',amount:10000,customer:'Test Customer',reference:'SLIP1',note:''}];await saveInvoiceAttachment('invoice-1',pdf);const parsed=parseBackupFile(await readBackupBytes(await zipBackup(await collectBackupFile(s,'full'))),s);expect(parsed.ok).toBe(true);if(parsed.ok){expect(parsed.data.supplierCredits).toEqual(s.supplierCredits);expect(parsed.attachments?.['invoice-1']).toBe(pdf);}});

 it('round trips PDF and restores exact invoice association',async()=>{const s=state();await saveInvoiceAttachment('invoice-1',pdf);const file=await collectBackupFile(s,'full');const zip=await zipBackup(file);expect(zip[0]).toBe(0x50);const parsed=parseBackupFile(await readBackupBytes(zip),s);expect(parsed.ok).toBe(true);await deleteInvoiceAttachment();await restoreBackupAttachments(parsed);expect((await loadInvoiceAttachments())['invoice-1']).toBe(pdf);});
 it('collects legacy photos but excludes orphan attachments',async()=>{const s=state();localStorage.setItem('mosbarkod_purchase_images',JSON.stringify({'invoice-1':photo,orphan:pdf}));const file=await collectBackupFile(s,'data');expect(file.attachments).toEqual({'invoice-1':photo});});
 it('settings-only backup never exports or replaces documents',async()=>{await saveInvoiceAttachment('invoice-1',pdf);const s=state();const file=await collectBackupFile({settings:s.settings},'settings');expect(file.attachments).toBeUndefined();await restoreBackupAttachments(parseBackupFile(JSON.stringify(file),s));expect((await loadInvoiceAttachments())['invoice-1']).toBe(pdf);});
 it('old JSON and v2 backups remain loadable and leave attachments untouched',async()=>{const s=state();await saveInvoiceAttachment('invoice-1',pdf);for(const text of [JSON.stringify(s),JSON.stringify(buildBackupFile(s,'full'))]){const p=parseBackupFile(await readBackupBytes(new TextEncoder().encode(text)),s);expect(p.ok).toBe(true);await restoreBackupAttachments(p);}expect((await loadInvoiceAttachments())['invoice-1']).toBe(pdf);});
 it('rejects corrupted attachments before restore',async()=>{const s=state();await saveInvoiceAttachment('invoice-1',pdf);const f=await collectBackupFile(s,'full');f.attachments!['invoice-1']=photo;const p=parseBackupFile(JSON.stringify(f),s);expect(p.ok).toBe(false);await restoreBackupAttachments(p);expect((await loadInvoiceAttachments())['invoice-1']).toBe(pdf);});
 it('empty new archive clears stale attachments while old JSON does not',async()=>{const s=state();const f=await collectBackupFile(s,'full');await saveInvoiceAttachment('invoice-1',pdf);localStorage.setItem('mosbarkod_purchase_images',JSON.stringify({'invoice-1':photo}));await restoreBackupAttachments(parseBackupFile(JSON.stringify(f),s));expect(await loadInvoiceAttachments()).toEqual({});expect(localStorage.getItem('mosbarkod_purchase_images')).toBeNull();});
 it('rejects unknown or active attachment payloads',async()=>{const s=state();const f=await collectBackupFile(s,'full');f.attachments={'invoice-1':'data:text/html;base64,YQ=='};f.attachmentChecksum=checksumOf(JSON.stringify(f.attachments));expect(parseBackupFile(JSON.stringify(f),s).ok).toBe(false);});
 it('snapshot export retains historical attachments instead of current files',async()=>{const s=state();await saveInvoiceAttachment('invoice-1',pdf);const meta=await createSnapshot(s,'auto',7);expect(meta).not.toBeNull();expect(listBackups()).toHaveLength(1);await saveInvoiceAttachment('invoice-1',photo);const f=await readBackup(meta!.id);expect(f!.attachments!['invoice-1']).toBe(pdf);await deleteBackup(meta!.id);expect(await readBackup(meta!.id)).toBeNull();});
 it('does not report success if the metadata index cannot be stored',async()=>{vi.spyOn(localStorage,'setItem').mockImplementation(()=>{throw Error('quota');});expect(await createSnapshot(state(),'auto',7)).toBeNull();});
 it('rejects ZIPs with missing manifest',async()=>{const z=new JSZip();z.file('other.txt','none');await expect(readBackupBytes(await z.generateAsync({type:'uint8array'}))).rejects.toThrow('backup.json');});
 it('cloud unencrypted payload is a real ZIP containing documents',async()=>{const s=state();await saveInvoiceAttachment('invoice-1',pdf);const packed=await packForCloud(s,{...s.settings.cloud,encrypt:false});expect(packed.name.endsWith('.zip')).toBe(true);const text=await readBackupBytes(new Uint8Array(await packed.blob.arrayBuffer()));expect(parseBackupFile(await unpackFromCloud(text,s.settings.cloud),s).ok).toBe(true);expect(JSON.parse(text).attachments['invoice-1']).toBe(pdf);});
 it('encrypted cloud ZIP and old encrypted JSON round trip',async()=>{const s=state(),cfg={...s.settings.cloud,encrypt:true,encryptPass:'test-only'};await saveInvoiceAttachment('invoice-1',pdf);const packed=await packForCloud(s,cfg);const plain=await unpackFromCloud(await packed.blob.text(),cfg);expect(JSON.parse(plain).attachments['invoice-1']).toBe(pdf);const old=await encryptCloudText(JSON.stringify(buildBackupFile(s,'full')),'test-only');expect(parseBackupFile(await unpackFromCloud(old,cfg),s).ok).toBe(true);});
});

describe('cloud ZIP binary transport',()=>{
 it('uses lossless base64 at the Electron bridge boundary',async()=>{
  const s=state();await saveInvoiceAttachment('invoice-1',pdf);let saved='';
  const http=vi.fn(async(req:any)=>{if(req.url.endsWith('/upload')){expect(req.bodyEncoding).toBe('base64');saved=req.body;return {status:200,body:'{}'};}expect(req.responseEncoding).toBe('base64');return {status:200,body:saved};});
  vi.stubGlobal('window',{mosCloud:{http}});
  try{const cfg={...s.settings.cloud,provider:'dropbox' as const,dropboxToken:'test',folder:'',encrypt:false};expect((await cloudUpload(cfg,s)).ok).toBe(true);expect(Buffer.from(saved,'base64').subarray(0,2).toString()).toBe('PK');const text=await cloudDownloadText(cfg,{id:'a',name:'a.zip',size:1,modified:''});expect(JSON.parse(text).attachments['invoice-1']).toBe(pdf);}finally{vi.unstubAllGlobals();}
 });
 it('uses binary bytes with browser fetch, not a UTF-8 ZIP string',async()=>{
  const s=state();let bytes=new Uint8Array();vi.stubGlobal('window',{});
  vi.stubGlobal('fetch',vi.fn(async(url:string,init:any)=>{if(url.endsWith('/upload')){bytes=new Uint8Array(init.body);return new Response('{}',{status:200});}return new Response(bytes,{status:200});}));
  try{const cfg={...s.settings.cloud,provider:'dropbox' as const,dropboxToken:'test',folder:'',encrypt:false};expect((await cloudUpload(cfg,s)).ok).toBe(true);expect(bytes[0]).toBe(0x50);expect(parseBackupFile(await cloudDownloadText(cfg,{id:'a',name:'a.zip',size:1,modified:''}),s).ok).toBe(true);}finally{vi.unstubAllGlobals();}
 });
});
