import { describe,it,expect } from 'vitest';
import { supplierTotals,supplierEntryError,supplierKey,type SupplierCreditEntry } from './supplierCredit';
import { defaultState } from '../data';
import { serializeBackup,parseBackupFile,dataOnlyBackup,settingsOnlyBackup } from './backup';
const row=(patch:Partial<SupplierCreditEntry>={}):SupplierCreditEntry=>({id:'1',supplier:'Test Toptancı',date:'2026-09-29',type:'payment',amount:10000,customer:'Test müşteri',reference:'',note:'',...patch});
describe('supplier credit ledger',()=>{
 it('calculates customer direct payment minus gross invoices',()=>{expect(supplierTotals([row(),row({type:'invoice',amount:7500})])).toEqual({payments:10000,invoices:7500,refunds:0,balance:2500});});
 it('shows supplier debt when invoices exceed payments',()=>{expect(supplierTotals([row({amount:5000}),row({type:'invoice',amount:7500})]).balance).toBe(-2500);});
 it('closes receivable with a refund',()=>{expect(supplierTotals([row(),row({type:'invoice',amount:7500}),row({type:'refund',amount:2500})]).balance).toBe(0);});
 it('excludes cancelled entries and rounds currency',()=>{expect(supplierTotals([row({amount:0.1}),row({amount:0.2}),row({voided:true})]).balance).toBe(0.3);});
 it('rejects invalid monetary input',()=>{for(const amount of [0,-1,NaN,Infinity])expect(supplierEntryError(row({amount}),[])).not.toBe('');});
 it('requires supplier, date, customer and invoice reference',()=>{for(const patch of [{supplier:''},{date:''},{date:'2026-02-30'},{customer:''},{type:'invoice' as const}])expect(supplierEntryError(row(patch),[])).not.toBe('');});
 it('blocks same invoice per normalized supplier or linked ID',()=>{const invoice=row({type:'invoice',reference:'ABC123',invoiceId:'inv'});expect(supplierEntryError({...invoice,supplier:' TEST   TOPTANCI ',reference:'abc123'},[invoice])).not.toBe('');expect(supplierEntryError({...invoice,supplier:'Other',reference:'different'},[invoice])).not.toBe('');});
 it('permits same number for another supplier, or replacement of cancelled entry',()=>{const invoice=row({type:'invoice',reference:'ABC123'});expect(supplierEntryError({...invoice,supplier:'Other'},[invoice])).toBe('');expect(supplierEntryError(invoice,[{...invoice,voided:true}])).toBe('');});
 it('normalizes Turkish supplier identity',()=>{expect(supplierKey(' IŞIK  TOPTANCI ')).toBe('ışık toptancı');});
 it('full and data backups preserve ledger without modifying other accounts',()=>{const s=defaultState();s.supplierCredits=[row()];for(const scope of ['full','data'] as const){const restored=parseBackupFile(serializeBackup(scope==='full'?s:dataOnlyBackup(s),scope),s);expect(restored.ok).toBe(true);if(restored.ok){expect(restored.data.supplierCredits).toEqual(s.supplierCredits);expect(restored.data.cashMoves).toEqual(s.cashMoves);expect(restored.data.customers).toEqual(s.customers);}}});
 it('old backups initialize empty ledger and settings restore preserves it',()=>{const old=defaultState();delete old.supplierCredits;const s=defaultState();s.supplierCredits=[row()];const restored=parseBackupFile(serializeBackup(old,'full'),s);expect(restored.ok&&restored.data.supplierCredits).toEqual([]);const settings=parseBackupFile(serializeBackup(settingsOnlyBackup(s),'settings'),s);expect(settings.ok&&settings.data.supplierCredits).toEqual(s.supplierCredits);});
});
