import {afterEach,describe,expect,it,vi} from 'vitest';
import {fetchSupplierQuote,parseSupplierQuote,readSupplierQuote,supplierUsdEquivalent} from './supplierUsdQuote';
const payload={base_code:'USD',result:'success',rates:{TRY:50},time_last_update_unix:1790636400};
afterEach(()=>vi.unstubAllGlobals());
describe('informational supplier USD quote',()=>{
 it('divides TL by TRY per USD and keeps signed amounts',()=>{const q=parseSupplierQuote(payload,'ExchangeRate-API');expect(q).not.toBeNull();expect(supplierUsdEquivalent(2500,q)).toBe(50);expect(supplierUsdEquivalent(-1000,q)).toBe(-20);expect(supplierUsdEquivalent(0,q)).toBe(0);});
 it('does not fabricate an estimate without a verified quote',()=>{expect(supplierUsdEquivalent(2500,null)).toBeNull();expect(readSupplierQuote()).toBeNull();});
 it('preserves provider date instead of treating fetch time as rate date',()=>{const q=parseSupplierQuote({base:'USD',rates:{TRY:49},date:'2026-09-25'},'Frankfurter');expect(q?.rateDate).toBe('2026-09-25T00:00:00.000Z');expect(q?.source).toBe('Frankfurter');});
 it('rejects incorrect base, missing timestamp, invalid and zero rates',()=>{for(const p of [{...payload,base_code:'TRY'},{...payload,time_last_update_unix:undefined},{...payload,rates:{TRY:0}},{...payload,rates:{TRY:NaN}},{...payload,rates:{TRY:Infinity}},{...payload,result:'error'}])expect(parseSupplierQuote(p,'ExchangeRate-API')).toBeNull();});
 it('falls back to the second provider and caches only valid rates',async()=>{const setItem=vi.fn();vi.stubGlobal('localStorage',{setItem});const fetch=vi.fn().mockRejectedValueOnce(Error('offline')).mockResolvedValueOnce(new Response(JSON.stringify({base:'USD',rates:{TRY:50},date:'2026-09-25'})));vi.stubGlobal('fetch',fetch);const q=await fetchSupplierQuote();expect(q?.source).toBe('Frankfurter');expect(fetch).toHaveBeenCalledTimes(2);expect(setItem).toHaveBeenCalledOnce();});
 it('keeps prior cached quote on network failure',async()=>{const q=parseSupplierQuote(payload,'ExchangeRate-API');const setItem=vi.fn();vi.stubGlobal('localStorage',{getItem:()=>JSON.stringify(q),setItem});vi.stubGlobal('fetch',vi.fn().mockRejectedValue(Error('offline')));expect(await fetchSupplierQuote()).toBeNull();expect(readSupplierQuote()).toEqual(q);expect(setItem).not.toHaveBeenCalled();});
 it('rejects corrupted cache and survives storage denial',()=>{vi.stubGlobal('localStorage',{getItem:()=>'{bad'});expect(readSupplierQuote()).toBeNull();vi.stubGlobal('localStorage',{getItem:()=>{throw Error('denied');}});expect(readSupplierQuote()).toBeNull();});
});
