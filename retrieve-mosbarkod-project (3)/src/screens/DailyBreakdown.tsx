import { useMemo, useState } from 'react';
import { cn } from '../utils/cn';
import { Ic } from '../icons';
import { Btn } from '../components/ui';
import { fmt, round2, todayKey, type AppState } from '../data';
import * as XLSX from 'xlsx';

export interface DailyRow {
  date: string;
  dateLabel: string;
  dayLabel: string;
  sales: number;
  refunds: number;
  cost: number;
  expenses: number;
  purchases: number;
  staffPay: number;
  netProfit: number;
  saleCount: number;
}

function computeDailyData(state: AppState, dateFrom: string, dateTo: string): DailyRow[] {
  const from = dateFrom || '2000-01-01';
  const to = dateTo || todayKey();

  const dayMap = new Map<string, DailyRow>();
  const d1 = new Date(from);
  const d2 = new Date(to);
  d1.setHours(12, 0, 0, 0);
  d2.setHours(12, 0, 0, 0);

  for (let d = new Date(d1); d <= d2; d.setDate(d.getDate() + 1)) {
    const key = todayKey(d);
    const weekday = d.toLocaleDateString('tr-TR', { weekday: 'short' });
    dayMap.set(key, {
      date: key,
      dateLabel: d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' }),
      dayLabel: weekday,
      sales: 0,
      refunds: 0,
      cost: 0,
      expenses: 0,
      purchases: 0,
      staffPay: 0,
      netProfit: 0,
      saleCount: 0,
    });
  }

  const costMap = new Map(state.products.map((p) => [p.name.toLowerCase(), p.cost || 0]));

  for (const s of state.sales) {
    const key = todayKey(new Date(s.date));
    const row = dayMap.get(key);
    if (!row) continue;
    const itemCost = s.items.reduce((b, it) => b + it.qty * (costMap.get(it.name.toLowerCase()) ?? 0), 0);
    if (s.isRefund) {
      row.refunds += Math.abs(s.total);
      row.cost -= itemCost;
      row.saleCount -= 1;
    } else {
      row.sales += s.total;
      row.cost += itemCost;
      row.saleCount += 1;
    }
  }

  for (const e of state.expenses) {
    const key = todayKey(new Date(e.date));
    const row = dayMap.get(key);
    if (row) row.expenses += e.amount;
  }

  for (const i of state.invoices) {
    const key = todayKey(new Date(i.date));
    const row = dayMap.get(key);
    if (row) row.purchases += i.total;
  }

  for (const st of state.staff) {
    for (const p of st.pays ?? []) {
      const key = todayKey(new Date(p.date));
      const row = dayMap.get(key);
      if (row) row.staffPay += p.amount;
    }
  }

  return [...dayMap.values()].map((row) => ({
    ...row,
    sales: round2(row.sales),
    refunds: round2(row.refunds),
    cost: round2(row.cost),
    expenses: round2(row.expenses),
    purchases: round2(row.purchases),
    staffPay: round2(row.staffPay),
    netProfit: round2(row.sales - row.refunds - row.cost - row.expenses - row.staffPay),
  }));
}

type ToastFn = (msg: string, type?: 'ok' | 'err') => void;

interface DailyTotals {
  sales: number;
  refunds: number;
  cost: number;
  expenses: number;
  purchases: number;
  staffPay: number;
  netProfit: number;
  saleCount: number;
}

function computeTotals(data: DailyRow[]): DailyTotals {
  return data.reduce(
    (a, r) => ({
      sales: a.sales + r.sales,
      refunds: a.refunds + r.refunds,
      cost: a.cost + r.cost,
      expenses: a.expenses + r.expenses,
      purchases: a.purchases + r.purchases,
      staffPay: a.staffPay + r.staffPay,
      netProfit: a.netProfit + r.netProfit,
      saleCount: a.saleCount + r.saleCount,
    }),
    { sales: 0, refunds: 0, cost: 0, expenses: 0, purchases: 0, staffPay: 0, netProfit: 0, saleCount: 0 }
  );
}



function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((Math.abs(value) / max) * 100, 100) : 0;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#1e2833]">
      <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export default function DailyBreakdown({ state, dateFrom, dateTo, toast }: { state: AppState; dateFrom: string; dateTo: string; toast: ToastFn }) {
  const data = useMemo(() => computeDailyData(state, dateFrom, dateTo), [state, dateFrom, dateTo]);
  const totals = useMemo(() => computeTotals(data), [data]);
  const [expanded, setExpanded] = useState(true);

  const maxSales = useMemo(() => Math.max(1, ...data.map((r) => r.sales)), [data]);
  const maxExpenses = useMemo(() => Math.max(1, ...data.map((r) => r.expenses + r.staffPay)), [data]);
  const maxCost = useMemo(() => Math.max(1, ...data.map((r) => Math.abs(r.cost))), [data]);

  const exportXlsx = () => {
    const rows = [
      ['TARİH', 'GÜN', 'SATIŞ CİROSU', 'İADE TUTARI', 'ÜRÜN MALİYETİ', 'MASRAFLAR', 'MAAŞ/AVANS', 'NET KÂR', 'FİŞ ADEDİ'],
      ...data.map((r) => [r.dateLabel, r.dayLabel, r.sales, r.refunds, r.cost, r.expenses, r.staffPay, r.netProfit, r.saleCount]),
      ['TOPLAM', '', totals.sales, totals.refunds, totals.cost, totals.expenses, totals.staffPay, totals.netProfit, totals.saleCount],
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 14 }, { wch: 8 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 10 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Günlük Döküm');
    XLSX.writeFile(wb, `mosbarkod-gunluk-dokum-${todayKey()}.xlsx`);
    toast('Günlük döküm Excel olarak indirildi');
  };

  const exportPdf = () => window.print();
  const netColor = (v: number) => v >= 0 ? 'text-mint' : 'text-red';

  return (
    <section className="rounded-xl border border-line bg-panel">
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <Ic n="monitor" c="h-4 w-4 text-amber" />
        <h3 className="font-mono text-[12px] font-bold uppercase tracking-widest text-mut">Günlük Satış & Kâr Dökümü</h3>
        <span className="ml-auto font-mono text-[10.5px] text-mut2">{data.length} gün</span>
        <Btn v="ghost" onClick={() => setExpanded(!expanded)} className="px-2 py-1 text-[11px]">
          <Ic n={expanded ? 'chevD' : 'chevR'} c="h-4 w-4" />
        </Btn>
        <Btn v="ghost" onClick={exportXlsx} className="border-mint/40 text-mint px-2.5 py-1 text-[11px]">
          <Ic n="download" c="h-4 w-4" /> Excel
        </Btn>
        <Btn v="ghost" onClick={exportPdf} className="border-blue/40 text-blue px-2.5 py-1 text-[11px]">
          <Ic n="print" c="h-4 w-4" /> Yazdır
        </Btn>
      </div>

      {expanded && (
        <>
          {/* Özet İstatistik Kartları */}
          <div className="grid grid-cols-2 gap-2 p-4 lg:grid-cols-4">
            {[
              { label: 'Toplam Satış', value: fmt(totals.sales), color: '#2fd6a5', icon: 'trend' },
              { label: 'Toplam Maliyet', value: fmt(totals.cost), color: '#f97316', icon: 'banknote' },
              { label: 'Toplam Masraf+Maaş', value: fmt(totals.expenses + totals.staffPay), color: '#ef5350', icon: 'folder' },
              { label: 'Net Kâr / Zarar', value: fmt(totals.netProfit), color: totals.netProfit >= 0 ? '#2fd6a5' : '#ef5350', icon: 'sparkles' },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-line bg-ink/30 px-3 py-2.5">
                <div className="mb-1 flex items-center gap-1.5">
                  <Ic n={s.icon} c="h-3.5 w-3.5" />
                  <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-mut2">{s.label}</span>
                </div>
                <div className="font-mono text-lg font-bold tabular-nums" style={{ color: s.color }}>
                  {s.value}
                </div>
              </div>
            ))}
          </div>

          {/* Günlük Satırlar */}
          <div className="space-y-2 px-4 pb-4">
            {data.map((r) => {
              const today_ = r.date === todayKey();
              const weekend = r.dayLabel === 'Cmt' || r.dayLabel === 'Paz';
              return (
                <div
                  key={r.date}
                  className={cn(
                    'rounded-xl border p-3 transition-all duration-200 hover:shadow-lg',
                    today_
                      ? 'border-amber/50 bg-amber/5 shadow-amber/10'
                      : weekend
                        ? 'border-line/60 bg-ink/20'
                        : 'border-line bg-ink/30 hover:border-line/80'
                  )}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        'flex h-9 w-9 items-center justify-center rounded-lg font-mono text-sm font-bold',
                        today_ ? 'bg-amber/15 text-amber2' : weekend ? 'bg-red/10 text-red' : 'bg-panel3 text-txt'
                      )}>
                        {r.dateLabel.split('.')[0]}
                      </div>
                      <div>
                        <div className={cn('font-mono text-sm font-bold', today_ ? 'text-amber2' : 'text-txt')}>{r.dateLabel}</div>
                        <div className={cn('text-[11px]', today_ ? 'text-amber2/80' : weekend ? 'text-red/70' : 'text-mut2')}>
                          {r.dayLabel} · {r.saleCount} satış
                        </div>
                      </div>
                    </div>
                    <div className={cn(
                      'rounded-lg px-2.5 py-1 font-mono text-[12px] font-bold',
                      r.netProfit >= 0 ? 'bg-mint/15 text-mint border border-mint/30' : 'bg-red/15 text-red border border-red/30'
                    )}>
                      {r.netProfit >= 0 ? '+' : '−'}{fmt(Math.abs(r.netProfit))}
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { label: 'Satış', value: r.sales, color: '#2fd6a5', max: maxSales, bg: 'bg-mint/10', border: 'border-mint/20' },
                      { label: 'İade', value: r.refunds, color: '#ef5350', max: maxSales, bg: 'bg-red/5', border: 'border-red/20' },
                      { label: 'Maliyet', value: Math.abs(r.cost), color: '#f97316', max: maxCost, bg: 'bg-orange-500/5', border: 'border-orange-500/20' },
                      { label: 'Masraf+Maaş', value: r.expenses + r.staffPay, color: '#ef5350', max: maxExpenses, bg: 'bg-red/5', border: 'border-red/20' },
                    ].map((col) => (
                      <div key={col.label} className={cn('rounded-lg border px-2 py-1.5', col.bg, col.border)}>
                        <div className="mb-1 font-mono text-[8px] font-bold uppercase tracking-widest text-mut2">{col.label}</div>
                        <div className="font-mono text-xs font-bold tabular-nums" style={{ color: col.color }}>
                          {col.value > 0 ? fmt(col.value) : '—'}
                        </div>
                        <div className="mt-1"><MiniBar value={col.value} max={col.max} color={col.color} /></div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Toplam */}
          <div className="border-t-2 border-amber/50 bg-amber/5 px-4 py-3">
            <div className="mb-2 font-mono text-[11px] font-bold uppercase tracking-widest text-amber2">TOPLAM — {data.length} Gün</div>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[
                { label: 'Toplam Satış', value: fmt(totals.sales), color: '#2fd6a5', bg: 'bg-mint/10', border: 'border-mint/30' },
                { label: 'Toplam İade', value: fmt(totals.refunds), color: '#ef5350', bg: 'bg-red/10', border: 'border-red/30' },
                { label: 'Toplam Maliyet+Masraf', value: fmt(totals.cost + totals.expenses + totals.staffPay), color: '#f97316', bg: 'bg-orange-500/10', border: 'border-orange-500/30' },
                { label: 'Toplam Net Kâr/Zarar', value: fmt(totals.netProfit), color: totals.netProfit >= 0 ? '#2fd6a5' : '#ef5350', bg: totals.netProfit >= 0 ? 'bg-mint/15' : 'bg-red/15', border: totals.netProfit >= 0 ? 'border-mint/30' : 'border-red/30' },
              ].map((t) => (
                <div key={t.label} className={cn('rounded-xl border px-3 py-2.5', t.bg, t.border)}>
                  <div className="font-mono text-[9px] font-bold uppercase tracking-widest text-mut2">{t.label}</div>
                  <div className="mt-1 font-mono text-sm font-bold tabular-nums" style={{ color: t.color }}>{t.value}</div>
                </div>
              ))}
            </div>
            <div className="mt-2 flex items-center justify-center gap-3 text-[11px] text-mut2">
              <span>Fiş: {totals.saleCount}</span>
              <span>·</span>
              <span className={netColor(totals.netProfit)}>Ortalama Günlük Kâr: {fmt(data.length > 0 ? round2(totals.netProfit / data.length) : 0)}</span>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
