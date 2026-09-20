import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import type { Sale } from '../data';
import { monthlyTurnover } from './monthlyTurnover';
const now = new Date(2026, 8, 21, 12);
function sale(patch: Partial<Sale> = {}): Sale {
  return { id:'s1', no:'1', date:now.toISOString(), register:1, cashier:'Admin', mode:'p1',
    items:[], subtotal:100, discountPct:0, discountAmt:0, total:100,
    method:'nakit', cash:100, pos:0, received:100, change:0, ...patch } as Sale;
}
describe('monthly turnover (VAT-inclusive receipt totals)', () => {
  it('adds cash, POS and credit sales, including today POS immediately', () => {
    const result = monthlyTurnover([sale(), sale({method:'kart',cash:0,pos:200,total:200}),
      sale({method:'veresiye',cash:0,total:300})],now);
    expect(result).toEqual({total:600,cash:100,pos:200,credit:300});
    expect(result.total).toBe(result.cash + result.pos + result.credit);
  });
  it('counts a split payment once and does not include change or amount tendered', () => {
    expect(monthlyTurnover([sale({method:'nakit+pos',cash:40,pos:60,received:200,change:160})],now))
      .toEqual({total:100,cash:40,pos:60,credit:0});
  });
  it('uses already discounted total, not subtotal and not a second discount', () => {
    expect(monthlyTurnover([sale({subtotal:120,discountAmt:20,total:100})],now).total).toBe(100);
  });
  it('subtracts signed cash, card and credit refunds once', () => {
    const sales = [sale({total:300,cash:300,refundedTotal:60}),
      sale({isRefund:true,total:-10,cash:-10}),
      sale({isRefund:true,total:-20,cash:0,pos:-20,method:'kart'}),
      sale({isRefund:true,total:-30,cash:0,method:'veresiye'})];
    expect(monthlyTurnover(sales,now)).toEqual({total:240,cash:290,pos:-20,credit:-30});
  });
  it('uses local calendar month and excludes future/invalid records', () => {
    const rows = [sale({date:new Date(2026,8,1).toISOString()}),
      sale({date:new Date(2026,7,31,23,59).toISOString()}),
      sale({date:new Date(2026,9,1).toISOString()}), sale({date:'invalid'})];
    expect(monthlyTurnover(rows,now).total).toBe(100);
  });
  it('resets at year boundary and does not carry the previous month POS', () => {
    const rows = [sale({date:new Date(2026,11,31).toISOString(),cash:0,pos:100,method:'kart'}),
      sale({date:new Date(2027,0,1).toISOString()})];
    expect(monthlyTurnover(rows,new Date(2027,0,1)).total).toBe(100);
  });
  it('returns zero without sales and preserves cent precision', () => {
    expect(monthlyTurnover([],now)).toEqual({total:0,cash:0,pos:0,credit:0});
    expect(monthlyTurnover([sale({total:0.1,cash:0.1}),sale({total:0.2,cash:0.2})],now).total).toBe(0.3);
  });
  it('uses refund date even if the original sale belongs to a previous month', () => {
    expect(monthlyTurnover([sale({date:new Date(2026,7,31).toISOString()}),
      sale({isRefund:true,parentSaleId:'s1',total:-25,cash:-25})],now).total).toBe(-25);
  });
  it('wires monthly sales independently of filtered sales and removes the balance card', () => {
    const ui = readFileSync('src/screens/Analytics.tsx','utf8');
    expect(ui).toContain('monthlyTurnover(state.sales, monthNow)');
    expect(ui).toContain("label: 'AYLIK CİRO · KDV DAHİL'");
    expect(ui).not.toContain('monthlyCash');
    expect(ui).not.toContain('AYLIK ANA KASA');
  });
});
