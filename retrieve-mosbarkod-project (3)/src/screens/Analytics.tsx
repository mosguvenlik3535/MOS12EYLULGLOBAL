import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { cn } from '../utils/cn';
import { Ic } from '../icons';
import { Btn, Field, Inp, Modal, Td, Th } from '../components/ui';
import ReportModal from '../components/ReportModal';
import DailyBreakdown from './DailyBreakdown';
import { buildReport } from '../lib/report';
import {
  METHOD_META,
  USERS,
  dstr,
  fmt,
  fmtN,
  isToday,
  round2,
  todayKey,
  tstr,
  type AppState,
  type Settings,
} from '../data';

type Toast = (msg: string, type?: 'ok' | 'err') => void;
type Range = 'today' | '7' | '30' | 'all' | 'custom';

const BILLS = [200, 100, 50, 20, 10, 5, 1, 0.5];

/* ---------------- KPI kart özelleştirme ---------------- */

const KPI_KEY = 'mosbarkod_kpi_cfg_v2';

interface CardCfg {
  bg: string;
  border: string;
  value: string;
  label: string;
  sub: string;
  glow: string;
  blink: boolean;
  size: number;
  icon: string;
  showSub: boolean;
  hidden: boolean;
}

const CARD_IDS = [
  'ciro',
  'netkar',
  'kasaNakit',
  'posVeresiye',
  'anaKasaNakit',
  'anaKasaPos',
  'aylikNet',
  'genelKasa',
  'opening',
] as const;
type CardId = (typeof CARD_IDS)[number];

const DEF_CFG: Record<CardId, CardCfg> = {
  ciro:         { bg: '#14231d', border: '#2fd6a5', value: '#2fd6a5', label: '#ffffff', sub: '#9fb0c4', glow: '#2fd6a5', blink: false, size: 20, icon: 'trend',    showSub: true, hidden: false },
  netkar:       { bg: '#101c2c', border: '#5aa2f0', value: '#5aa2f0', label: '#ffffff', sub: '#9fb0c4', glow: '#5aa2f0', blink: false, size: 20, icon: 'banknote', showSub: true, hidden: false },
  kasaNakit:    { bg: '#1e162a', border: '#c084fc', value: '#c084fc', label: '#ffffff', sub: '#9fb0c4', glow: '#c084fc', blink: false, size: 20, icon: 'reset',    showSub: true, hidden: false },
  posVeresiye:  { bg: '#241f14', border: '#fbbf24', value: '#fbbf24', label: '#ffffff', sub: '#9fb0c4', glow: '#fbbf24', blink: false, size: 20, icon: 'card',     showSub: true, hidden: false },
  anaKasaNakit: { bg: '#241419', border: '#ef5350', value: '#ef5350', label: '#ffffff', sub: '#9fb0c4', glow: '#ef5350', blink: false, size: 20, icon: 'banknote', showSub: true, hidden: false },
  anaKasaPos:   { bg: '#171630', border: '#a5b4fc', value: '#a5b4fc', label: '#ffffff', sub: '#9fb0c4', glow: '#a5b4fc', blink: false, size: 20, icon: 'card',     showSub: true, hidden: false },
  aylikNet:     { bg: '#12211a', border: '#2fd6a5', value: '#2fd6a5', label: '#ffffff', sub: '#9fb0c4', glow: '#2fd6a5', blink: false, size: 20, icon: 'trend',    showSub: true, hidden: false },
  genelKasa:    { bg: '#241d0e', border: '#fbbf24', value: '#fbbf24', label: '#ffffff', sub: '#9fb0c4', glow: '#fbbf24', blink: true,  size: 20, icon: 'wallet',   showSub: true, hidden: false },
  opening:      { bg: '#10201c', border: '#2fd6a5', value: '#2fd6a5', label: '#ffffff', sub: '#9fb0c4', glow: '#2fd6a5', blink: false, size: 20, icon: 'wallet',   showSub: true, hidden: false },
};

const ICON_OPTS = ['trend', 'banknote', 'card', 'wallet', 'reset', 'monitor', 'box', 'cart', 'star', 'sparkles', 'clock', 'file'];

const loadKpi = (): { order: CardId[]; cfg: Record<CardId, CardCfg> } => {
  const base = { order: [...CARD_IDS] as CardId[], cfg: structuredClone(DEF_CFG) };
  try {
    const raw = localStorage.getItem(KPI_KEY);
    if (!raw) return base;
    const p = JSON.parse(raw) as { order?: CardId[]; cfg?: Partial<Record<CardId, Partial<CardCfg>>> };
    const order = (p.order ?? []).filter((id) => CARD_IDS.includes(id));
    for (const id of CARD_IDS) if (!order.includes(id)) order.push(id);
    const cfg = structuredClone(DEF_CFG);
    for (const id of CARD_IDS) cfg[id] = { ...cfg[id], ...(p.cfg?.[id] ?? {}) };
    return { order, cfg };
  } catch {
    return base;
  }
};

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const safe = /^#[0-9a-fA-F]{6}$/.test(value) ? value : '#ffffff';
  return (
    <div className="flex items-center gap-2">
      <span className="w-[120px] shrink-0 font-mono text-[10px] uppercase tracking-widest text-mut">{label}</span>
      <input type="color" value={safe} onChange={(e) => onChange(e.target.value)} className="h-8 w-10 shrink-0 cursor-pointer rounded-md border border-line2 bg-ink p-0.5" />
      <Inp value={value} onChange={(e) => onChange(e.target.value)} className="font-mono text-[11px]" />
    </div>
  );
}

function CardSettingsModal({
  title,
  cfg,
  onChange,
  onReset,
  onClose,
}: {
  title: string;
  cfg: CardCfg;
  onChange: (patch: Partial<CardCfg>) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  return (
    <Modal title={`Kart Ayarları — ${title}`} icon={<Ic n="gear" c="h-4.5 w-4.5" />} onClose={onClose} w="max-w-lg">
      <div className="space-y-2.5">
        <ColorRow label="Arka Plan" value={cfg.bg} onChange={(v) => onChange({ bg: v })} />
        <ColorRow label="Kenarlık" value={cfg.border} onChange={(v) => onChange({ border: v })} />
        <ColorRow label="Değer Rengi" value={cfg.value} onChange={(v) => onChange({ value: v })} />
        <ColorRow label="Başlık Rengi" value={cfg.label} onChange={(v) => onChange({ label: v })} />
        <ColorRow label="Alt Yazı Rengi" value={cfg.sub} onChange={(v) => onChange({ sub: v })} />
        <ColorRow label="Işık Rengi" value={cfg.glow} onChange={(v) => onChange({ glow: v })} />

        <div className="flex items-center justify-between rounded-lg border border-line bg-ink/40 px-3 py-2.5">
          <span className="text-[12px] font-semibold">Yanıp Sönen Işık</span>
          <button
            role="switch"
            aria-checked={cfg.blink}
            onClick={() => onChange({ blink: !cfg.blink })}
            className={cn('relative h-6 w-11 rounded-full border transition-colors', cfg.blink ? 'border-transparent bg-amber' : 'border-line2 bg-ink')}
          >
            <span className={cn('absolute top-0.5 h-[18px] w-[18px] rounded-full bg-white transition-all', cfg.blink ? 'left-[22px]' : 'left-0.5')} />
          </button>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-line bg-ink/40 px-3 py-2.5">
          <span className="text-[12px] font-semibold">Alt Bilgi Satırı</span>
          <button
            role="switch"
            aria-checked={cfg.showSub}
            onClick={() => onChange({ showSub: !cfg.showSub })}
            className={cn('relative h-6 w-11 rounded-full border transition-colors', cfg.showSub ? 'border-transparent bg-mint' : 'border-line2 bg-ink')}
          >
            <span className={cn('absolute top-0.5 h-[18px] w-[18px] rounded-full bg-white transition-all', cfg.showSub ? 'left-[22px]' : 'left-0.5')} />
          </button>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-widest text-mut">Değer Yazı Boyutu</span>
            <span className="font-mono text-[11px] font-bold text-amber2">{cfg.size} px</span>
          </div>
          <input type="range" min={14} max={34} step={1} value={cfg.size} onChange={(e) => onChange({ size: Number(e.target.value) })} className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-line2 accent-[var(--color-amber)]" />
        </div>

        <div>
          <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-mut">İkon</span>
          <div className="flex flex-wrap gap-1.5">
            {ICON_OPTS.map((ic) => (
              <button
                key={ic}
                onClick={() => onChange({ icon: ic })}
                className={cn('rounded-lg border p-2 transition-colors', cfg.icon === ic ? 'border-amber bg-amber/15 text-amber2' : 'border-line2 bg-ink/40 text-mut hover:text-txt')}
              >
                <Ic n={ic} c="h-4 w-4" />
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <Btn v="ghost" className="flex-1" onClick={onReset}><Ic n="reset" c="h-4 w-4" /> Varsayılana Dön</Btn>
          <Btn v="primary" className="flex-1" onClick={onClose}><Ic n="check" c="h-4 w-4" /> Tamam</Btn>
        </div>
      </div>
    </Modal>
  );
}

interface ProfitLossData {
  grossSales: number;
  refunds: number;
  netSales: number;
  cost: number;
  grossProfit: number;
  otherExpenses: number;
  salaryPayments: number;
  advances: number;
  totalExpenses: number;
  netProfit: number;
  purchases: number;
  saleCount: number;
  invoiceCount: number;
}

function ReportValue({ value, tone = 'text-txt' }: { value: string; tone?: string }) {
  return <span className={cn('font-mono text-[13px] font-bold tabular-nums', tone)}>{value}</span>;
}

function ProfitLossTable({ data }: { data: ProfitLossData }) {
  const rows = [
    { label: 'Brüt satış cirosu', value: data.grossSales, tone: 'text-txt', note: `${data.saleCount} satış fişi` },
    { label: 'İade tutarı', value: -data.refunds, tone: 'text-red', note: 'İadeler cirodan düşülür' },
    { label: 'Net satış cirosu', value: data.netSales, tone: 'text-mint', note: 'Brüt satış - iadeler' },
    { label: 'Ürün maliyeti', value: -data.cost, tone: 'text-red', note: 'Satılan ürünlerin maliyeti' },
    { label: 'Brüt kâr', value: data.grossProfit, tone: data.grossProfit >= 0 ? 'text-mint' : 'text-red', note: 'Net ciro - ürün maliyeti', strong: true },
    { label: 'Diğer işletme masrafları', value: -data.otherExpenses, tone: 'text-red', note: 'Kira, elektrik, vergi vb.' },
    { label: 'Maaş ödemeleri', value: -data.salaryPayments, tone: 'text-red', note: 'Personel maaş ödemeleri' },
    { label: 'Avans ödemeleri', value: -data.advances, tone: 'text-red', note: 'Personel avansları' },
    { label: 'Toplam masraf', value: -data.totalExpenses, tone: 'text-red', note: 'Diğer + maaş + avans' },
    { label: 'Net kâr / zarar', value: data.netProfit, tone: data.netProfit >= 0 ? 'text-mint' : 'text-red', note: 'Brüt kâr - tüm masraflar', strong: true },
    { label: 'Alış faturaları', value: -data.purchases, tone: 'text-amber2', note: `${data.invoiceCount} fatura · nakit çıkışı, kâr hesabına tekrar düşülmez` },
    { label: 'Dönem nakit sonucu', value: data.netProfit - data.purchases, tone: data.netProfit - data.purchases >= 0 ? 'text-blue' : 'text-red', note: 'Net kâr - alış faturaları', strong: true },
  ];

  return (
    <div className="overflow-x-auto rounded-lg border border-line">
      <table className="w-full min-w-[650px] border-collapse">
        <thead className="border-b border-line bg-ink/40">
          <tr>
            <th className="px-3 py-2.5 text-left font-mono text-[10px] uppercase tracking-widest text-mut2">Analiz Kalemi</th>
            <th className="px-3 py-2.5 text-right font-mono text-[10px] uppercase tracking-widest text-mut2">Tutar</th>
            <th className="px-3 py-2.5 text-left font-mono text-[10px] uppercase tracking-widest text-mut2">Açıklama</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className={cn('border-b border-line/60 last:border-0', row.strong && 'bg-panel2/60')}>
              <td className={cn('px-3 py-2.5 text-[12px]', row.strong ? 'font-bold text-txt' : 'text-mut')}>{row.label}</td>
              <td className="px-3 py-2.5 text-right">
                <ReportValue value={`${row.value < 0 ? '−' : ''}${fmt(Math.abs(row.value))}`} tone={row.tone} />
              </td>
              <td className="px-3 py-2.5 text-[10.5px] text-mut2">{row.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProfitLossPrint({ data, period }: { data: ProfitLossData; period: string }) {
  return (
    <div id="profit-loss-print" className="rounded-xl bg-white p-6 font-sans text-[#101828]">
      <div className="border-b-2 border-[#101828] pb-4">
        <div className="text-xl font-extrabold tracking-wide">MOSBARKODYAZILIM</div>
        <div className="mt-1 text-sm font-bold">Kar / Zarar Analizi Dökümü</div>
        <div className="mt-1 text-xs text-[#475467]">Rapor dönemi: {period}</div>
        <div className="text-xs text-[#475467]">Oluşturulma: {new Date().toLocaleString('tr-TR')}</div>
      </div>
      <div className="mt-5">
        <ProfitLossTable data={data} />
      </div>
      <div className="mt-5 border-t border-[#d0d5dd] pt-3 text-xs text-[#667085]">
        Not: Alış faturaları stok/nakit hareketidir; ürün maliyeti satılan ürünler üzerinden kâr hesabına dahil edilmiştir.
      </div>
    </div>
  );
}

function ProfitLossReport({ data, period, onExcel, onPdf }: { data: ProfitLossData; period: string; onExcel: () => void; onPdf: () => void }) {
  return (
    <section className="mt-3 rounded-xl border border-amber/30 bg-panel p-4">
      <div className="mb-3 flex flex-wrap items-start gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-mono text-[12.5px] font-bold uppercase tracking-widest text-amber2">
            <Ic n="trend" c="h-4 w-4" /> Kar / Zarar Analizi Dökümü
          </h3>
          <p className="mt-1 text-[11px] text-mut2">Seçilen tarih aralığına göre ciro, iade, maliyet, masraf, alış ve personel ödemelerinin net özeti.</p>
        </div>
        <div className="ml-auto flex gap-2">
          <Btn v="ghost" onClick={onExcel} className="border-mint/40 text-mint"><Ic n="download" c="h-4 w-4" /> Excel Dışa Aktar</Btn>
          <Btn v="ghost" onClick={onPdf} className="border-red/40 text-red"><Ic n="print" c="h-4 w-4" /> PDF / Yazdır</Btn>
        </div>
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-2 font-mono text-[10.5px] text-mut2">
        <span className="rounded-md border border-line2 bg-ink/40 px-2 py-1">Dönem: <b className="text-txt">{period}</b></span>
        <span className="rounded-md border border-line2 bg-ink/40 px-2 py-1">Maaş + avans toplamı: <b className="text-red">{fmt(data.salaryPayments + data.advances)}</b></span>
        <span className="rounded-md border border-line2 bg-ink/40 px-2 py-1">Net sonuç: <b className={data.netProfit >= 0 ? 'text-mint' : 'text-red'}>{fmt(data.netProfit)}</b></span>
      </div>
      <ProfitLossTable data={data} />
    </section>
  );
}

export default function AnalyticsScreen({
  state,
  onCashMove,
  onPosClose,
  onImkartBulk,
  onPatch,
  onRefund,
  isAdmin = true,
  toast,
}: {
  state: AppState;
  onCashMove: (dir: 'in' | 'out', amount: number, label: string) => void;
  onPosClose: (device: 1 | 2, amount: number) => void;
  onImkartBulk: (amount: number, via: 'nakit' | 'pos') => void;
  onPatch: (p: Partial<Settings>) => void;
  onRefund: (saleId: string, itemsToRefund: Record<string, number>, reason: string, method: 'nakit' | 'kart' | 'veresiye') => void;
  isAdmin?: boolean;
  toast: Toast;
}) {
  const [range, setRange] = useState<Range>('today');
  const [cashOpen, setCashOpen] = useState(false);
  const [zOpen, setZOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState(todayKey(new Date(Date.now() - 6 * 86400000)));
  const [dateTo, setDateTo] = useState(todayKey());
  const [pos1, setPos1] = useState('');
  const [pos2, setPos2] = useState('');
  const [imBulk, setImBulk] = useState('');
  const [imVia, setImVia] = useState<'nakit' | 'pos'>('nakit');
  const [bills, setBills] = useState<Record<number, string>>({});
  const [opening, setOpening] = useState(String(state.settings.openingCash));
  const [kpi, setKpi] = useState(loadKpi);
  const [cfgOpen, setCfgOpen] = useState<CardId | null>(null);
  const [refundSale, setRefundSale] = useState<AppState['sales'][number] | null>(null);

  const persistKpi = (next: { order: CardId[]; cfg: Record<CardId, CardCfg> }) => {
    setKpi(next);
    try {
      localStorage.setItem(KPI_KEY, JSON.stringify(next));
    } catch {
      /* yoksay */
    }
  };

  const moveCard = (id: CardId, dir: -1 | 1) => {
    const order = [...kpi.order];
    const i = order.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= order.length) return;
    [order[i], order[j]] = [order[j], order[i]];
    persistKpi({ ...kpi, order });
  };

  const patchCfg = (id: CardId, patch: Partial<CardCfg>) =>
    persistKpi({ ...kpi, cfg: { ...kpi.cfg, [id]: { ...kpi.cfg[id], ...patch } } });

  const resetCfg = (id: CardId) =>
    persistKpi({ ...kpi, cfg: { ...kpi.cfg, [id]: { ...DEF_CFG[id] } } });

  const inRange = (iso: string) => {
    if (range === 'all') return true;
    if (range === 'today') return isToday(iso);
    if (range === 'custom') {
      const key = todayKey(new Date(iso));
      return (!dateFrom || key >= dateFrom) && (!dateTo || key <= dateTo);
    }
    const days = range === '7' ? 7 : 30;
    const d = new Date(iso).getTime();
    return d >= Date.now() - days * 86400000;
  };

  const sales = useMemo(() => state.sales.filter((s) => inRange(s.date)), [state.sales, range, dateFrom, dateTo]);
  const costMap = useMemo(() => new Map(state.products.map((p) => [p.name.toLowerCase(), p.cost || 0])), [state.products]);

  const ciro = round2(sales.reduce((a, s) => a + s.total, 0));
  const cost = round2(
    sales.reduce((a, s) => {
      const sign = s.isRefund ? -1 : 1;
      return a + sign * s.items.reduce((b, it) => b + it.qty * (costMap.get(it.name.toLowerCase()) ?? 0), 0);
    }, 0)
  );
  const brut = round2(ciro - cost);
  const masraf = round2(state.expenses.filter((e) => inRange(e.date)).reduce((a, e) => a + e.amount, 0));
  // İzmirim Kart kârı ve hareketleri genel kasa/net kâra karışmaz — yalnızca İzmirim Kart sekmesinde izlenir.
  const netKar = round2(brut - masraf);
  const nakitSatis = round2(sales.reduce((a, s) => a + (s.cash || 0), 0));
  const salePos = round2(sales.reduce((a, s) => a + (s.pos || 0), 0));
  const devicePos = round2(
    state.posCloses.filter((p) => inRange(p.date)).reduce((a, p) => a + p.amount, 0)
  );
  const posSatis = round2(salePos + devicePos);
  const veresiye = round2(sales.filter((s) => s.method === 'veresiye').reduce((a, s) => a + s.total, 0));
  const veresiyeBakiye = round2(state.customers.reduce((a, c) => a + c.balance, 0));

  const moveIn = round2(state.cashMoves.filter((m) => m.dir === 'in' && inRange(m.date)).reduce((a, m) => a + m.amount, 0));
  const moveOut = round2(state.cashMoves.filter((m) => m.dir === 'out' && inRange(m.date)).reduce((a, m) => a + m.amount, 0));
  // İzmirim Kart dolum/depozito hareketleri kasadaki sıcak nakit hesabına dahil edilmez.
  const kasaNakit = round2(state.settings.openingCash + nakitSatis + moveIn - masraf - moveOut);

  const monthKey = new Date().toISOString().slice(0, 7);
  const aylikNet = round2(
    state.sales
      .filter((s) => s.date.slice(0, 7) === monthKey)
      .reduce((a, s) => a + s.total - (s.isRefund ? -1 : 1) * s.items.reduce((b, it) => b + it.qty * (costMap.get(it.name.toLowerCase()) ?? 0), 0), 0) -
      state.expenses.filter((e) => e.date.slice(0, 7) === monthKey).reduce((a, e) => a + e.amount, 0)
  );
  const genelKasa = round2(kasaNakit + posSatis + veresiyeBakiye);
  const alisAy = round2(state.invoices.filter((i) => i.date.slice(0, 7) === monthKey).reduce((a, i) => a + i.total, 0));

  const profitLoss = useMemo<ProfitLossData>(() => {
    const normalSales = sales.filter((s) => !s.isRefund);
    const refunds = round2(sales.filter((s) => s.isRefund).reduce((a, s) => a + Math.abs(s.total), 0));
    const salaryPayments = round2(
      state.staff
        .flatMap((person) => person.pays ?? [])
        .filter((payment) => payment.type === 'maas' && inRange(payment.date))
        .reduce((a, payment) => a + payment.amount, 0)
    );
    const advances = round2(
      state.staff
        .flatMap((person) => person.pays ?? [])
        .filter((payment) => payment.type === 'avans' && inRange(payment.date))
        .reduce((a, payment) => a + payment.amount, 0)
    );
    const personnel = round2(salaryPayments + advances);
    const otherExpenses = round2(Math.max(0, masraf - personnel));
    const purchases = round2(state.invoices.filter((i) => inRange(i.date)).reduce((a, i) => a + i.total, 0));
    const netSales = round2(ciro);
    const grossProfit = round2(netSales - cost);
    const netProfit = round2(grossProfit - otherExpenses - personnel);
    return {
      grossSales: round2(normalSales.reduce((a, s) => a + s.total, 0)),
      refunds,
      netSales,
      cost,
      grossProfit,
      otherExpenses,
      salaryPayments,
      advances,
      totalExpenses: masraf,
      netProfit,
      purchases,
      saleCount: sales.length,
      invoiceCount: state.invoices.filter((i) => inRange(i.date)).length,
    };
  }, [sales, state.staff, state.invoices, masraf, cost, ciro, range, dateFrom, dateTo]);

  const reportPeriod = range === 'custom'
    ? `${dateFrom || 'başlangıç yok'} → ${dateTo || 'bitiş yok'}`
    : range === 'today'
      ? todayKey()
      : rangeLabel(range);

  const exportProfitLossExcel = () => {
    const rows = [
      ['MOSBARKODYAZILIM Kar / Zarar Analizi'],
      ['Rapor dönemi', reportPeriod],
      [],
      ['Analiz Kalemi', 'Tutar (TL)', 'Açıklama'],
      ['Brüt satış cirosu', profitLoss.grossSales, `${profitLoss.saleCount} satış fişi`],
      ['İade tutarı', -profitLoss.refunds, 'İadeler cirodan düşülür'],
      ['Net satış cirosu', profitLoss.netSales, 'Brüt satış - iadeler'],
      ['Ürün maliyeti', -profitLoss.cost, 'Satılan ürün maliyeti'],
      ['Brüt kâr', profitLoss.grossProfit, 'Net satış - ürün maliyeti'],
      ['Diğer işletme masrafları', -profitLoss.otherExpenses, 'Maaş dışı işletme giderleri'],
      ['Maaş ödemeleri', -profitLoss.salaryPayments, 'Personel maaşları'],
      ['Avans ödemeleri', -profitLoss.advances, 'Personel avansları'],
      ['Toplam masraf', -profitLoss.totalExpenses, 'Diğer + maaş + avans'],
      ['Net kâr / zarar', profitLoss.netProfit, 'Brüt kâr - toplam masraf'],
      ['Alış faturaları', -profitLoss.purchases, `${profitLoss.invoiceCount} fatura; nakit çıkışı`],
      ['Dönem nakit sonucu', profitLoss.netProfit - profitLoss.purchases, 'Net kâr - alış faturaları'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 30 }, { wch: 18 }, { wch: 52 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Kar Zarar');
    XLSX.writeFile(wb, `mosbarkod-kar-zarar-${todayKey()}.xlsx`);
    toast('Kar/zarar analizi Excel olarak indirildi');
  };

  /* movements list */
  const movements = useMemo(() => {
    type M = { date: string; label: string; amount: number; by: string };
    const list: M[] = [];
    for (const s of state.sales.filter((x) => inRange(x.date)))
      list.push({ date: s.date, label: `Satış Hasılatı (${s.no})`, amount: s.total, by: s.cashier });
    for (const i of state.invoices.filter((x) => inRange(x.date)))
      list.push({ date: i.date, label: `Mal Alımı — ${i.supplier}`, amount: -i.total, by: 'Admin' });
    for (const e of state.expenses.filter((x) => inRange(x.date)))
      list.push({ date: e.date, label: `Masraf — ${e.category}`, amount: -e.amount, by: 'Admin' });
    for (const m of state.cashMoves.filter((x) => inRange(x.date)))
      list.push({ date: m.date, label: m.label, amount: m.dir === 'in' ? m.amount : -m.amount, by: m.by });
    for (const p of state.posCloses.filter((x) => inRange(x.date)))
      list.push({ date: p.date, label: `POS ${p.device} Gün Sonu Devir`, amount: p.amount, by: p.by });
    return list.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30);
  }, [state, range]);
  const totalIn = round2(movements.filter((m) => m.amount > 0).reduce((a, m) => a + m.amount, 0));
  const totalOut = round2(movements.filter((m) => m.amount < 0).reduce((a, m) => a - m.amount, 0));

  /* charts */
  const methodTotals = (['nakit', 'kart', 'nakit+pos', 'veresiye'] as const).map((m) => ({
    m,
    total: round2(sales.filter((s) => s.method === m).reduce((a, s) => a + s.total, 0)),
  }));
  const maxMethod = Math.max(1, ...methodTotals.map((x) => x.total));

  const topSold = useMemo(() => {
    const m = new Map<string, { qty: number; ciro: number }>();
    for (const s of sales)
      for (const it of s.items) {
        const e = m.get(it.name) ?? { qty: 0, ciro: 0 };
        const sign = s.isRefund ? -1 : 1;
        e.qty += sign * it.qty;
        e.ciro += sign * it.qty * it.unitPrice;
        m.set(it.name, e);
      }
    return [...m.entries()].sort((a, b) => b[1].qty - a[1].qty).slice(0, 3);
  }, [sales]);

  const topProfit = useMemo(() => {
    const m = new Map<string, { profit: number; qty: number }>();
    for (const s of sales)
      for (const it of s.items) {
        const c = costMap.get(it.name.toLowerCase()) ?? 0;
        const e = m.get(it.name) ?? { profit: 0, qty: 0 };
        const sign = s.isRefund ? -1 : 1;
        e.profit += sign * it.qty * (it.unitPrice - c);
        e.qty += sign * it.qty;
        m.set(it.name, e);
      }
    return [...m.entries()].sort((a, b) => b[1].profit - a[1].profit).slice(0, 3);
  }, [sales, costMap]);

  const perReg = [1, 2, 3].map((r) => {
    const rs = sales.filter((s) => s.register === r);
    return { r, total: round2(rs.reduce((a, s) => a + s.total, 0)), count: rs.length };
  });

  const billTotal = round2(BILLS.reduce((a, b) => a + b * (Number(bills[b]) || 0), 0));
  const cashDiff = round2(billTotal - kasaNakit);

  const cardData: Record<CardId, { label: string; val: string; sub: string }> = {
    ciro: { label: 'TOPLAM SATIŞ (CİRO) · ' + rangeLabel(range), val: fmt(ciro), sub: `Fiş adedi: ${sales.length}` },
    netkar: { label: 'NET KÂR · CİRO−MALİYET−MASRAF', val: fmt(netKar), sub: `Kâr marjı: %${ciro ? Math.round((netKar / ciro) * 100) : 0}` },
    kasaNakit: { label: 'KASADAKİ SICAK NAKİT', val: fmt(kasaNakit), sub: `Açılış: ${fmt(state.settings.openingCash)} · Nakit satış: ${fmt(nakitSatis)}` },
    posVeresiye: { label: 'POS & VERESİYE', val: `POS: ${fmt(posSatis)}`, sub: `Veresiye: ${fmt(veresiye)}` },
    anaKasaNakit: { label: 'ANA KASA NAKİT TOPLAMI', val: fmt(nakitSatis + moveIn), sub: 'nakit satış + kasa girişleri' },
    anaKasaPos: { label: 'ANA KASA POS TOPLAMI', val: fmt(posSatis), sub: `kart satış: ${fmt(salePos)} · cihaz: ${fmt(devicePos)}` },
    aylikNet: { label: 'AYLIK NET KÂR / KAZANÇ', val: fmt(aylikNet), sub: `Alış fatura (ay): ${fmt(alisAy)}` },
    genelKasa: { label: 'GENEL TOPLAM ANA KASASI', val: fmt(genelKasa), sub: 'nakit + POS + veresiye bakiye' },
    opening: { label: 'SABAH AÇILIŞ BOZUK PARA', val: '', sub: 'Her yeni gün için başlangıç nakdi · Varsayılan 0 ₺' },
  };

  return (
    <div className="h-full overflow-y-auto">
      {/* header */}
      <div className="mb-4 flex flex-wrap items-start gap-3">
        <div className="flex items-start gap-2.5">
          <div className="rounded-lg border border-amber/40 bg-amber/10 p-2 text-amber">
            <Ic n="monitor" c="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-mono text-[16px] font-bold tracking-wide">Kasa Takip & Detaylı Raporlar</h2>
            <p className="text-[11.5px] text-mut2">
              İşletmenizin ciro, kâr-zarar, nakit akışı ve kasa giriş-çıkış işlemlerini anlık olarak izleyin.
            </p>
          </div>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <Btn v="ghost" className="border-blue/40 text-blue" onClick={() => setCashOpen(true)}>
            <Ic n="trend" c="h-4 w-4" /> Kasaya Para Giriş/Çıkış Yap
          </Btn>
          <Btn v="danger" className="border-red/50 bg-red/15" onClick={() => setZOpen(true)}>
            <Ic n="print" c="h-4 w-4" /> Gün Sonu Raporu Al (Z Raporu)
          </Btn>
        </div>
      </div>

      {/* range filter */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-lg border border-line2 bg-ink/50 p-1">
          {(
            [
              { id: 'today', label: 'Bugün' },
              { id: '7', label: 'Son 7 Gün' },
              { id: '30', label: 'Son 30 Gün' },
              { id: 'all', label: 'Tüm Dönemler' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setRange(t.id)}
              className={cn(
                'rounded-md px-3 py-1.5 text-[12px] font-semibold transition-colors',
                range === t.id ? 'bg-amber text-[#1a1102]' : 'text-mut hover:text-txt'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
          <span className="font-mono text-[10px] uppercase tracking-widest text-mut2">Tarih Aralığı</span>
          <Inp
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setRange('custom');
            }}
            className="w-[142px] py-1.5 font-mono text-[11px]"
            title="Başlangıç tarihi"
          />
          <span className="font-mono text-[11px] text-mut2">→</span>
          <Inp
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setRange('custom');
            }}
            className="w-[142px] py-1.5 font-mono text-[11px]"
            title="Bitiş tarihi"
          />
          <span className="font-mono text-[10.5px] text-mut2">{reportPeriod} · {sales.length} satış</span>
        </div>
      </div>

      {/* stat cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpi.order.map((id, idx) => {
          const ADMIN_ONLY_CARDS: CardId[] = ['netkar', 'anaKasaNakit', 'anaKasaPos', 'aylikNet', 'genelKasa'];
          if (!isAdmin && ADMIN_ONLY_CARDS.includes(id)) return null;
          const c = kpi.cfg[id];
          const d = cardData[id];
          return (
            <div
              key={id}
              className={cn('relative rounded-xl border p-3.5 transition-colors', c.blink && 'card-blink')}
              style={{
                background: `linear-gradient(150deg, ${c.bg} 0%, color-mix(in srgb, ${c.bg} 55%, #0a0e13) 100%)`,
                borderColor: `color-mix(in srgb, ${c.border} 45%, transparent)`,
                ['--glow' as string]: c.glow,
              }}
            >
              <div className="mb-1 flex items-center justify-between gap-1">
                <div
                  className="rounded-md border p-1.5"
                  style={{ borderColor: `color-mix(in srgb, ${c.border} 50%, transparent)`, color: c.value, background: 'rgba(0,0,0,0.28)' }}
                >
                  <Ic n={c.icon} c="h-3.5 w-3.5" />
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => moveCard(id, -1)}
                    disabled={idx === 0}
                    title="Sola taşı"
                    className="flex h-5 w-5 items-center justify-center rounded border border-white/20 bg-black/30 text-white/80 transition-colors hover:bg-black/50 disabled:opacity-25"
                  >
                    <Ic n="chevL" c="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => moveCard(id, 1)}
                    disabled={idx === kpi.order.length - 1}
                    title="Sağa taşı"
                    className="flex h-5 w-5 items-center justify-center rounded border border-white/20 bg-black/30 text-white/80 transition-colors hover:bg-black/50 disabled:opacity-25"
                  >
                    <Ic n="chevR" c="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => setCfgOpen(id)}
                    title="Kart ayarları"
                    className="flex h-5 w-5 items-center justify-center rounded border border-white/20 bg-black/30 text-white/80 transition-colors hover:bg-black/50"
                  >
                    <Ic n="gear" c="h-3 w-3" />
                  </button>
                </div>
              </div>

              <div
                className="mt-1.5 text-center font-mono text-[10px] font-bold uppercase leading-snug tracking-[0.08em]"
                style={{ color: c.label }}
              >
                {d.label}
              </div>

              {id === 'opening' ? (
                <div className="mt-2.5 flex items-center justify-center gap-2">
                  <div className="relative w-32">
                    <Inp type="number" value={opening} onChange={(e) => setOpening(e.target.value)} className="pr-7 text-center font-mono font-bold" />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[11px] text-mut2">₺</span>
                  </div>
                  <Btn v="mint" className="shrink-0 px-2.5 py-2" onClick={() => { onPatch({ openingCash: Number(opening) || 0 }); toast('Açılış nakdi kaydedildi'); }}>
                    <Ic n="check" c="h-4 w-4" />
                  </Btn>
                </div>
              ) : (
                <div
                  className="mt-2.5 text-center font-mono font-bold leading-none tabular-nums"
                  style={{ color: c.value, fontSize: c.size, textShadow: '0 1px 2px rgba(0,0,0,0.55)' }}
                >
                  {d.val}
                </div>
              )}

              {c.showSub && (
                <div className="mt-2 truncate text-center text-[10px] font-semibold" style={{ color: c.sub }}>
                  {d.sub}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Admin kar/zarar dökümü */}
      {isAdmin && (
        <ProfitLossReport
          data={profitLoss}
          period={reportPeriod}
          onExcel={exportProfitLossExcel}
          onPdf={() => setPrintOpen(true)}
        />
      )}

      {/* günlük satış & kâr dökümü */}
      <DailyBreakdown state={state} dateFrom={dateFrom} dateTo={dateTo} toast={toast} />

      {printOpen && (
        <Modal title="Kar / Zarar Raporu — PDF Önizleme" icon={<Ic n="print" c="h-4.5 w-4.5" />} onClose={() => setPrintOpen(false)} w="max-w-3xl">
          <ProfitLossPrint data={profitLoss} period={reportPeriod} />
          <div className="mt-3 flex justify-end gap-2">
            <Btn v="ghost" onClick={() => setPrintOpen(false)}>Kapat</Btn>
            <Btn v="primary" onClick={() => window.print()}><Ic n="print" c="h-4 w-4" /> PDF Olarak Kaydet / Yazdır</Btn>
          </div>
        </Modal>
      )}

      {/* POS gün sonu */}
      <section className="mt-3 rounded-xl border border-[#a855f7]/25 bg-panel p-4">
        <div className="mb-3 flex items-center gap-2">
          <Ic n="card" c="h-4.5 w-4.5 text-[#c084fc]" />
          <h3 className="font-mono text-[12px] font-bold uppercase tracking-widest text-[#c084fc]">
            POS Cihazı Gün Sonu Kapatma
          </h3>
          <span className="ml-auto font-mono text-[10px] text-mut2">Bugün POS: {fmt(posSatis)}</span>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {[
            { n: 1, name: 'POS 1 Cihazı (YKB / Garanti)', v: pos1, set: setPos1 },
            { n: 2, name: 'POS 2 Cihazı (Ziraat / İş Bankası)', v: pos2, set: setPos2 },
          ].map((d) => (
            <div key={d.n} className="rounded-lg border border-line bg-ink/40 p-3">
              <div className="text-[12px] font-bold">{d.name}</div>
              <div className="mt-0.5 mb-2 text-[10px] text-mut2">Gün Sonu Slip Raporu Tutarı Girin</div>
              <Inp type="number" value={d.v} onChange={(e) => d.set(e.target.value)} placeholder={`₺ ${(posSatis / 2).toFixed(2)}`} className="font-mono" />
              <Btn
                v="ghost"
                className="mt-2 w-full border-[#a855f7]/40 bg-[#a855f7]/10 text-[#c084fc] hover:bg-[#a855f7]/20"
                onClick={() => {
                  const a = Number(d.v.replace(',', '.'));
                  if (!a || a <= 0) return toast('Slip tutarı girin', 'err');
                  onPosClose(d.n as 1 | 2, a);
                  d.set('');
                }}
              >
                POS {d.n} GÜN SONU KAPAT (CİROYA EKLE)
              </Btn>
            </div>
          ))}
        </div>
      </section>

      {/* Ulaşım Kartı gün sonu */}
      <section className="mt-3 rounded-xl border border-blue/25 bg-panel p-4">
        <div className="mb-2 flex items-center gap-2">
          <Ic n="card" c="h-4.5 w-4.5 text-blue" />
          <h3 className="font-mono text-[12px] font-bold uppercase tracking-widest text-blue">
            Ulaşım Kartı Gün Sonu Kapatma (Toplu Dolum Devri)
          </h3>
          <span className="ml-auto font-mono text-[10px] text-mut2">Aktif Limit: {fmt(state.imkart.limit)}</span>
        </div>
        <p className="mb-2.5 text-[11px] leading-relaxed text-mut2">
          Gün içinde tek tek girmek yerine, akşam kapanışında fiziksel Ulaşım Kartı cihazınızdan aldığınız günlük toplam
          dolum raporu tutarını tek seferde sisteme işleyebilirsiniz.
        </p>
        <div className="flex flex-wrap items-end gap-2">
          <Field label="Günlük Toplam Satılan Dolum Tutarı (₺)" className="min-w-[180px] flex-1">
            <Inp type="number" value={imBulk} onChange={(e) => setImBulk(e.target.value)} placeholder="₺ 0,00" className="font-mono" />
          </Field>
          <div className="flex gap-1 rounded-lg border border-line2 bg-ink/50 p-1">
            {(['nakit', 'pos'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setImVia(m)}
                className={cn('rounded-md px-4 py-1.5 text-[12px] font-bold transition-colors', imVia === m ? 'bg-blue text-[#04121f]' : 'text-mut hover:text-txt')}
              >
                {m === 'nakit' ? 'Nakit' : 'POS'}
              </button>
            ))}
          </div>
          <Btn
            v="ghost"
            className="border-blue/50 bg-blue/10 text-blue hover:bg-blue/20"
            onClick={() => {
              const a = Number(imBulk.replace(',', '.'));
              if (!a || a <= 0) return toast('Dolum tutarı girin', 'err');
              onImkartBulk(a, imVia);
              setImBulk('');
            }}
          >
            TOPLU DOLUMLARI CİROYA İŞLE
          </Btn>
        </div>
      </section>

      {/* charts row */}
      <div className="mt-3 grid gap-3 xl:grid-cols-[1.4fr_1fr_1fr]">
        <section className="rounded-xl border border-line bg-panel p-4">
          <h3 className="mb-3 flex items-center gap-1.5 font-mono text-[12px] font-bold uppercase tracking-widest text-mut">
            <Ic n="trend" c="h-3.5 w-3.5 text-amber" /> Grafiksel Satış Analizi
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-line bg-ink/30 p-3">
              <div className="mb-2.5 text-[11.5px] font-semibold">Ödeme Türü Dağılımı</div>
              <div className="space-y-2.5">
                {methodTotals.map((x) => (
                  <div key={x.m}>
                    <div className="mb-1 flex justify-between text-[10.5px]">
                      <span style={{ color: METHOD_META[x.m].color }}>{METHOD_META[x.m].label}</span>
                      <span className="font-mono font-bold tabular-nums">{fmt(x.total)}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-ink">
                      <div className="h-full rounded-full" style={{ width: `${(x.total / maxMethod) * 100}%`, background: METHOD_META[x.m].color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-line bg-ink/30 p-3">
              <div className="mb-2.5 text-[11.5px] font-semibold">Kârlılık ve Ciro Dengesi</div>
              <div className="flex h-[120px] items-end justify-around gap-3">
                {[
                  { label: 'Ciro', val: ciro, c: 'var(--color-amber)' },
                  { label: 'Maliyet', val: cost, c: 'var(--color-red)' },
                  { label: 'Net Kâr', val: Math.max(0, netKar), c: 'var(--color-mint)' },
                ].map((b) => {
                  const mx = Math.max(1, ciro, cost, netKar);
                  return (
                    <div key={b.label} className="flex flex-1 flex-col items-center gap-1">
                      <span className="font-mono text-[9px] font-bold text-mut2">{fmt(b.val)}</span>
                      <div className="flex h-20 w-full items-end">
                        <div className="anim-bar w-full rounded-t-md" style={{ height: `${Math.max(4, (b.val / mx) * 100)}%`, background: b.c }} />
                      </div>
                      <span className="font-mono text-[9.5px] text-mut2">{b.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-line bg-panel p-4">
          <h3 className="mb-3 flex items-center gap-1.5 font-mono text-[12px] font-bold uppercase tracking-widest text-mut">
            <Ic n="sparkles" c="h-3.5 w-3.5 text-mint" /> En Çok Satan Ürünler
          </h3>
          <div className="space-y-2">
            {topSold.map(([name, e], i) => (
              <div key={name} className="flex items-center gap-2.5 rounded-lg border border-line bg-panel2/50 px-3 py-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-mint/15 font-mono text-[11px] font-bold text-mint">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12px] font-semibold">{name}</div>
                  <div className="text-[10px] text-mut2">Miktar: {e.qty}</div>
                </div>
                <span className="font-mono text-[12px] font-bold text-mint tabular-nums">{fmt(e.ciro)}</span>
              </div>
            ))}
            {topSold.length === 0 && <div className="py-6 text-center font-mono text-[11px] text-mut2">Veri yok.</div>}
          </div>
        </section>

        <section className="rounded-xl border border-line bg-panel p-4">
          <h3 className="mb-3 flex items-center gap-1.5 font-mono text-[12px] font-bold uppercase tracking-widest text-mut">
            <Ic n="trend" c="h-3.5 w-3.5 text-amber2" /> En Çok Kâr Getirenler
          </h3>
          <div className="space-y-2">
            {topProfit.map(([name, e], i) => (
              <div key={name} className="flex items-center gap-2.5 rounded-lg border border-line bg-panel2/50 px-3 py-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber/15 font-mono text-[11px] font-bold text-amber2">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12px] font-semibold">{name}</div>
                  <div className="text-[10px] text-mut2">Adet: {e.qty}</div>
                </div>
                <span className="font-mono text-[12px] font-bold text-amber2 tabular-nums">{fmt(e.profit)}</span>
              </div>
            ))}
            {topProfit.length === 0 && <div className="py-6 text-center font-mono text-[11px] text-mut2">Veri yok.</div>}
          </div>
        </section>
      </div>

      {/* movements + register/staff */}
      <div className="mt-3 grid gap-3 xl:grid-cols-[1.3fr_1fr]">
        <section className="rounded-xl border border-line bg-panel">
          <div className="flex items-center gap-2 border-b border-line px-4 py-3">
            <Ic n="reset" c="h-4 w-4 text-mint" />
            <h3 className="font-mono text-[12px] font-bold uppercase tracking-widest text-mut">Para Giriş & Çıkış Hareketleri</h3>
            <span className="ml-auto font-mono text-[10px] text-mut2">
              Giriş: <span className="text-mint">{fmt(totalIn)}</span> · Çıkış: <span className="text-red">{fmt(totalOut)}</span>
            </span>
          </div>
          <div className="max-h-[320px] space-y-1.5 overflow-y-auto p-3">
            {movements.map((m, i) => (
              <div key={i} className="flex items-center gap-2.5 rounded-lg border border-line bg-panel2/50 px-3 py-2">
                <span className={cn('rounded-md p-1', m.amount > 0 ? 'bg-mint/10 text-mint' : 'bg-red/10 text-red')}>
                  <Ic n={m.amount > 0 ? 'arrowR' : 'arrowR'} c={cn('h-3.5 w-3.5', m.amount > 0 ? 'rotate-[-45deg]' : 'rotate-[135deg]')} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12px] font-semibold">{m.label}</div>
                  <div className="font-mono text-[9.5px] text-mut2">
                    {dstr(m.date)} {tstr(m.date)} · {m.by}
                  </div>
                </div>
                <span className={cn('font-mono text-[12.5px] font-bold tabular-nums', m.amount > 0 ? 'text-mint' : 'text-red')}>
                  {m.amount > 0 ? '+' : '−'}
                  {fmt(Math.abs(m.amount))}
                </span>
              </div>
            ))}
            {movements.length === 0 && <div className="py-6 text-center font-mono text-[11px] text-mut2">Hareket yok.</div>}
          </div>
        </section>

        <section className="rounded-xl border border-line bg-panel p-4">
          <h3 className="mb-3 flex items-center gap-1.5 font-mono text-[12px] font-bold uppercase tracking-widest text-mut">
            <Ic n="users" c="h-3.5 w-3.5 text-amber" /> Kasa & Personel Satış Dağılımı
          </h3>
          <div className="space-y-2">
            {perReg.map((r) => (
              <div key={r.r} className="rounded-lg border border-line bg-panel2/50 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[12.5px] font-bold">Kasa {r.r}</span>
                  <span className="font-mono text-[13px] font-bold text-mint tabular-nums">{fmt(r.total)}</span>
                </div>
                <div className="mt-1 flex justify-between text-[10px] text-mut2">
                  <span>Müşteri Sayısı: {r.count}</span>
                  <span>Ort. Sepet: {fmt(r.count ? r.total / r.count : 0)}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* günlük satış logları */}
      <section className="mt-3 overflow-x-auto rounded-xl border border-line bg-panel">
        <div className="flex items-center gap-2 border-b border-line px-4 py-3">
          <Ic n="file" c="h-4 w-4 text-mut" />
          <h3 className="font-mono text-[12px] font-bold uppercase tracking-widest text-mut">
            Satış Hareketleri & Kasiyer Logları
          </h3>
          <span className="ml-auto font-mono text-[10px] text-mut2">Toplam Satış Fişi: {sales.length}</span>
        </div>
        <table className="w-full min-w-[840px] border-collapse">
          <thead className="border-b border-line">
            <tr>
              <Th>Satış Saati & Kasiyer</Th>
              <Th>Fiş No</Th>
              <Th>Ürün Kalemleri</Th>
              <Th>Ödeme Türü</Th>
              <Th className="text-right">Toplam Tutar</Th>
              <Th>Kasa</Th>
              <Th className="text-right">İade</Th>
            </tr>
          </thead>
          <tbody>
            {sales.slice(0, 15).map((s) => {
              const totalRefunded = Object.values(s.refundedItems ?? {}).reduce((a, b) => a + b, 0);
              const totalQty = s.items.reduce((a, i) => a + i.qty, 0);
              const fullyRefunded = totalRefunded > 0 && totalRefunded >= totalQty;
              const partial = totalRefunded > 0 && !fullyRefunded;
              return (
                <tr
                  key={s.id}
                  className={cn(
                    'border-b border-line/60 last:border-0 hover:bg-panel2/50',
                    s.isRefund && 'bg-red/5',
                    fullyRefunded && 'opacity-60'
                  )}
                >
                  <Td>
                    <span className={cn('font-mono text-[12px] font-bold', s.isRefund && 'text-red')}>{tstr(s.date)}</span>
                    <span className="ml-2 rounded border border-line2 bg-panel3 px-1.5 py-0.5 font-mono text-[9.5px] text-mut">{s.cashier}</span>
                    {s.isRefund && <span className="ml-1.5 rounded bg-red/15 px-1.5 py-0.5 font-mono text-[9px] font-bold text-red">İADE</span>}
                    {fullyRefunded && <span className="ml-1.5 rounded bg-red/15 px-1.5 py-0.5 font-mono text-[9px] font-bold text-red">İADE EDİLDİ</span>}
                    {partial && <span className="ml-1.5 rounded bg-amber/15 px-1.5 py-0.5 font-mono text-[9px] font-bold text-amber2">KISMİ İADE</span>}
                  </Td>
                  <Td className={cn('font-mono text-[11px]', s.isRefund ? 'text-red' : 'text-amber2')}>{s.no}</Td>
                  <Td className="text-mut">
                    {s.items.length} Kalem ({totalQty} Adet)
                  </Td>
                  <Td>
                    <span
                      className="inline-flex rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-semibold"
                      style={{ color: METHOD_META[s.method].color, borderColor: METHOD_META[s.method].color + '55', background: METHOD_META[s.method].color + '14' }}
                    >
                      {METHOD_META[s.method].label}
                    </span>
                  </Td>
                  <Td className={cn('text-right font-mono font-bold tabular-nums', s.total < 0 ? 'text-red' : 'text-mint')}>{fmt(s.total)}</Td>
                  <Td className="text-mut">{s.register}</Td>
                  <Td className="text-right">
                    {!s.isRefund && !fullyRefunded && (
                      <button
                        onClick={() => setRefundSale(s)}
                        title="Bu satıştan iade yap"
                        className="rounded border border-red/40 bg-red/10 px-2 py-1 font-mono text-[10px] font-bold text-red transition-colors hover:bg-red/20"
                      >
                        ↺ İADE
                      </button>
                    )}
                    {s.isRefund && <span className="font-mono text-[10px] text-red">—</span>}
                  </Td>
                </tr>
              );
            })}
            {sales.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center font-mono text-[12px] text-mut2">Bu dönemde satış yok.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {/* nakit sayım matrisi */}
      <section className="mt-3 rounded-xl border border-line bg-panel p-4">
        <div className="mb-3 flex items-center gap-2">
          <Ic n="banknote" c="h-4.5 w-4.5 text-mint" />
          <h3 className="font-mono text-[12px] font-bold uppercase tracking-widest text-mut">
            Nakit Kasa Sayım Matrisi (Bozuk Para & Banknot Hesaplayıcı)
          </h3>
          <span className="ml-auto font-mono text-[10px] text-mut2">
            Kasada olması gereken: <span className="text-mint">{fmt(kasaNakit)}</span>
          </span>
        </div>
        <div className="grid gap-3 md:grid-cols-[1fr_240px]">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {BILLS.map((b) => (
              <div key={b} className="rounded-lg border border-line bg-ink/40 p-2.5">
                <div className="mb-1 font-mono text-[11px] font-bold text-amber2">{b < 1 ? `${b * 100} kr` : `${b} ₺`}</div>
                <input
                  type="number"
                  value={bills[b] ?? ''}
                  onChange={(e) => setBills({ ...bills, [b]: e.target.value })}
                  placeholder="0"
                  className="w-full rounded-md border border-line2 bg-ink/70 px-2 py-1.5 text-right font-mono text-[13px] outline-none focus:border-amber/70"
                />
              </div>
            ))}
          </div>
          <div className="flex flex-col justify-center rounded-lg border border-mint/25 bg-mint/5 p-4">
            <div className="font-mono text-[10px] uppercase tracking-widest text-mut">Fiziksel Sayım Toplamı</div>
            <div className="mt-1 font-mono text-2xl font-bold text-mint tabular-nums">{fmt(billTotal)}</div>
            <div className="mt-3 border-t border-line pt-2 font-mono text-[11px]">
              <span className="text-mut">Kasa Farkı / Açık-Fazla:</span>
              <div className={cn('mt-0.5 text-[15px] font-bold tabular-nums', Math.abs(cashDiff) < 0.01 ? 'text-mut' : cashDiff > 0 ? 'text-mint' : 'text-red')}>
                {cashDiff > 0 ? 'Fazla +' : cashDiff < 0 ? 'Açık −' : 'Denk '}
                {fmt(Math.abs(cashDiff))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {cfgOpen && (
        <CardSettingsModal
          title={cardData[cfgOpen].label}
          cfg={kpi.cfg[cfgOpen]}
          onChange={(patch) => patchCfg(cfgOpen, patch)}
          onReset={() => resetCfg(cfgOpen)}
          onClose={() => setCfgOpen(null)}
        />
      )}

      {cashOpen && <CashMoveModal onClose={() => setCashOpen(false)} onSubmit={onCashMove} toast={toast} />}
      {refundSale && (
        <RefundModal
          sale={refundSale}
          onClose={() => setRefundSale(null)}
          onConfirm={(items, reason, method) => {
            onRefund(refundSale.id, items, reason, method);
            setRefundSale(null);
          }}
        />
      )}
      {zOpen && (
        <ReportModal
          title="Gün Sonu Z Raporu"
          text={buildReport(state, state.settings.report.items)}
          phone={state.settings.report.ownerPhone || state.settings.waPhone}
          onClose={() => setZOpen(false)}
        />
      )}
    </div>
  );
}

function rangeLabel(r: Range) {
  return r === 'today'
    ? 'GÜNLÜK'
    : r === '7'
      ? 'SON 7 GÜN'
      : r === '30'
        ? 'SON 30 GÜN'
        : r === 'custom'
          ? 'ÖZEL TARİH ARALIĞI'
          : 'TÜM ZAMANLAR';
}

/* ---------------- İADE MODALI ---------------- */

const REFUND_REASONS = [
  'Müşteri iadesi',
  'Ürün bozuk / hasarlı',
  'Yanlış ürün',
  'Fiyat uyuşmazlığı',
  'SKT geçmiş',
  'Diğer',
];

function RefundModal({
  sale,
  onClose,
  onConfirm,
}: {
  sale: AppState['sales'][number];
  onClose: () => void;
  onConfirm: (items: Record<string, number>, reason: string, method: 'nakit' | 'kart' | 'veresiye') => void;
}) {
  const already = sale.refundedItems ?? {};
  const [qtys, setQtys] = useState<Record<string, number>>(() => {
    const out: Record<string, number> = {};
    for (const it of sale.items) out[it.name] = 0;
    return out;
  });
  const [reason, setReason] = useState(REFUND_REASONS[0]);
  const [method, setMethod] = useState<'nakit' | 'kart' | 'veresiye'>(
    sale.method === 'veresiye' ? 'veresiye' : sale.method === 'kart' || sale.method === 'nakit+pos' ? 'kart' : 'nakit'
  );

  const totalRefund = sale.items.reduce((sum, it) => sum + (qtys[it.name] ?? 0) * it.unitPrice, 0);

  const setQty = (name: string, next: number, max: number) => {
    setQtys((x) => ({ ...x, [name]: Math.max(0, Math.min(max, next)) }));
  };

  const selectAll = () => {
    const out: Record<string, number> = {};
    for (const it of sale.items) {
      const done = already[it.name] ?? 0;
      out[it.name] = Math.max(0, it.qty - done);
    }
    setQtys(out);
  };

  return (
    <Modal title={`İade İşlemi — ${sale.no}`} icon={<Ic n="reset" c="h-4.5 w-4.5" />} onClose={onClose} w="max-w-2xl">
      <div className="mb-3 grid grid-cols-2 gap-2 rounded-lg border border-line bg-ink/40 p-3 font-mono text-[11px] md:grid-cols-4">
        <div><span className="text-mut2">Fiş No: </span><span className="font-bold">{sale.no}</span></div>
        <div><span className="text-mut2">Tarih: </span><span className="font-bold">{dstr(sale.date)} {tstr(sale.date)}</span></div>
        <div><span className="text-mut2">Kasiyer: </span><span className="font-bold">{sale.cashier}</span></div>
        <div><span className="text-mut2">Tutar: </span><span className="font-bold text-mint">{fmt(sale.total)}</span></div>
        {sale.customer && <div className="col-span-2"><span className="text-mut2">Müşteri: </span><span className="font-bold">{sale.customer}</span></div>}
      </div>

      <div className="mb-2 flex items-center justify-between">
        <span className="font-mono text-[10.5px] uppercase tracking-widest text-mut">İade Edilecek Ürünler</span>
        <button
          onClick={selectAll}
          className="rounded border border-line2 bg-ink/50 px-2 py-1 font-mono text-[10px] font-semibold text-mut hover:text-amber2"
        >
          TAM İADE
        </button>
      </div>

      <div className="max-h-[40vh] space-y-1.5 overflow-y-auto rounded-lg border border-line bg-ink/30 p-2">
        {sale.items.map((it) => {
          const done = already[it.name] ?? 0;
          const max = it.qty - done;
          const cur = qtys[it.name] ?? 0;
          return (
            <div key={it.name} className={cn('flex items-center gap-2 rounded-lg border border-line bg-panel2/60 px-3 py-2', max === 0 && 'opacity-50')}>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12px] font-semibold">{it.name}</div>
                <div className="font-mono text-[10px] text-mut2">
                  Satılan: {fmtN(it.qty)} {it.unit} × {fmt(it.unitPrice)}
                  {done > 0 && <span className="ml-2 text-red">İade edilen: {fmtN(done)}</span>}
                  {max > 0 && <span className="ml-2 text-mint">Kalan: {fmtN(max)}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setQty(it.name, cur - 1, max)}
                  disabled={max === 0 || cur <= 0}
                  className="h-6 w-6 rounded border border-line2 font-mono text-[11px] text-mut hover:text-amber2 disabled:opacity-30"
                >
                  −
                </button>
                <input
                  type="number"
                  value={cur}
                  onChange={(e) => setQty(it.name, Number(e.target.value) || 0, max)}
                  className="h-6 w-12 rounded border border-line2 bg-ink/70 text-center font-mono text-[11px] font-bold text-amber2 outline-none"
                  disabled={max === 0}
                />
                <button
                  onClick={() => setQty(it.name, cur + 1, max)}
                  disabled={max === 0 || cur >= max}
                  className="h-6 w-6 rounded border border-line2 font-mono text-[11px] text-mut hover:text-amber2 disabled:opacity-30"
                >
                  +
                </button>
              </div>
              <span className="w-24 shrink-0 text-right font-mono text-[12px] font-bold tabular-nums text-red">
                {cur > 0 ? `−${fmt(cur * it.unitPrice)}` : '—'}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div>
          <span className="mb-1 block font-mono text-[10.5px] uppercase tracking-widest text-mut">İade Sebebi</span>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded-lg border border-line2 bg-ink/70 px-3 py-2 text-[13px] outline-none focus:border-amber/70"
          >
            {REFUND_REASONS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </div>
        <div>
          <span className="mb-1 block font-mono text-[10.5px] uppercase tracking-widest text-mut">İade Yöntemi</span>
          <div className="grid grid-cols-3 gap-1.5">
            {(
              [
                { id: 'nakit' as const, label: 'Nakit' },
                { id: 'kart' as const, label: 'Kart / POS' },
                { id: 'veresiye' as const, label: 'Veresiye' },
              ]
            ).map((m) => (
              <button
                key={m.id}
                onClick={() => setMethod(m.id)}
                disabled={m.id === 'veresiye' && !sale.customer}
                className={cn(
                  'rounded-lg border px-2 py-2 text-[11.5px] font-bold transition-colors',
                  method === m.id ? 'border-red bg-red/15 text-red' : 'border-line2 bg-ink/40 text-mut hover:text-txt',
                  m.id === 'veresiye' && !sale.customer && 'opacity-30 cursor-not-allowed'
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between rounded-lg border border-red/30 bg-red/5 px-4 py-3">
        <span className="font-mono text-[10.5px] uppercase tracking-widest text-mut">İADE TOPLAMI</span>
        <span className="font-mono text-xl font-bold text-red tabular-nums">−{fmt(totalRefund)}</span>
      </div>

      <div className="mt-3 flex gap-2">
        <Btn v="ghost" className="flex-1" onClick={onClose}>Vazgeç</Btn>
        <Btn
          v="danger"
          className="flex-1 border-red bg-red text-white hover:brightness-110"
          disabled={totalRefund <= 0}
          onClick={() => onConfirm(qtys, reason, method)}
        >
          <Ic n="check" c="h-4 w-4" /> İADEYİ ONAYLA
        </Btn>
      </div>
    </Modal>
  );
}

function CashMoveModal({
  onClose,
  onSubmit,
  toast,
}: {
  onClose: () => void;
  onSubmit: (dir: 'in' | 'out', amount: number, label: string) => void;
  toast: Toast;
}) {
  const [dir, setDir] = useState<'in' | 'out'>('in');
  const [amount, setAmount] = useState('');
  const [label, setLabel] = useState('');
  const users = USERS;
  return (
    <Modal
      title="Kasaya Para Giriş / Çıkış"
      icon={<Ic n="wallet" c="h-4.5 w-4.5" />}
      onClose={onClose}
      w="max-w-sm"
      footer={
        <>
          <Btn v="ghost" onClick={onClose}>
            Vazgeç
          </Btn>
          <Btn
            v={dir === 'in' ? 'mint' : 'danger'}
            onClick={() => {
              const a = Number(amount.replace(',', '.'));
              if (!a || a <= 0) return toast('Tutar girin', 'err');
              onSubmit(dir, a, label.trim() || (dir === 'in' ? 'Kasaya nakit girişi' : 'Kasadan nakit çıkışı'));
              onClose();
            }}
          >
            <Ic n="check" c="h-4 w-4" /> Kaydet
          </Btn>
        </>
      }
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          {(['in', 'out'] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDir(d)}
              className={cn(
                'rounded-lg border px-3 py-2.5 text-[13px] font-bold transition-all',
                dir === d
                  ? d === 'in'
                    ? 'border-mint bg-mint/15 text-mint'
                    : 'border-red bg-red/15 text-red'
                  : 'border-line2 bg-ink/40 text-mut'
              )}
            >
              {d === 'in' ? 'Para Girişi' : 'Para Çıkışı'}
            </button>
          ))}
        </div>
        <Field label="Tutar (₺)">
          <Inp type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" />
        </Field>
        <Field label="Açıklama">
          <Inp value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Örn: Kasa avansı, bozuk para…" />
        </Field>
        <div className="hidden">{users.length}</div>
      </div>
    </Modal>
  );
}
