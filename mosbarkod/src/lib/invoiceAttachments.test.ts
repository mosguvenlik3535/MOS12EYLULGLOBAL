import 'fake-indexeddb/auto';
import { describe,it,expect } from 'vitest';
import { saveInvoiceAttachment,loadInvoiceAttachments,deleteInvoiceAttachment,readAttachment } from './invoiceAttachments';
describe('local invoice attachment archive',()=>{
 it('persists, replaces, deletes, and clears without localStorage quota',async()=>{
  await saveInvoiceAttachment('one','data:application/pdf;base64,YQ==');
  expect((await loadInvoiceAttachments()).one).toContain('application/pdf');
  await saveInvoiceAttachment('one','replacement');expect((await loadInvoiceAttachments()).one).toBe('replacement');
  await deleteInvoiceAttachment('one');expect((await loadInvoiceAttachments()).one).toBeUndefined();
  await saveInvoiceAttachment('two','image');await deleteInvoiceAttachment();expect(await loadInvoiceAttachments()).toEqual({});
 });
 it('rejects oversized files before reading',async()=>{await expect(readAttachment({size:11*1024*1024} as File)).rejects.toThrow('10 MB');});
 it('rejects active SVG/HTML and mislabeled files',async()=>{await expect(readAttachment(new File(['<svg onload="alert(1)">'],'fake.pdf',{type:'application/pdf'}))).rejects.toThrow('Yalnızca');});
});
