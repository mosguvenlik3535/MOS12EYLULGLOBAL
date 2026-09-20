import { describe, expect, it } from 'vitest';
import { monthlyCash, cashCollections } from './monthlyCash';
import type { AppState, Sale, Invoice, Customer } from '../data';
const now = new Date(2026, 8, 21, 12);
const date = (month: number, day = 10) => new Date(2026, month - 1, day, 12).toISOString();
const base = () => ({ sales: [], expenses: [], cashMoves: [], customers: [], invoices: [] } as Pick<AppState, 'sales'|'expenses'|'cashMoves'|'customers'|'invoices'>);
const sale = (cash: number, month = 9) => ({ date: date(month), cash, pos: 900, total: 1000 } as Sale);
const customer = (note?: string) => ({ balance: 999, entries: [{ date: date(9), type: 'tahsilat', amount: 50, note }] } as Customer);

describe('monthly main cash balance', () => {
  it('carries previous months and deducts monthly outflows', () => {
    const s = base(); s.sales = [sale(100, 8), sale(200)];
    s.cashMoves = [{ id:'1', date:date(9), dir:'out', amount:40, label:'', by:'' }];
    expect(monthlyCash(s, now)).toEqual({ carry:100, incoming:200, outgoing:40, balance:260 });
  });
  it('does not include POS, unpaid credit, future or invalid dates', () => {
    const s = base(); s.sales = [sale(0), sale(200, 10), {...sale(100), date:'bad'}];
    s.customers = [{ balance:1000, entries:[] } as unknown as Customer];
    expect(monthlyCash(s, now).balance).toBe(0);
  });
  it('deducts cash refunds and expenses', () => {
    const s = base(); s.sales = [sale(200), {...sale(-20), isRefund:true}];
    s.expenses = [{id:'1', date:date(9), amount:30, category:'', note:''}];
    expect(monthlyCash(s, now).balance).toBe(150);
  });
  it('counts real collections but not credit refund adjustments', () => {
    const s = base(); s.customers = [customer(), customer('İade — F-1')];
    expect(monthlyCash(s, now).balance).toBe(50);
  });
  it('uses cash invoice payment dates and does not double count invoice totals', () => {
    const s = base(); s.invoices = [{date:date(8), total:300, payType:'nakit', status:'odendi', payments:[
      {date:date(9), method:'nakit', amount:100}, {date:date(9), method:'pos', amount:200},
    ]} as Invoice];
    expect(monthlyCash(s, now)).toEqual({carry:0, incoming:0, outgoing:100, balance:-100});
  });
  it('supports paid cash invoices without payment history, excludes unpaid invoices', () => {
    const s = base(); s.invoices = [
      {date:date(8), total:30, status:'odendi', payType:'nakit'},
      {date:date(9), total:70, status:'bekliyor', payType:'veresiye'},
    ] as Invoice[];
    expect(monthlyCash(s, now).carry).toBe(-30);
  });
  it('uses local month boundaries', () => {
    const s = base(); s.sales = [{...sale(10), date:new Date(2026,8,1,0,0).toISOString()},
      {...sale(20), date:new Date(2026,7,31,23,59).toISOString()}];
    expect(monthlyCash(s, now)).toEqual({carry:20,incoming:10,outgoing:0,balance:30});
  });
  it('keeps cash unchanged when collections are archived before customer deletion', () => {
    const s = base(); s.customers = [customer()];
    const before = monthlyCash(s, now);
    s.cashMoves = cashCollections(s.customers).map(e => ({id:'1',date:e.date,dir:'in',amount:e.amount,label:'',by:''}));
    s.customers = [];
    expect(monthlyCash(s, now)).toEqual(before);
  });
});
