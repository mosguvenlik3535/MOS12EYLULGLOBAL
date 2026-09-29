import {describe,it,expect} from 'vitest';
import {DEMO_MAX_SALES,demoSalesRemaining} from './buildMode';
describe('direct-download demo sales allowance',()=>{
 it('allows one thousand completed sales',()=>expect(DEMO_MAX_SALES).toBe(1000));
 it('excludes existing seed sales',()=>expect(demoSalesRemaining(35,35)).toBe(1000));
 it('leaves one sale at 999 completed sales',()=>expect(demoSalesRemaining(1034,35)).toBe(1));
 it('expires at 1000 completed sales',()=>expect(demoSalesRemaining(1035,35)).toBe(0));
 it('never displays a negative remaining count',()=>expect(demoSalesRemaining(1100,35)).toBe(0));
 it('retains progress after upgrading a 25-sale demo',()=>expect(demoSalesRemaining(60,35)).toBe(975));
});
