import { round2, type Sale } from '../data';

/** Current local calendar month through now (not rolling 30 days or the UI filter). */
export function isInCurrentMonth(date: string, now: Date): boolean {
  const time = new Date(date).getTime();
  return Number.isFinite(time)
    && time >= new Date(now.getFullYear(), now.getMonth(), 1).getTime()
    && time <= now.getTime();
}

/** VAT-inclusive receipt totals after recorded discounts and signed refunds.
 * Revenue belongs to the sale date, not the POS settlement/credit collection date.
 * Take sales only: no opening balances, cash movements, collections or POS closes.
 */
export function monthlyTurnover(sales: readonly Sale[], now = new Date()) {
  let total = 0, cash = 0, pos = 0, credit = 0;
  for (const sale of sales) {
    if (!isInCurrentMonth(sale.date, now)) continue;
    total += Math.round(sale.total * 100);
    if (sale.method === 'veresiye') credit += Math.round(sale.total * 100);
    else {
      cash += Math.round((sale.cash || 0) * 100);
      pos += Math.round((sale.pos || 0) * 100);
    }
  }
  return { total: round2(total / 100), cash: round2(cash / 100), pos: round2(pos / 100), credit: round2(credit / 100) };
}
