import {afterEach,describe,expect,it,vi} from 'vitest';
import {initPlayBilling,isProActive,purchasePro,restorePro,getProPrice,PRO_ID} from './playBilling';
afterEach(()=>vi.unstubAllGlobals());
function fixture(owned=false){
 const callbacks:any={};
 const product={owned,pricing:{price:'₺299,00'},getOffer:()=>({id:'monthly'})};
 const store={register:vi.fn(),get:vi.fn(()=>product),when:()=>({approved:(cb:any)=>{callbacks.approved=cb;},updated:(cb:any)=>{callbacks.updated=cb;}}),initialize:vi.fn(async()=>[]),order:vi.fn(async()=>undefined as any),restorePurchases:vi.fn(async()=>undefined as any)};
 vi.stubGlobal('window',{CdvPurchase:{store}});return {store,product,callbacks};
}
describe('Play subscription bridge',()=>{
 it('handles missing native bridge',async()=>{vi.stubGlobal('window',{});expect(await initPlayBilling(vi.fn())).toBe(false);expect(await purchasePro()).toBe('unavailable');expect(await restorePro()).toBe(false);});
 it('registers the actual v13 platform and subscription type',async()=>{const {store}=fixture();expect(await initPlayBilling(vi.fn())).toBe(true);expect(store.register).toHaveBeenCalledWith([{id:PRO_ID,type:'paid subscription',platform:'android-playstore'}]);expect(store.initialize).toHaveBeenCalledWith(['android-playstore']);});
 it('restores existing paid entitlement',async()=>{const {store}=fixture(true);expect(isProActive()).toBe(true);expect(await restorePro()).toBe(true);expect(store.restorePurchases).toHaveBeenCalledOnce();});
 it('does not unlock for an unrelated approved purchase',async()=>{const {callbacks}=fixture();const onPro=vi.fn();await initPlayBilling(onPro);onPro.mockClear();const finish=vi.fn();callbacks.approved({products:[{id:'other'}],finish});expect(finish).not.toHaveBeenCalled();expect(onPro).not.toHaveBeenCalled();});
 it('only grants actual ownership and observes revocation',async()=>{const {callbacks,product}=fixture(true);const cb=vi.fn();await initPlayBilling(cb);const finish=vi.fn();callbacks.approved({products:[{id:PRO_ID}],finish});expect(finish).toHaveBeenCalledOnce();expect(cb).toHaveBeenLastCalledWith(true);product.owned=false;callbacks.updated();expect(cb).toHaveBeenLastCalledWith(false);});
 it('uses real localized product price',()=>{fixture();expect(getProPrice()).toBe('₺299,00');});
 it('handles plugin returned errors (not just thrown errors)',async()=>{const {store}=fixture();store.order.mockResolvedValue({code:1});expect(await purchasePro()).toBe('fail');store.restorePurchases.mockResolvedValue({code:1});expect(await restorePro()).toBe(false);});
 it('starts the registered offer without assuming purchase success',async()=>{const {store}=fixture();expect(await purchasePro()).toBe('ok');expect(store.order).toHaveBeenCalledWith({id:'monthly'});expect(isProActive()).toBe(false);});
});
