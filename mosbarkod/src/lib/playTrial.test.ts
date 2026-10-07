import {describe,it,expect} from 'vitest';
import {PLAY_TRIAL_KEY,readPlayTrialUsage,playTrialRemaining,consumePlayTrialSale, type TrialStorage} from './playTrial';
function store(initial?:string):TrialStorage {const data=new Map<string,string>();if(initial!==undefined)data.set(PLAY_TRIAL_KEY,initial);return {getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v);}};}
describe('Google Play 1000 completed-sale trial',()=>{
 it('gives new and upgrading Play installations 1000 sales',()=>expect(playTrialRemaining(readPlayTrialUsage(store()))).toBe(1000));
 it('allows sale 1000, refuses sale 1001 and never decrements on read',()=>{const s=store('999');expect(consumePlayTrialSale(s)).toEqual({allowed:true,used:1000});expect(consumePlayTrialSale(s)).toEqual({allowed:false,used:1000,reason:'limit'});expect(readPlayTrialUsage(s)).toBe(1000);});
 it('persists across reloading the trial reader',()=>{const s=store();consumePlayTrialSale(s);expect(readPlayTrialUsage(s)).toBe(1);});
 it('never counts seed/imported/deleted/refunded sales from the business database',()=>{const s=store('87');s.setItem('mosbarkod_v15_state',JSON.stringify({sales:[]}));expect(readPlayTrialUsage(s)).toBe(87);s.setItem('mosbarkod_v15_state',JSON.stringify({sales:Array(9000).fill({isRefund:true})}));expect(readPlayTrialUsage(s)).toBe(87);});
 it('active subscriptions bypass exhausted trials without clearing usage',()=>{const s=store('1000');expect(consumePlayTrialSale(s,true).allowed).toBe(true);expect(readPlayTrialUsage(s)).toBe(1000);expect(consumePlayTrialSale(s,false).allowed).toBe(false);});
 it('paid sales do not consume unused trial quota',()=>{const s=store('500');expect(consumePlayTrialSale(s,true).used).toBe(500);});
 for(const value of ['bad','-1','1.5','','Infinity','1001'])it(`fails closed for invalid/over-limit usage: ${value}`,()=>expect(consumePlayTrialSale(store(value)).allowed).toBe(false));
 it('does not allow a sale if persistence fails',()=>{const s:TrialStorage={getItem:()=>null,setItem:()=>{throw new Error('quota');}};expect(consumePlayTrialSale(s).reason).toBe('storage');});
 it('does not allow a sale if storage silently discards writes',()=>{const s:TrialStorage={getItem:()=>null,setItem:()=>{}};expect(consumePlayTrialSale(s).reason).toBe('storage');});
 it('retains all 1000 boundaries',()=>{const s=store();for(let i=1;i<=1000;i++)expect(consumePlayTrialSale(s)).toEqual({allowed:true,used:i});expect(consumePlayTrialSale(s).allowed).toBe(false);});
});
