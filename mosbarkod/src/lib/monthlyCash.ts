import { round2, type AppState, type Customer } from '../data';

// Legacy credit refunds also use "tahsilat" but do not bring cash into the till.
// The current collection screen has no payment method: its collections are cash.
export const cashCollections = (customers: Customer[]) => customers.flatMap(c =>
  c.entries.filter(e => e.type === 'tahsilat' && !e.note?.startsWith('İade —'))
);

/** Cash + bank balance through now, split at the local calendar month boundary.
 * POS sales/refunds settle at local midnight on the next calendar day, without fees.
 * POS closing reports are not transactions and must not be added again.
 * openingCash is daily float, not dated capital: never add it to accumulated cash.
 * Initial capital must be recorded once as a cash-in movement.
 * Expenses currently have no payment method and are treated as cash expenses.
 */
export function monthlyCash(state: Pick<AppState, 'sales' | 'expenses' | 'cashMoves' | 'customers' | 'invoices'>, now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const end = now.getTime();
  let carry = 0, incoming = 0, outgoing = 0, pendingPos = 0, settledPos = 0;
  const add = (date: string, amount: number) => {
    const time = new Date(date).getTime();
    if (!Number.isFinite(time) || time > end || !Number.isFinite(amount)) return;
    if (time < start) carry += amount;
    else if (amount >= 0) incoming += amount;
    else outgoing -= amount;
  };
  state.sales.forEach(s => {
    add(s.date, s.cash || 0); // refunds already have negative cash/POS
    const soldAt = new Date(s.date);
    const pos = s.pos || 0;
    if (!Number.isFinite(soldAt.getTime()) || soldAt.getTime() > end || !Number.isFinite(pos)) return;
    const settlement = new Date(soldAt.getFullYear(), soldAt.getMonth(), soldAt.getDate() + 1);
    if (settlement.getTime() > end) pendingPos += pos;
    else {
      add(settlement.toISOString(), pos);
      if (settlement.getTime() >= start) settledPos += pos;
    }
  });
  state.cashMoves.forEach(m => add(m.date, m.dir === 'in' ? m.amount : -m.amount));
  state.expenses.forEach(e => add(e.date, -e.amount));
  cashCollections(state.customers).forEach(e => add(e.date, e.amount));
  state.invoices.forEach(inv => {
    if (inv.payments?.length) {
      inv.payments.forEach(p => add(p.date, -p.amount));
    } else if (inv.status === 'odendi' && (inv.payType === 'nakit' || inv.payType === 'pos')) {
      add(inv.paidDate || inv.date, -inv.total);
    }
  });
  return { pendingPos: round2(pendingPos), settledPos: round2(settledPos), carry: round2(carry), incoming: round2(incoming), outgoing: round2(outgoing), balance: round2(carry + incoming - outgoing) };
}
