import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '../utils/cn';
import { Ic } from '../icons';
import {
  Btn,
  Confirm,
  Field,
  Inp,
  Modal,
  ScreenHead,
  Sel,
  Stat,
  Td,
  Th,
} from '../components/ui';
import { waLink } from '../lib/report';
import { APP_VERSION } from '../lib/buildMode';
import { useLocale } from '../locales/i18n';
import {
  getCountryVatProfile,
  suggestCountryVat,
} from '../locales/countryVat';
import {
  calcVatDeclaration,
  dstr,
  EXPENSE_CATS,
  fmt,
  fromTRY,
  invoiceVatSummary,
  round2,
  toTRY,
  tstr,
  todayKey,
  uid,
  type AppState,
  type Customer,
  type Expense,
  type Invoice,
  type InvoicePayment,
  activeSymbol,
  type Product,
  type Settings,
} from '../data';

type Toast = (msg: string, type?: 'ok' | 'err') => void;

/* ================= ALIŞ FATURASI ================= */

const DAILY_BUDGET_KEY = 'mosbarkod_daily_purchase_budget';
const ACCOUNTANT_PHONE_KEY = 'mosbarkod_accountant_phone';
const SUPPLIER_PHONE_KEY = 'mosbarkod_supplier_phones';
const PURCHASE_IMGS_KEY = 'mosbarkod_purchase_images';

/* Fatura durum matrisi — 4 ton */
const statusBadge = (inv: Invoice) => {
  const today = todayKey();
  const overdue = inv.status === 'bekliyor' && inv.dueDate && today > inv.dueDate;
  const dueSoon =
    inv.status === 'bekliyor' &&
    inv.dueDate &&
    today <= inv.dueDate &&
    today >= new Date(new Date(inv.dueDate).getTime() - 3 * 86400000).toISOString().slice(0, 10);
  const overdueDays = overdue && inv.dueDate ? Math.round((new Date(today).getTime() - new Date(inv.dueDate).getTime()) / 86400000) : 0;
  if (inv.status === 'odendi') return { label: 'ÖDENDİ', cls: 'bg-mint/15 text-mint border-mint/40', days: 0 };
  if (overdue) return { label: 'VADE GEÇTİ', cls: 'bg-red/15 text-red border-red/40', days: overdueDays };
  if (dueSoon) return { label: 'ÖDEME YAKIN', cls: 'bg-[#a855f7]/15 text-[#c084fc] border-[#a855f7]/40', days: 0 };
  return { label: 'BEKLİYOR', cls: 'bg-amber/15 text-amber2 border-amber/40', days: 0 };
};

/* Kısmi ödeme modali */
function PayInvoiceModal({
  inv,
  onClose,
  onPatch,
  toast,
}: {
  inv: Invoice;
  onClose: () => void;
  onPatch: (id: string, patch: Partial<Invoice>) => void;
  toast: Toast;
}) {
  const paid = round2((inv.payments ?? []).reduce((a, p) => a + p.amount, 0));
  const remaining = round2(inv.total - paid);
  const [amt, setAmt] = useState(remaining > 0 ? String(fromTRY(remaining)) : '');
  const [method, setMethod] = useState<'nakit' | 'pos'>('nakit');
  const [note, setNote] = useState('');

  const a = Number(amt.replace(',', '.')) || 0;
  const aTRY = toTRY(a);
  const valid = a > 0 && aTRY <= remaining + 1e-9;

  const submit = () => {
    if (!valid) return;
    const now = new Date().toISOString();
    const payments = [...(inv.payments ?? []), { id: uid(), date: now, amount: aTRY, method, note: note.trim() || 'Kısmi ödeme' }];
    const done = paid + aTRY >= inv.total - 1e-9;
    onPatch(inv.id, {
      payments,
      status: done ? 'odendi' : 'bekliyor',
      paidDate: done ? now : inv.paidDate,
    });
    toast(done ? `Fatura tamamen ödendi — ${fmt(aTRY)}` : `Kısmi ödeme kaydedildi — kalan: ${fmt(round2(remaining - aTRY))}`);
    onClose();
  };

  return (
    <Modal title={`Ödeme — ${inv.no}`} icon={<Ic n="banknote" c="h-4.5 w-4.5" />} onClose={onClose} w="max-w-md">
      <div className="mb-3 grid grid-cols-3 gap-2 rounded-lg border border-line bg-ink/40 p-3 font-mono text-[11px] text-center">
        <div><div className="text-[9px] uppercase tracking-widest text-mut2">Fatura</div><div className="mt-1 font-bold text-txt">{fmt(inv.total)}</div></div>
        <div><div className="text-[9px] uppercase tracking-widest text-mut2">Ödenen</div><div className="mt-1 font-bold text-mint">{fmt(paid)}</div></div>
        <div><div className="text-[9px] uppercase tracking-widest text-mut2">Kalan</div><div className={cn('mt-1 font-bold', remaining > 0 ? 'text-red' : 'text-mint')}>{fmt(remaining)}</div></div>
      </div>

      <div className="space-y-2.5">
        <div>
          <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-mut">Ödeme Tutarı (₺) *</span>
          <Inp type="number" value={amt} onChange={(e) => setAmt(e.target.value)} className="text-center font-mono text-lg font-bold" autoFocus />
          {a > remaining + 1e-9 && <p className="mt-1 text-[11px] font-semibold text-red">Kalan tutar: {fmt(remaining)}</p>}
        </div>
        <div>
          <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-mut">Yöntem</span>
          <div className="grid grid-cols-2 gap-1.5">
            {(['nakit', 'pos'] as const).map((m) => (
              <button key={m} onClick={() => setMethod(m)} className={cn('rounded-lg border px-3 py-2.5 text-[12.5px] font-bold transition-colors', method === m ? 'border-amber bg-amber/15 text-amber2' : 'border-line2 bg-ink/40 text-mut hover:text-txt')}>
                {m === 'nakit' ? 'Nakit' : 'POS'}
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-mut">Not (ops.)</span>
          <Inp value={note} onChange={(e) => setNote(e.target.value)} placeholder="Örn: yarım ödeme, taksit 1/2…" />
        </div>
      </div>

      {(inv.payments ?? []).length > 0 && (
        <div className="mt-3">
          <div className="mb-1.5 font-mono text-[10px] uppercase tracking-widest text-mut2">Önceki Ödemeler</div>
          <div className="max-h-[120px] space-y-1 overflow-y-auto">
            {[...(inv.payments ?? [])].reverse().map((p) => (
              <div key={p.id} className="flex items-center gap-2 rounded-md border border-line bg-panel2/50 px-2.5 py-1.5">
                <span className="text-[10.5px] font-semibold text-mint">{p.method === 'pos' ? 'POS' : 'Nakit'}</span>
                <span className="font-mono text-[9.5px] text-mut2">{dstr(p.date)} {tstr(p.date)}</span>
                <span className="ml-auto font-mono text-[11.5px] font-bold tabular-nums">{fmt(p.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <Btn v="ghost" className="flex-1" onClick={onClose}>Vazgeç</Btn>
        <Btn v="mint" className="flex-1" disabled={!valid} onClick={submit}>
          <Ic n="check" c="h-4 w-4" /> {remaining - a <= 1e-9 ? 'Tam Öde & Kapat' : 'Kısmi Ödemeyi Kaydet'}
        </Btn>
      </div>
    </Modal>
  );
}

export function PurchaseScreen({
  invoices,
  products,
  state,
  add,
  update,
  remove,
  toast,
}: {
  invoices: Invoice[];
  products: Product[];
  state: AppState;
  add: (inv: Invoice, toStock: boolean) => void;
  update: (id: string, patch: Partial<Invoice>) => void;
  remove: (id: string) => void;
  toast: Toast;
}) {
  const { locale } = useLocale();
  const countryVat = useMemo(() => getCountryVatProfile(locale), [locale]);
  const vatRates = countryVat.rates;
  const vatMeta = countryVat.meta;
  const vatName = countryVat.vatName;

  const [tab, setTab] = useState<'new' | 'history' | 'vat'>('new');
  const [supplier, setSupplier] = useState('');
  const [otherSupplier, setOtherSupplier] = useState('');
  const [payType, setPayType] = useState<Invoice['payType']>('nakit');
  const [dueDate, setDueDate] = useState('');
  const [toStock, setToStock] = useState(true);
  const [query, setQuery] = useState('');
  const [del, setDel] = useState<Invoice | null>(null);
  const [edit, setEdit] = useState<Invoice | null>(null);
  const [items, setItems] = useState<Array<{ productId: string; name: string; qty: number; cost: number; sale: number; vatRate: number }>>([]);

  /* ---------- KDV ---------- */
  /* Alış faturası KDV DAHİL girilir: mal alınırken KDV bedeli fiilen
     ödendiği için birim maliyet brüt (KDV dahil) tutulur. */
  const [vatIncluded, setVatIncluded] = useState(true);
  const [supplierNo, setSupplierNo] = useState('');
  const [docType, setDocType] = useState<NonNullable<Invoice['docType']>>('e-fatura');
  const [taxNo, setTaxNo] = useState('');
  const [invDate, setInvDate] = useState(todayKey());

  /* ---------- YENİ GELİŞTİRMELER ---------- */
  // Geçmiş filtreler
  const [hq, setHq] = useState('');
  const [fSupplier, setFSupplier] = useState('');
  const [fStatus, setFStatus] = useState<'all' | 'odendi' | 'bekliyor' | 'overdue' | 'dueSoon'>('all');
  const [fFrom, setFFrom] = useState('');
  const [fTo, setFTo] = useState('');
  // Fotoğraf ilanı
  const [img, setImg] = useState<string | null>(null);
  const imgRef = useRef<HTMLInputElement>(null);
  // Ödeme / kopyala
  const [payInv, setPayInv] = useState<Invoice | null>(null);
  const [supplierPhone, setSupplierPhone] = useState(() => { try { return JSON.parse(localStorage.getItem(SUPPLIER_PHONE_KEY) ?? '{}') as Record<string, string>; } catch { return {}; } });
  // Günlük bütçe
  const [dailyBudget, setDailyBudget] = useState<number>(() => { try { return Number(localStorage.getItem(DAILY_BUDGET_KEY)) || 0; } catch { return 0; } });
  // Excel içe aktar
  const impRef = useRef<HTMLInputElement>(null);
  // Fatura foto önizleme
  const [viewImg, setViewImg] = useState<string | null>(null);

  const SUPPLIERS = [
    'Mey İçki Pazarlama',
    'Türk Tuborg Bayii',
    'Philip Morris Dağıtım',
    'Coca-Cola İçecek Dağıtım',
    'Frito Lay Cips Dağıtım',
    'Erikli Su & Beypazarı Soda Dağıtım',
    'Kavaklıdere Şarapları A.Ş.',
    'Sütaş Süt ve Gıda Dağıtım',
  ];
  const OTHER = 'Diğer Toptancı (Açıklama Ekleyin)';
  const isOther = supplier === OTHER;

  const productMatches = products.filter((p) =>
    query.trim() === ''
      ? true
      : p.name.toLowerCase().includes(query.toLowerCase()) || p.barcode.includes(query)
  );

  /* KDV hesabı — kalem bazında matrah/KDV kırılımı */
  const vatCalc = useMemo(() => {
    const byRate = new Map<number, { base: number; vat: number }>();
    let base = 0;
    let vat = 0;
    for (const l of items) {
      const line = l.qty * l.cost;
      const r = l.vatRate ?? 0;
      const lineBase = vatIncluded ? line / (1 + r / 100) : line;
      const lineVat = vatIncluded ? line - lineBase : line * (r / 100);
      const e = byRate.get(r) ?? { base: 0, vat: 0 };
      e.base += lineBase;
      e.vat += lineVat;
      byRate.set(r, e);
      base += lineBase;
      vat += lineVat;
    }
    return {
      rows: [...byRate.entries()].sort((a, b) => a[0] - b[0]).map(([rate, v]) => ({ rate, base: round2(v.base), vat: round2(v.vat) })),
      base: round2(base),
      vat: round2(vat),
      gross: round2(base + vat),
    };
  }, [items, vatIncluded]);

  const total = vatCalc.gross;
  const lineCount = items.reduce((s, l) => s + l.qty, 0);

  const odendiCount = invoices.filter((i) => i.status === 'odendi').length;
  const bekliyorCount = invoices.filter((i) => i.status === 'bekliyor').length;

  /* ---- ürün maliyet geçmişi (son 3 + ortalama) ---- */
  const productHistory = useMemo(() => {
    const map = new Map<string, number[]>();
    for (const inv of invoices) {
      for (const l of inv.lines) {
        const key = l.name.toLowerCase();
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(l.cost);
      }
    }
    const out = new Map<string, { last: number; avg: number; count: number }>();
    for (const [k, arr] of map) {
      const last3 = [...arr].reverse().slice(0, 3);
      const avg = last3.reduce((a, b) => a + b, 0) / last3.length;
      out.set(k, { last: last3[0], avg: round2(avg), count: arr.length });
    }
    return out;
  }, [invoices]);

  /* ---- tedarikçi skoru ---- */
  const supplierScore = useMemo(() => {
    const map = new Map<string, { total: number; paid: number; pending: number; count: number; leadSum: number; leadCount: number }>();
    for (const inv of invoices) {
      const s = inv.supplier;
      if (!map.has(s)) map.set(s, { total: 0, paid: 0, pending: 0, count: 0, leadSum: 0, leadCount: 0 });
      const entry = map.get(s)!;
      entry.total += inv.total;
      entry.count += 1;
      if (inv.status === 'odendi') entry.paid += inv.total;
      else entry.pending += inv.total;
      if (inv.dueDate && inv.paidDate) {
        const lead = Math.round((new Date(inv.paidDate).getTime() - new Date(inv.date).getTime()) / 86400000);
        entry.leadSum += lead;
        entry.leadCount += 1;
      }
    }
    return Array.from(map.entries()).map(([name, d]) => ({
      name,
      ...d,
      lead: d.leadCount > 0 ? Math.round(d.leadSum / d.leadCount) : null,
    }));
  }, [invoices]);
  const mostExpensive = useMemo(() => [...supplierScore].sort((a, b) => b.paid - a.paid)[0], [supplierScore]);

  /* ---- günlük bütçe doluluğu ---- */
  const todayPurchases = round2(invoices.filter((i) => i.date.slice(0, 10) === todayKey()).reduce((a, i) => a + i.total, 0));
  const budgetPct = dailyBudget > 0 ? Math.min((todayPurchases / dailyBudget) * 100, 100) : 0;
  const budgetOver = dailyBudget > 0 && todayPurchases > dailyBudget;

  /* ---- vade takvimi ---- */
  const dueWall = useMemo(() => {
    const today = todayKey();
    const groups = { overdue: [] as Invoice[], thisWeek: [] as Invoice[], thisMonth: [] as Invoice[], later: [] as Invoice[] };
    for (const inv of invoices.filter((i) => i.status === 'bekliyor' && i.payType === 'veresiye' && i.dueDate)) {
      const due = inv.dueDate as string;
      if (due < today) groups.overdue.push(inv);
      else if (daysTo(due) <= 7) groups.thisWeek.push(inv);
      else if (due.slice(0, 7) === today.slice(0, 7)) groups.thisMonth.push(inv);
      else groups.later.push(inv);
    }
    return groups;
  }, [invoices]);

  /* ---- geçmiş liste filtreleri ---- */
  const filteredList = useMemo(() => {
    return invoices.filter((i) => {
      if (fSupplier && i.supplier !== fSupplier) return false;
      const st = statusBadge(i).label;
      if (fStatus === 'odendi' && i.status !== 'odendi') return false;
      if (fStatus === 'bekliyor' && st !== 'BEKLİYOR') return false;
      if (fStatus === 'overdue' && st !== 'VADE GEÇTİ') return false;
      if (fStatus === 'dueSoon' && st !== 'ÖDEME YAKIN') return false;
      const day = i.date.slice(0, 10);
      if (fFrom && day < fFrom) return false;
      if (fTo && day > fTo) return false;
      const q = hq.trim().toLowerCase();
      if (q) {
        const ok = i.no.toLowerCase().includes(q) || i.supplier.toLowerCase().includes(q) || i.lines.some((l) => l.name.toLowerCase().includes(q));
        if (!ok) return false;
      }
      return true;
    });
  }, [invoices, fSupplier, fStatus, fFrom, fTo, hq]);

  const footerTotal = round2(filteredList.reduce((a, i) => a + i.total, 0));
  const footerPaid = round2(filteredList.filter((i) => i.status === 'odendi').reduce((a, i) => a + i.total, 0));
  const footerPending = round2(filteredList.filter((i) => i.status === 'bekliyor').reduce((a, i) => a + i.total, 0));
  const footerBase = round2(filteredList.reduce((a, i) => a + invoiceVatSummary(i).base, 0));
  const footerVat = round2(filteredList.reduce((a, i) => a + invoiceVatSummary(i).vat, 0));
  const supplierList = useMemo(() => [...new Set(invoices.map((i) => i.supplier))].sort(), [invoices]);

  /* ---- KDV BEYANNAMESİ (Hesaplanan − İndirilecek) ---- */
  const [vatMonth, setVatMonth] = useState(() => todayKey().slice(0, 7));
  const [accountantPhone, setAccountantPhone] = useState(() => localStorage.getItem(ACCOUNTANT_PHONE_KEY) ?? '');
  const [vatPrintOpen, setVatPrintOpen] = useState(false);
  const vd = useMemo(() => calcVatDeclaration(state, vatMonth, locale), [state, vatMonth, locale]);

  const exportVatCsv = () => {
    const L: (string | number)[][] = [];
    L.push([`MOSBARKODYAZILIM — ${vatName} BEYANNAMESİ ÖZETİ (${vatMonth}) - ${countryVat.countryName}`]);
    L.push([]);
    L.push([`1) HESAPLANAN ${vatName} (SATIŞLAR)`]);
    L.push(['Oran', 'Matrah', vatName]);
    for (const r of vd.outputRows) L.push([`%${r.rate}`, r.base, r.vat]);
    L.push(['TOPLAM', vd.outputBase, vd.outputVat]);
    L.push([]);
    L.push([`2) İNDİRİLECEK ${vatName} — ALIŞ FATURALARI`]);
    L.push(['Tarih', 'Fatura No', 'Belge No', 'VKN/TaxID', 'Tedarikçi', 'Matrah', vatName, 'Toplam']);
    for (const i of invoices.filter((x) => x.date.slice(0, 7) === vatMonth)) {
      const s = invoiceVatSummary(i);
      L.push([dstr(i.date), i.no, i.supplierNo ?? '', i.taxNo ?? '', i.supplier, s.base, s.vat, s.gross]);
    }
    L.push(['TOPLAM', '', '', '', '', vd.purchaseBase, vd.purchaseVat, '']);
    L.push([]);
    L.push([`3) İNDİRİLECEK ${vatName} — MASRAF FATURALARI`]);
    L.push(['Tarih', 'Kategori', 'Açıklama', 'Oran', 'Matrah', vatName, 'Toplam']);
    for (const e of state.expenses.filter((x) => x.date.slice(0, 7) === vatMonth && (x.hasInvoice ?? true) && (x.vatRate ?? 0) > 0)) {
      const rate = e.vatRate ?? 0;
      const incl = e.vatIncluded ?? true;
      const base = round2(incl ? e.amount / (1 + rate / 100) : e.amount);
      const vat = round2(incl ? e.amount - base : e.amount * (rate / 100));
      L.push([dstr(e.date), e.category, e.note, `%${rate}`, base, vat, round2(base + vat)]);
    }
    L.push(['TOPLAM', '', '', '', vd.expenseBase, vd.expenseVat, '']);
    L.push([]);
    L.push(['SONUÇ']);
    L.push([`Hesaplanan ${vatName} (Satış)`, vd.outputVat]);
    L.push([`İndirilecek ${vatName} (Alış)`, vd.purchaseVat]);
    L.push([`İndirilecek ${vatName} (Masraf)`, vd.expenseVat]);
    L.push([`Toplam İndirilecek ${vatName}`, vd.inputVat]);
    L.push([vd.payable > 0 ? `ÖDENECEK ${vatName}` : `DEVREDEN ${vatName}`, vd.payable > 0 ? vd.payable : vd.carryForward]);

    const csv = '\uFEFF' + L.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `mosbarkod-${vatName.toLowerCase()}-beyanname-${vatMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast(`${vatMonth} ${vatName} beyanname dökümü indirildi — mali müşavire gönderebilirsiniz`);
  };

  /* ---- KDV raporunu WhatsApp ile muhasebeciye gönder ---- */
  const buildVatWhatsAppText = () => {
    const per = new Date(vatMonth + '-01T12:00:00').toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
    const L: string[] = [];
    L.push(`*${vatName.toUpperCase()} BEYANNAME ÖZETİ*`);
    L.push(`${per} · ${state.settings.storeName} (${countryVat.countryName})`);
    if (state.settings.taxNo) L.push(`VKN: ${state.settings.taxNo} · ${state.settings.taxOffice}`);
    L.push('────────────────────');
    L.push(`*1) HESAPLANAN ${vatName.toUpperCase()} (SATIŞ)*`);
    if (vd.outputRows.length === 0) L.push('  Kayıt yok');
    for (const r of vd.outputRows) L.push(`  %${r.rate} → matrah ${fmt(r.base)} · ${vatName} ${fmt(r.vat)}`);
    L.push(`  TOPLAM: ${fmt(vd.outputVat)}  (${vd.saleCount} satış)`);
    L.push('');
    L.push(`*2) İNDİRİLECEK ${vatName.toUpperCase()} — ALIŞ*`);
    if (vd.purchaseRows.length === 0) L.push('  Kayıt yok');
    for (const r of vd.purchaseRows) L.push(`  %${r.rate} → matrah ${fmt(r.base)} · ${vatName} ${fmt(r.vat)}`);
    L.push(`  TOPLAM: ${fmt(vd.purchaseVat)}  (${vd.invoiceCount} fatura)`);
    L.push('');
    L.push(`*3) İNDİRİLECEK ${vatName.toUpperCase()} — MASRAF*`);
    if (vd.expenseRows.length === 0) L.push('  Kayıt yok');
    for (const r of vd.expenseRows) L.push(`  %${r.rate} → matrah ${fmt(r.base)} · ${vatName} ${fmt(r.vat)}`);
    L.push(`  TOPLAM: ${fmt(vd.expenseVat)}  (${vd.expenseCount} belge)`);
    L.push('────────────────────');
    L.push(`Hesaplanan ${vatName}: ${fmt(vd.outputVat)}`);
    L.push(`İndirilecek ${vatName}: ${fmt(vd.inputVat)}`);
    L.push(
      vd.payable > 0
        ? `*ÖDENECEK ${vatName.toUpperCase()}: ${fmt(vd.payable)}*`
        : `*DEVREDEN ${vatName.toUpperCase()}: ${fmt(vd.carryForward)}*`
    );
    L.push('────────────────────');
    L.push('MOSBARKODYAZILIM otomatik vergi raporu');
    return L.join('\n');
  };

  const sendVatWhatsApp = () => {
    const saved = localStorage.getItem(ACCOUNTANT_PHONE_KEY) ?? '';
    let phone = saved;
    if (!phone) {
      const entered = window.prompt('Muhasebeci WhatsApp numarası (05xxxxxxxxx):', '');
      if (!entered || entered.replace(/\D/g, '').length < 10) {
        toast('Geçerli muhasebeci numarası girilmedi', 'err');
        return;
      }
      phone = entered;
      localStorage.setItem(ACCOUNTANT_PHONE_KEY, phone);
      setAccountantPhone(phone);
    }
    window.open(waLink(phone, buildVatWhatsAppText()), '_blank');
    toast(`KDV raporu WhatsApp ile muhasebeciye gönderiliyor (${phone})`);
  };

  /* ---- foto ilanı ---- */
  const readImg = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => setImg(String(reader.result));
    reader.readAsDataURL(file);
  };
  const getInvImg = (inv: Invoice): string | null => {
    try { return JSON.parse(localStorage.getItem(PURCHASE_IMGS_KEY) ?? '{}')[inv.id] ?? null; } catch { return null; }
  };
  const saveInvImg = (invId: string, data: string) => {
    try {
      const map = JSON.parse(localStorage.getItem(PURCHASE_IMGS_KEY) ?? '{}') as Record<string, string>;
      map[invId] = data;
      localStorage.setItem(PURCHASE_IMGS_KEY, JSON.stringify(map));
    } catch { /* dolu olabilir */ }
  };

  const addProductLine = (p: Product) => {
    setItems((x) => {
      const idx = x.findIndex((i) => i.productId === p.id);
      if (idx >= 0) {
        const next = [...x];
        next[idx] = { ...next[idx], qty: next[idx].qty + 1 };
        return next;
      }
      return [...x, { productId: p.id, name: p.name, qty: 1, cost: fromTRY(p.cost || 0), sale: fromTRY(p.p1), vatRate: suggestCountryVat(p.category, locale) }];
    });
  };

  /* Enter ile ilk sonucu ekle */
  const onQueryKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && productMatches.length > 0) {
      addProductLine(productMatches[0]);
      e.preventDefault();
    }
  };

  const setItem = (i: number, patch: Partial<{ qty: number; cost: number; sale: number; vatRate: number }>) =>
    setItems((x) => x.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));

  /* Barkodla kalem bulma (arama alanına odaklama) */
  const focusBarcode = () => {
    document.getElementById('purchase-product-search')?.focus();
  };

  const submit = () => {
    if (!supplier.trim()) return toast('Tedarikçi seçin', 'err');
    if (isOther && !otherSupplier.trim()) return toast('Diğer toptancı için açıklama girin', 'err');
    if (items.length === 0) return toast('En az bir ürün ekleyin', 'err');
    if (payType === 'veresiye' && !dueDate) return toast('Veresiye için vade tarihi girin', 'err');

    const lines = items.map((l) => ({
      name: l.name,
      qty: l.qty,
      /* MALİYET KDV DAHİL (brüt) yazılır: mal alınırken KDV bedeli de ödendi.
         Girilen tutar KDV HARİÇ ise matraha çevirmeden önce brüte tamamlanır. */
      cost: toTRY(vatIncluded ? l.cost : round2(l.cost * (1 + (l.vatRate ?? 0) / 100))),
      sale: toTRY(l.sale),
      vatRate: l.vatRate,
    }));
    const finalSupplier = isOther ? otherSupplier.trim() : supplier.trim();
    const newId = uid();

    add(
      {
        id: newId,
        no: `AF${Date.now()}`,
        supplierNo: supplierNo.trim() || undefined,
        docType,
        taxNo: taxNo.trim() || undefined,
        date: new Date(invDate + 'T12:00:00').toISOString(),
        supplier: finalSupplier,
        payType,
        dueDate: payType === 'veresiye' ? dueDate : undefined,
        vatIncluded: true, // kalem maliyetleri KDV DAHİL (brüt) saklanır
        lines,
        subtotal: toTRY(vatCalc.base),
        vatTotal: toTRY(vatCalc.vat),
        total: toTRY(vatCalc.gross),
        status: payType === 'veresiye' ? 'bekliyor' : 'odendi',
        payments: [],
      },
      toStock
    );
    if (img) saveInvImg(newId, img);
    toast(`Fatura kaydedildi — Matrah ${fmt(toTRY(vatCalc.base))} + KDV ${fmt(toTRY(vatCalc.vat))} = ${fmt(toTRY(vatCalc.gross))}${toStock ? ' · stoklara işlendi' : ''}`);
    setSupplier('');
    setOtherSupplier('');
    setPayType('nakit');
    setDueDate('');
    setItems([]);
    setQuery('');
    setImg(null);
    setSupplierNo('');
    setTaxNo('');
    setInvDate(todayKey());
    setTab('history');
  };

  /* Yinelenen fatura kopyalama */
  const duplicateInvoice = (inv: Invoice) => {
    add(
      {
        ...inv,
        id: uid(),
        no: `AF${Date.now()}`,
        date: new Date().toISOString(),
        status: inv.payType === 'veresiye' ? 'bekliyor' : 'odendi',
        paidDate: undefined,
        payments: [],
      },
      false
    );
    toast(`Fatura kopyalandı — ${inv.no} → yeni kopya`);
  };

  /* Tedarikçi WhatsApp pazarlık linki */
  const negotiateWhatsApp = (inv: Invoice) => {
    const phoneMap = JSON.parse(localStorage.getItem(SUPPLIER_PHONE_KEY) ?? '{}') as Record<string, string>;
    let phone = phoneMap[inv.supplier] ?? '';
    if (!phone) {
      const entered = window.prompt(`${inv.supplier} — telefon numarası girin (05xxxxxxxxx):`, '');
      if (entered && entered.replace(/\D/g, '').length >= 10) {
        phone = entered;
        const next = { ...phoneMap, [inv.supplier]: entered };
        localStorage.setItem(SUPPLIER_PHONE_KEY, JSON.stringify(next));
        setSupplierPhone(next);
      } else {
        toast('Geçerli telefon girilmedi', 'err');
        return;
      }
    }
    const dueMsg = inv.dueDate ? ` Vade: ${dstr(inv.dueDate)}.` : '';
    const paid = round2((inv.payments ?? []).reduce((a, p) => a + p.amount, 0));
    const remaining = round2(inv.total - paid);
    const msg = `${inv.no} nolu fatura${dueMsg} Toplam ${fmt(inv.total)}. ${paid > 0 ? `Ödenen: ${fmt(paid)}. ` : ''}${remaining > 0 ? `Kalan: ${fmt(remaining)} — ödeme hatırlatması.` : 'Teşekkürler.'}`;
    window.open(waLink(phone, msg), '_blank');
  };

  /* Excel/CSV fatura içe aktarımı */
  const importFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const dec = new TextDecoder('utf-8');
        const rows = dec.decode(reader.result as ArrayBuffer).split(/\r?\n/).filter((l) => l.trim() !== '');
        const sep = rows[0]?.includes(';') ? ';' : ',';
        const dataLines = rows.slice(1);
        const newItems: typeof items = [];
        let skipped = 0;
        for (const line of dataLines) {
          const cells = line.split(sep).map((c) => c.trim().replace(/^"|"$/g, ''));
          const [name, qtyS, costS, saleS] = cells;
          if (!name || !qtyS) { skipped++; continue; }
          const prod = products.find((p) => p.name.toLowerCase() === name.toLowerCase());
          const qty = Number(String(qtyS).replace(',', '.')) || 1;
          const cost = fromTRY(Number(String(costS ?? '0').replace(',', '.')) || (prod?.cost ?? 0));
          const sale = fromTRY(Number(String(saleS ?? '0').replace(',', '.')) || (prod?.p1 ?? 0));
          const vatCell = cells[4];
          const vr = vatCell != null && vatCell !== '' ? Number(String(vatCell).replace(/[^\d.]/g, '')) : NaN;
          const vatRate = vatRates.includes(vr) ? vr : suggestCountryVat(prod?.category ?? '', locale);
          newItems.push({ productId: prod?.id ?? 'imp' + uid(), name, qty, cost, sale, vatRate });
        }
        if (newItems.length === 0) {
          toast('Excel içinden kalem bulunamadı. Format: Ürün Adı;Adet;Alış;Satış', 'err');
          return;
        }
        setItems(newItems);
        toast(`${newItems.length} kalem Excel dosyasından faturaya eklendi${skipped ? `, ${skipped} satır atlandı` : ''}`);
      } catch {
        toast('Dosya okunamadı — CSV (noktalı virgül/virgül) desteklenmektedir', 'err');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const markAsPaid = (inv: Invoice, method: 'nakit' | 'pos') => {
    const now = new Date().toISOString();
    const payment: InvoicePayment = {
      id: uid(),
      date: now,
      amount: inv.total,
      method,
      note: 'Manuel tam ödeme',
    };
    update(inv.id, {
      status: 'odendi',
      paidDate: now,
      payments: [...(inv.payments || []), payment],
    });
    toast(`${inv.no} numaralı fatura ödendi olarak işaretlendi`);
  };

  const payBadge = (p: Invoice['payType']) =>
    p === 'nakit' ? (
      <span className="rounded bg-mint/15 px-2 py-0.5 font-mono text-[10px] font-bold text-mint">Nakit</span>
    ) : p === 'pos' ? (
      <span className="rounded bg-[#a855f7]/15 px-2 py-0.5 font-mono text-[10px] font-bold text-[#c084fc]">POS</span>
    ) : (
      <span className="rounded bg-amber/15 px-2 py-0.5 font-mono text-[10px] font-bold text-amber2">Veresiye</span>
    );

  const isOverdue = (inv: Invoice) => inv.status === 'bekliyor' && inv.dueDate && todayKey() > inv.dueDate;
  void isOverdue;
  const isDueSoon = (inv: Invoice) => inv.status === 'bekliyor' && inv.dueDate && todayKey() <= inv.dueDate && todayKey() >= new Date(new Date(inv.dueDate).getTime() - 3 * 86400000).toISOString().slice(0, 10);
  void isDueSoon;

  return (
    <div className="h-full overflow-y-auto">
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 border-b border-line/60 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber/40 bg-amber/10 text-amber">
            <Ic n="bag" c="h-4 w-4" />
          </div>
          <div>
            <h2 className="font-mono text-[14.5px] font-bold leading-tight tracking-wide">Alış Faturaları & Mal Alım Modülü</h2>
            <p className="text-[10.5px] leading-tight text-mut2">
              Fatura girişi, KDV beyannamesi, vade takibi, maliyet analizi ve Excel aktarımı.
            </p>
          </div>
        </div>
        <div className="flex gap-1 rounded-xl border border-line bg-panel p-1 shadow-sm">
          <button onClick={() => setTab('new')} className={cn('flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-colors', tab === 'new' ? 'bg-white text-[#14171c] shadow-sm' : 'text-mut hover:text-txt')}>
            <Ic n="plus" c="h-3.5 w-3.5" /> Yeni Alış Faturası
          </button>
          <button onClick={() => setTab('history')} className={cn('flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-colors', tab === 'history' ? 'bg-white text-[#14171c] shadow-sm' : 'text-mut hover:text-txt')}>
            <Ic n="file" c="h-3.5 w-3.5" /> Alış Fatura Geçmişi
          </button>
          <button onClick={() => setTab('vat')} className={cn('flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-colors', tab === 'vat' ? 'bg-amber text-[#1a1102] shadow-sm' : 'border border-amber/40 bg-amber/10 text-amber2 hover:bg-amber/20')}>
            <Ic n="percent" c="h-3.5 w-3.5" /> KDV Hesabı
          </button>
        </div>
      </div>

      {tab === 'new' && (
        <div className="grid gap-3 xl:grid-cols-[380px_1fr]">
          <section className="rounded-xl border border-line bg-panel p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="font-mono text-[12px] font-bold uppercase tracking-widest text-mut">Tedarikçi Seçimi</div>
              <div className="flex gap-1.5">
                <button
                  onClick={focusBarcode}
                  title="Barkod odağı — kalem aramasına git"
                  className="rounded border border-line2 bg-ink/50 p-1.5 text-mut hover:text-amber2"
                >
                  <Ic n="barcode" c="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => impRef.current?.click()}
                  title="Excel / CSV ile toplu kalem aktar (Ürün Adı;Adet;Alış;Satış)"
                  className="rounded border border-mint/40 bg-mint/10 px-2 py-1 font-mono text-[9.5px] font-bold text-mint hover:bg-mint/20"
                >
                  EXCEL
                </button>
              </div>
            </div>
            <input ref={impRef} type="file" accept=".csv,.txt" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) importFile(f); e.target.value = ''; }} />
            <div className="space-y-3">
              <Field label="Tedarikçi Firma *">
                <Sel value={supplier} onChange={(e) => setSupplier(e.target.value)}>
                  <option value="">-- Tedarikçi Seçin --</option>
                  {SUPPLIERS.map((s) => <option key={s}>{s}</option>)}
                  <option>{OTHER}</option>
                </Sel>
              </Field>
              {/* Tedarikçi skoru kutusu */}
              {supplier && !isOther && supplierScore.find((x) => x.name === supplier) && (
                <div className="rounded-lg border border-line bg-ink/40 px-3 py-2 text-[10.5px]">
                  <div className="flex justify-between"><span className="text-mut2">Toplam alım:</span><span className="font-mono font-bold text-txt">{fmt(supplierScore.find((x) => x.name === supplier)!.total)}</span></div>
                  <div className="flex justify-between"><span className="text-mut2">Ort. teslim (öde.):</span><span className="font-mono text-mut">{supplierScore.find((x) => x.name === supplier)!.lead != null ? `${supplierScore.find((x) => x.name === supplier)!.lead} gün` : '—'}</span></div>
                </div>
              )}
              {isOther && <Field label="Toptancı Açıklaması *"><Inp value={otherSupplier} onChange={(e) => setOtherSupplier(e.target.value)} placeholder="Firma / kişi adı yazın" /></Field>}

              {/* Fatura künyesi — resmi belge eşleşmesi */}
              <div className="rounded-lg border border-line bg-ink/40 p-2.5">
                <div className="mb-2 flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-widest text-mut">
                  <Ic n="file" c="h-3.5 w-3.5 text-amber" /> Fatura Künyesi (Resmi Belge)
                </div>
                <div className="space-y-2">
                  <Field label="Tedarikçi Fatura No">
                    <Inp value={supplierNo} onChange={(e) => setSupplierNo(e.target.value)} placeholder="Belge üstündeki no" className="font-mono text-[12px]" />
                  </Field>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Fatura Tarihi">
                      <Inp type="date" value={invDate} onChange={(e) => setInvDate(e.target.value)} className="font-mono text-[11.5px]" />
                    </Field>
                    <Field label="VKN / TCKN">
                      <Inp value={taxNo} onChange={(e) => setTaxNo(e.target.value.replace(/\D/g, '').slice(0, 11))} placeholder="10-11 hane" className="font-mono text-[11.5px]" />
                    </Field>
                  </div>
                  <div>
                    <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-mut">Belge Tipi</span>
                    <div className="grid grid-cols-4 gap-1">
                      {([
                        { id: 'e-fatura' as const, label: 'e-Fat.' },
                        { id: 'e-arsiv' as const, label: 'e-Arş.' },
                        { id: 'kagit' as const, label: 'Kağıt' },
                        { id: 'irsaliye' as const, label: 'İrsal.' },
                      ]).map((d) => (
                        <button key={d.id} onClick={() => setDocType(d.id)} className={cn('rounded-md border px-1 py-1.5 font-mono text-[10px] font-bold transition-colors', docType === d.id ? 'border-blue bg-blue/15 text-blue' : 'border-line2 bg-ink/40 text-mut hover:text-txt')}>
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* KDV / Vergi giriş şekli */}
              <div className="rounded-lg border border-amber/30 bg-amber/5 p-2.5">
                <div className="mb-2 flex items-center justify-between gap-1.5">
                  <span className="flex items-center gap-1.5 font-mono text-[9.5px] font-bold uppercase tracking-widest text-amber2">
                    <Ic n="percent" c="h-3.5 w-3.5" /> {vatName} Giriş Şekli
                  </span>
                  <span className="rounded bg-amber/15 px-1.5 py-0.5 font-mono text-[9px] font-bold text-amber2">
                    {countryVat.countryName}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {([
                    { v: false, label: `${vatName.toUpperCase()} HARİÇ`, desc: 'Matrah gir' },
                    { v: true, label: `${vatName.toUpperCase()} DAHİL`, desc: 'Brüt gir' },
                  ]).map((o) => (
                    <button
                      key={String(o.v)}
                      onClick={() => setVatIncluded(o.v)}
                      className={cn('rounded-lg border px-2 py-2 text-center transition-colors', vatIncluded === o.v ? 'border-amber bg-amber/15 text-amber2' : 'border-line2 bg-ink/40 text-mut hover:text-txt')}
                    >
                      <div className="font-mono text-[11px] font-bold">{o.label}</div>
                      <div className="text-[9px] opacity-70">{o.desc}</div>
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-[9.5px] leading-relaxed text-mut2">
                  Tedarikçi faturasındaki birim fiyatlar hangi şekildeyse onu seçin. Stok maliyeti her durumda {vatName} hariç kaydedilir.
                </p>
              </div>

              <div>
                <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-mut">Ödeme Türü *</span>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['nakit', 'pos', 'veresiye'] as const).map((id) => (
                    <button key={id} onClick={() => setPayType(id)} className={cn('rounded-lg border px-3 py-2 text-[12px] font-semibold transition-colors', payType === id ? 'border-amber bg-amber/15 text-amber2' : 'border-line2 bg-ink/40 text-mut hover:text-txt')}>
                      {id === 'nakit' ? 'Nakit' : id === 'pos' ? 'POS' : 'Veresiye'}
                    </button>
                  ))}
                </div>
              </div>
              {payType === 'veresiye' && <Field label="Vade Tarihi *"><Inp type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></Field>}
              <label className="flex cursor-pointer items-center gap-2 text-[11.5px] text-mut">
                <button role="checkbox" aria-checked={toStock} onClick={() => setToStock(!toStock)} className={cn('flex h-4 w-4 items-center justify-center rounded border transition-colors', toStock ? 'border-amber bg-amber text-[#1a1102]' : 'border-line2 bg-ink')}>
                  {toStock && <Ic n="check" c="h-3 w-3" />}
                </button>
                Gelen malları anında stoğa işle
              </label>

              {/* Fatura fotoğrafı (PDF/ilan) */}
              <div className="rounded-lg border border-line bg-ink/40 p-2.5">
                <div className="mb-1.5 flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-widest text-mut">
                  <Ic n="camera" c="h-3.5 w-3.5 text-amber" /> Fatura Fotoğrafı / İlan
                </div>
                {img ? (
                  <div className="flex items-center gap-2">
                    <img src={img} alt="" className="h-12 w-20 rounded border border-line2 object-cover" />
                    <span className="flex-1 truncate text-[10px] text-mint">Fotoğraf eklendi</span>
                    <button onClick={() => setImg(null)} className="rounded border border-red/40 p-1 text-red hover:bg-red/10"><Ic n="x" c="h-3 w-3" /></button>
                  </div>
                ) : (
                  <Btn v="ghost" className="w-full" onClick={() => imgRef.current?.click()}>
                    <Ic n="camera" c="h-4 w-4" /> Fotoğraf Ekle
                  </Btn>
                )}
                <input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) readImg(f); e.target.value = ''; }} />
              </div>

              <div className="border-t border-line pt-3">
                <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-mut">Gelen Ürünleri Ekle</div>
                <div className="relative"><span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-mut2"><Ic n="search" c="h-4 w-4" /></span><Inp id="purchase-product-search" className="pl-8" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={onQueryKey} placeholder="Ürün/barkod ara… Enter = ilk sonucu ekle" /></div>
                <div className="mt-2 max-h-[300px] space-y-1 overflow-y-auto rounded-lg border border-line bg-ink/30 p-2">
                  {productMatches.length === 0 ? <div className="py-8 text-center font-mono text-[11px] text-mut2">Ürün bulunamadı.</div> : productMatches.slice(0, 30).map((p) => {
                    const hist = productHistory.get(p.name.toLowerCase());
                    return (
                      <button key={p.id} onClick={() => addProductLine(p)} className="flex w-full items-center gap-2 rounded-lg border border-line bg-panel2/50 px-2.5 py-2 text-left transition-colors hover:border-amber/50 hover:bg-panel2">
                        <span className="min-w-0 flex-1 truncate text-[12px] font-medium">{p.name}</span>
                        {hist ? (
                          <span className="font-mono text-[9.5px] text-mut2" title={`Son geliş: ${fmt(hist.last)} · Ort: ${fmt(hist.avg)} · ${hist.count} kez`}>
                            Son {fmt(hist.last)}
                          </span>
                        ) : (
                          <span className="font-mono text-[11px] text-mut2">Maliyet {fmt(p.cost || 0)}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-line bg-panel">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
              <div className="font-mono text-[12px] font-bold uppercase tracking-widest text-mut">Fatura Kalemleri</div>
              <div className="flex items-center gap-3 font-mono text-[11px]">
                <span className="text-mut2">Matrah: <b className="text-txt">{fmt(vatCalc.base)}</b></span>
                <span className="text-mut2">{vatName}: <b className="text-amber2">{fmt(vatCalc.vat)}</b></span>
                <span className="rounded-md border border-mint/40 bg-mint/10 px-2 py-1 text-[12px] font-bold text-mint">GENEL: {fmt(total)}</span>
              </div>
            </div>
            <div className="border-b border-line bg-panel2/60 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-mut2" style={{ display: 'grid', gridTemplateColumns: '1.6fr 92px 130px 150px 128px' }}>
              <div>Ürün</div><div className="text-center">Adet</div><div className="text-center">{vatIncluded ? `Br. Fiyat (${vatName} Dahil)` : `Br. Fiyat (${vatName} Hariç)`}</div><div className="text-center">{vatName} Oranı</div><div className="text-center">Satış Fiyatı</div>
            </div>
            <div className="min-h-[280px] space-y-2 overflow-y-auto p-4">
              {items.length === 0 ? (
                <div className="flex h-[250px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-line2 text-center">
                  <div className="rounded-xl border border-line2 bg-panel3 p-4 text-mut2"><Ic n="file" c="h-8 w-8" /></div>
                  <div className="text-[13px] font-medium text-mut">Faturada henüz ürün bulunmuyor.</div>
                  <div className="text-[11px] text-mut2">Soldaki panelden ürün arayarak veya Excel ile toplu aktararak kalem ekleyebilirsiniz.</div>
                </div>
              ) : items.map((l, i) => {
                const hist = productHistory.get(l.name.toLowerCase());
                const costUp = hist && l.cost > 0 && hist.last > 0 && l.cost > fromTRY(hist.last) * 1.09;
                const costDown = hist && l.cost > 0 && hist.last > 0 && l.cost < fromTRY(hist.last) * 0.91;
                const sugg = hist ? round2((hist.last || hist.avg) * 1.4) : 0;
                const lineGross = l.qty * l.cost;
                const lineBase = vatIncluded ? lineGross / (1 + l.vatRate / 100) : lineGross;
                const lineVat = vatIncluded ? lineGross - lineBase : lineGross * (l.vatRate / 100);
                return (
                  <div key={l.productId + i} className={cn('rounded-lg border px-3 py-2.5', costUp ? 'border-red/40 bg-red/5' : costDown ? 'border-mint/30 bg-mint/5' : 'border-line bg-panel2/60')}>
                    <div className="items-center gap-2" style={{ display: 'grid', gridTemplateColumns: '1.6fr 92px 130px 150px 128px' }}>
                      <div className="min-w-0">
                        <div className="truncate text-[12px] font-semibold">{l.name}</div>
                        {hist && (
                          <div className={cn('mt-0.5 font-mono text-[9px]', costUp ? 'font-bold text-red' : 'text-mut2')}>
                            son {fmt(hist.last)} · ort {fmt(hist.avg)}{costUp ? ' ↑' : costDown ? ' ↓' : ''}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-center gap-1"><button onClick={() => setItems((x) => x.filter((_, idx) => idx !== i))} className="h-6 w-6 shrink-0 rounded border border-red/30 text-red hover:bg-red/10">×</button><Inp type="number" value={String(l.qty)} onChange={(e) => setItem(i, { qty: Math.max(1, Number(e.target.value) || 1) })} className="h-8 text-center font-mono" /></div>
                      <Inp type="number" value={String(l.cost)} onChange={(e) => setItem(i, { cost: Number(e.target.value) || 0 })} className={cn('h-8 text-center font-mono', costUp && 'text-red')} />
                      <div className="flex justify-center gap-0.5">
                        {vatRates.map((r) => (
                          <button
                            key={r}
                            onClick={() => setItem(i, { vatRate: r })}
                            title={vatMeta[r]?.desc ?? `${r}%`}
                            className={cn(
                              'flex-1 rounded border py-1.5 font-mono text-[9.5px] font-bold transition-colors',
                              l.vatRate === r ? 'border-transparent text-[#0a0e13]' : 'border-line2 bg-ink/40 text-mut hover:text-txt'
                            )}
                            style={l.vatRate === r ? { background: vatMeta[r]?.color ?? '#f59e0b' } : undefined}
                          >
                            %{r}
                          </button>
                        ))}
                      </div>
                      <div className="relative">
                        <Inp type="number" value={String(l.sale)} onChange={(e) => setItem(i, { sale: Number(e.target.value) || 0 })} className="h-8 text-center font-mono text-mint" />
                        {sugg > 0 && l.sale <= 0 && <button onClick={() => setItem(i, { sale: fromTRY(sugg) })} title="Önerilen: maliyetin %40 üstü" className="absolute -top-1.5 right-1 rounded bg-mint/20 px-1.5 py-0.5 font-mono text-[8px] font-bold text-mint">+{fmt(sugg)}</button>}
                      </div>
                    </div>
                    {/* Satır matrah / KDV / toplam */}
                    <div className="mt-1.5 flex justify-end gap-3 border-t border-line/60 pt-1.5 font-mono text-[9.5px]">
                      <span className="text-mut2">Matrah: <b className="text-txt">{fmt(round2(lineBase))}</b></span>
                      <span className="text-mut2">{vatName} %{l.vatRate}: <b className="text-amber2">{fmt(round2(lineVat))}</b></span>
                      <span className="text-mut2">Toplam: <b className="text-mint">{fmt(round2(lineBase + lineVat))}</b></span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* KDV / VERGİ ÖZET TABLOSU */}
            {items.length > 0 && (
              <div className="border-t border-line bg-ink/30 px-4 py-3">
                <div className="mb-2 flex items-center justify-between gap-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-amber2">
                  <span className="flex items-center gap-1.5"><Ic n="percent" c="h-3.5 w-3.5" /> {vatName} Özeti — {countryVat.countryName} Oran Kırılımı</span>
                  <span className="text-[9px] text-mut2 font-normal">{countryVat.countryName} Vergi Oranları</span>
                </div>
                <div className="overflow-x-auto rounded-lg border border-line">
                  <table className="w-full min-w-[420px] border-collapse font-mono text-[11px]">
                    <thead className="bg-panel2/60">
                      <tr>
                        <th className="px-3 py-1.5 text-left text-[9.5px] uppercase tracking-widest text-mut2">{vatName} Oranı</th>
                        <th className="px-3 py-1.5 text-right text-[9.5px] uppercase tracking-widest text-mut2">Matrah</th>
                        <th className="px-3 py-1.5 text-right text-[9.5px] uppercase tracking-widest text-mut2">{vatName} Tutarı</th>
                        <th className="px-3 py-1.5 text-right text-[9.5px] uppercase tracking-widest text-mut2">Toplam</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vatCalc.rows.map((r) => (
                        <tr key={r.rate} className="border-t border-line/60">
                          <td className="px-3 py-1.5">
                            <span className="rounded px-1.5 py-0.5 text-[10px] font-bold text-[#0a0e13]" style={{ background: vatMeta[r.rate]?.color ?? '#7d8ca0' }}>
                              %{r.rate}
                            </span>
                            <span className="ml-2 text-[9.5px] text-mut2">{vatMeta[r.rate]?.desc ?? ''}</span>
                          </td>
                          <td className="px-3 py-1.5 text-right tabular-nums text-txt">{fmt(r.base)}</td>
                          <td className="px-3 py-1.5 text-right font-bold tabular-nums text-amber2">{fmt(r.vat)}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums text-mint">{fmt(round2(r.base + r.vat))}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t-2 border-amber/40 bg-amber/5">
                      <tr>
                        <td className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-mut">GENEL TOPLAM</td>
                        <td className="px-3 py-2 text-right font-bold tabular-nums text-txt">{fmt(vatCalc.base)}</td>
                        <td className="px-3 py-2 text-right font-bold tabular-nums text-amber2">{fmt(vatCalc.vat)}</td>
                        <td className="px-3 py-2 text-right text-[13px] font-bold tabular-nums text-mint">{fmt(vatCalc.gross)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <p className="mt-1.5 text-[9.5px] text-mut2">
                  Birim maliyet <b className="text-amber2">KDV DAHİL</b> alınır: malı alırken KDV bedelini de ödediğiniz için maliyet brüt hesaplanır. Ödenen KDV, KDV beyannamesinde ayrıca indirilecek KDV olarak görünür.
                </p>
              </div>
            )}

            <div className="flex items-center justify-between border-t border-line px-4 py-3">
              <span className="font-mono text-[10px] uppercase tracking-widest text-mut2">Toplam Kalem: {lineCount} · {vatIncluded ? 'Fiyatlar KDV DAHİL' : 'Fiyatlar KDV HARİÇ'}</span>
              <Btn v="mint" onClick={submit} className="gap-2 px-4"><Ic n="check" c="h-4 w-4" /> Alış Faturasını Onayla</Btn>
            </div>
          </section>
        </div>
      )}

      {tab === 'history' && (
        <>
          {/* Günlük bütçe statik çubuğu */}
          <div className={cn('mb-4 flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3', budgetOver ? 'border-red/50 bg-red/5' : 'border-line bg-panel')}>
            <div className="flex items-center gap-2.5">
              <div className={cn('rounded-lg border p-2 text-mint', budgetOver && 'text-red border-red/40')}>
                <Ic n="monitor" c="h-4 w-4" />
              </div>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-mut2">Günlük Alım Bütçesi</div>
                <div className="flex items-baseline gap-2">
                  <span className={cn('font-mono text-lg font-bold tabular-nums', budgetOver ? 'text-red' : 'text-mint')}>{fmt(todayPurchases)}</span>
                  {dailyBudget > 0 && <span className="font-mono text-[11px] text-mut2">/ {fmt(dailyBudget)}</span>}
                </div>
              </div>
            </div>
            {dailyBudget > 0 && (
              <div className="h-2 min-w-[120px] flex-1 overflow-hidden rounded-full bg-line">
                <div className={cn('h-full rounded-full transition-all', budgetOver ? 'bg-red' : 'bg-mint')} style={{ width: `${budgetPct}%` }} />
              </div>
            )}
            {budgetOver && <span className="font-mono text-[11px] font-bold text-red">AŞIM +{fmt(todayPurchases - dailyBudget)}</span>}
            <button
              onClick={() => {
                const next = Number(window.prompt(`Günlük alış bütçesi (${activeSymbol()}):`, String(dailyBudget > 0 ? fromTRY(dailyBudget) : '')) || '');
                const nextTRY = toTRY(next || 0);
                setDailyBudget(nextTRY);
                localStorage.setItem(DAILY_BUDGET_KEY, String(nextTRY));
                toast(next > 0 ? `Günlük bütçe ${fmt(nextTRY)} olarak kaydedildi` : 'Günlük bütçe kaldırıldı');
              }}
              className="ml-auto rounded-md border border-line2 bg-ink/50 px-2.5 py-1.5 font-mono text-[10.5px] text-mut hover:text-amber2"
            >
              Bütçe Ayarla
            </button>
          </div>

          <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-4">
            <Stat label="Toplam Fatura" value={`${invoices.length} Adet`} tone="blue" icon={<Ic n="file" c="h-4 w-4" />} />
            <Stat label="Ödenen" value={`${odendiCount} Adet`} tone="mint" icon={<Ic n="check" c="h-4 w-4" />} />
            <Stat label="Bekleyen" value={`${bekliyorCount} Adet`} tone={dueWall.overdue.length > 0 ? 'red' : 'amber'} icon={<Ic n="clock" c="h-4 w-4" />} />
            <Stat label="Vadesi Geçen" value={`${dueWall.overdue.length} Fatura`} tone="red" icon={<Ic n="alert" c="h-4 w-4" />} sub={dueWall.overdue.length > 0 ? 'Dikkat — ödeme gecikti' : 'Hepsi zamanında'} />
          </div>

          {/* Vade takip duvarı */}
          <section className="mb-4 rounded-xl border border-line bg-panel p-4">
            <h3 className="mb-3 flex items-center gap-2 font-mono text-[12px] font-bold uppercase tracking-widest text-amber2">
              <Ic n="clock" c="h-4 w-4" /> Vade Takip Duvarı
            </h3>
            <div className="grid gap-3 md:grid-cols-4">
              {([
                { key: 'overdue', label: 'Vadesi Geçti', cls: 'border-red/40 bg-red/5 text-red', items: dueWall.overdue },
                { key: 'thisWeek', label: 'Bu Hafta', cls: 'border-[#a855f7]/40 bg-[#a855f7]/5 text-[#c084fc]', items: dueWall.thisWeek },
                { key: 'thisMonth', label: 'Bu Ay', cls: 'border-amber/40 bg-amber/5 text-amber2', items: dueWall.thisMonth },
                { key: 'later', label: 'Daha Sonra', cls: 'border-line bg-ink/30 text-mut', items: dueWall.later },
              ] as const).map((g) => (
                <div key={g.key} className={cn('min-w-0 rounded-xl border p-3', g.cls.split(' ').slice(0, 2).join(' '))}>
                  <div className="mb-2 font-mono text-[11px] font-bold uppercase tracking-widest text-mut">{g.label} ({g.items.length})</div>
                  <div className="space-y-1.5">
                    {g.items.length === 0 ? (
                      <div className="text-[10px] text-mut2">Kayıt yok</div>
                    ) : g.items.map((i) => {
                      const badge = statusBadge(i);
                      return (
                        <div key={i.id} className="rounded-lg border border-line bg-ink/40 p-2">
                          <div className="flex justify-between gap-1">
                            <span className="font-mono text-[10px] font-bold text-amber2">{i.no}</span>
                            <span className="font-mono text-[10px] text-mint tabular-nums">{fmt(i.total)}</span>
                          </div>
                          <div className="mt-0.5 flex justify-between">
                            <span className="text-[9px] text-mut2">{i.supplier}</span>
                            <span className={cn('font-mono text-[8.5px] font-bold', badge.cls.split(' ')[1] ?? 'text-mut')}>
                              {badge.days > 0 ? `${badge.days} gün gecikti` : dstr(i.dueDate ?? '')}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {tab === 'vat' && (
        <>
          {/* ===== KDV / VAT BEYANNAMESİ — Hesaplanan − İndirilecek = Ödenecek ===== */}
          <section className="mb-4 rounded-xl border border-amber/40 bg-panel p-4">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <h3 className="flex items-center gap-2 font-mono text-[12.5px] font-bold uppercase tracking-widest text-amber2">
                <Ic n="percent" c="h-4 w-4" /> {vatName} Beyannamesi — {countryVat.countryName} ({countryVat.vatName})
              </h3>
              <input
                type="month"
                value={vatMonth}
                onChange={(e) => setVatMonth(e.target.value)}
                className="rounded-lg border border-line2 bg-ink/70 px-2.5 py-1.5 font-mono text-[11.5px] text-txt outline-none focus:border-amber/70"
              />
              <div className="ml-auto flex flex-wrap gap-2">
                <Btn v="ghost" className="border-mint/40 text-mint" onClick={exportVatCsv}>
                  <Ic n="download" c="h-4 w-4" /> CSV
                </Btn>
                <Btn v="ghost" className="border-blue/40 text-blue" onClick={() => setVatPrintOpen(true)}>
                  <Ic n="print" c="h-4 w-4" /> Yazdır / PDF
                </Btn>
                <Btn v="mint" onClick={sendVatWhatsApp} title={accountantPhone ? `Muhasebeci: ${accountantPhone}` : 'Muhasebeci numarası tanımlayın'}>
                  <Ic n="phone" c="h-4 w-4" /> WhatsApp ile Gönder
                </Btn>
              </div>
            </div>
            {accountantPhone && (
              <div className="mb-3 flex items-center gap-2 rounded-lg border border-line bg-ink/40 px-3 py-1.5">
                <Ic n="user" c="h-3.5 w-3.5 text-mint" />
                <span className="font-mono text-[10.5px] text-mut2">
                  Muhasebeci: <b className="text-txt">{accountantPhone}</b>
                </span>
                <button
                  onClick={() => {
                    const next = window.prompt('Muhasebeci WhatsApp numarası:', accountantPhone) ?? '';
                    if (next.replace(/\D/g, '').length >= 10) {
                      localStorage.setItem(ACCOUNTANT_PHONE_KEY, next);
                      setAccountantPhone(next);
                      toast('Muhasebeci numarası güncellendi');
                    }
                  }}
                  className="ml-auto rounded border border-line2 px-2 py-0.5 font-mono text-[9.5px] text-mut hover:text-amber2"
                >
                  Değiştir
                </button>
              </div>
            )}

            {/* Formül şeridi */}
            <div className="mb-3 grid gap-2 lg:grid-cols-[1fr_auto_1fr_auto_1.1fr]">
              <div className="rounded-xl border border-mint/40 bg-mint/8 p-3 text-center">
                <div className="font-mono text-[9.5px] uppercase tracking-widest text-mut2">Hesaplanan {vatName} (Satış)</div>
                <div className="mt-1 font-mono text-xl font-bold text-mint tabular-nums">{fmt(vd.outputVat)}</div>
                <div className="mt-0.5 text-[9px] text-mut2">{vd.saleCount} satış · matrah {fmt(vd.outputBase)}</div>
              </div>
              <div className="flex items-center justify-center font-mono text-2xl font-bold text-mut">−</div>
              <div className="rounded-xl border border-amber/40 bg-amber/8 p-3 text-center">
                <div className="font-mono text-[9.5px] uppercase tracking-widest text-mut2">İndirilecek {vatName} (Alış + Masraf)</div>
                <div className="mt-1 font-mono text-xl font-bold text-amber2 tabular-nums">{fmt(vd.inputVat)}</div>
                <div className="mt-0.5 text-[9px] text-mut2">alış {fmt(vd.purchaseVat)} + masraf {fmt(vd.expenseVat)}</div>
              </div>
              <div className="flex items-center justify-center font-mono text-2xl font-bold text-mut">=</div>
              <div className={cn('rounded-xl border p-3 text-center', vd.payable > 0 ? 'border-red/50 bg-red/10' : 'border-blue/50 bg-blue/10')}>
                <div className="font-mono text-[9.5px] uppercase tracking-widest text-mut2">
                  {vd.payable > 0 ? `ÖDENECEK ${vatName.toUpperCase()}` : `DEVREDEN ${vatName.toUpperCase()}`}
                </div>
                <div className={cn('mt-1 font-mono text-2xl font-bold tabular-nums', vd.payable > 0 ? 'text-red' : 'text-blue')}>
                  {fmt(vd.payable > 0 ? vd.payable : vd.carryForward)}
                </div>
                <div className="mt-0.5 text-[9px] text-mut2">
                  {vd.payable > 0 ? 'Vergi dairesine ödenecek' : 'Sonraki döneme devreder'}
                </div>
              </div>
            </div>

            {/* Üç kırılım tablosu */}
            <div className="grid gap-3 lg:grid-cols-3">
              {([
                { title: `1) Hesaplanan ${vatName} — Satışlar`, rows: vd.outputRows, base: vd.outputBase, vat: vd.outputVat, count: `${vd.saleCount} satış fişi`, tone: 'text-mint', border: 'border-mint/30' },
                { title: `2) İndirilecek ${vatName} — Alış Faturaları`, rows: vd.purchaseRows, base: vd.purchaseBase, vat: vd.purchaseVat, count: `${vd.invoiceCount} alış faturası`, tone: 'text-amber2', border: 'border-amber/30' },
                { title: `3) İndirilecek ${vatName} — Masraf Faturaları`, rows: vd.expenseRows, base: vd.expenseBase, vat: vd.expenseVat, count: `${vd.expenseCount} masraf belgesi`, tone: 'text-blue', border: 'border-blue/30' },
              ] as const).map((blk) => (
                <div key={blk.title} className={cn('overflow-hidden rounded-xl border bg-ink/30', blk.border)}>
                  <div className={cn('border-b border-line px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-widest', blk.tone)}>
                    {blk.title}
                  </div>
                  <table className="w-full border-collapse font-mono text-[10.5px]">
                    <thead className="bg-panel2/40">
                      <tr>
                        <th className="px-2.5 py-1.5 text-left text-[9px] uppercase tracking-widest text-mut2">Oran</th>
                        <th className="px-2.5 py-1.5 text-right text-[9px] uppercase tracking-widest text-mut2">Matrah</th>
                        <th className="px-2.5 py-1.5 text-right text-[9px] uppercase tracking-widest text-mut2">KDV</th>
                      </tr>
                    </thead>
                    <tbody>
                      {blk.rows.length === 0 ? (
                        <tr><td colSpan={3} className="py-5 text-center text-[10px] text-mut2">Bu dönemde kayıt yok</td></tr>
                      ) : blk.rows.map((r) => (
                        <tr key={r.rate} className="border-t border-line/50">
                          <td className="px-2.5 py-1.5">
                            <span className="rounded px-1.5 py-0.5 text-[9.5px] font-bold text-[#0a0e13]" style={{ background: vatMeta[r.rate]?.color ?? '#7d8ca0' }}>%{r.rate}</span>
                          </td>
                          <td className="px-2.5 py-1.5 text-right tabular-nums text-txt">{fmt(r.base)}</td>
                          <td className={cn('px-2.5 py-1.5 text-right font-bold tabular-nums', blk.tone)}>{fmt(r.vat)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t-2 border-line2 bg-panel2/50">
                      <tr>
                        <td className="px-2.5 py-2 text-[9px] font-bold uppercase text-mut">TOPLAM</td>
                        <td className="px-2.5 py-2 text-right font-bold tabular-nums text-txt">{fmt(blk.base)}</td>
                        <td className={cn('px-2.5 py-2 text-right font-bold tabular-nums', blk.tone)}>{fmt(blk.vat)}</td>
                      </tr>
                    </tfoot>
                  </table>
                  <div className="border-t border-line px-3 py-1.5 text-[9px] text-mut2">{blk.count}</div>
                </div>
              ))}
            </div>

            {/* Açıklama + örnek */}
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              <div className="rounded-lg border border-line bg-ink/40 p-3 text-[10.5px] leading-relaxed text-mut2">
                <b className="text-mut">Vergi Dairesi Formülü ({countryVat.countryName} · {vatName}):</b><br />
                <span className="font-mono text-mint">Hesaplanan {vatName}</span> (sattığınız malın vergisi) <b className="text-txt">−</b>{' '}
                <span className="font-mono text-amber2">İndirilecek {vatName}</span> (aldığınız mal + masraf faturalarının vergisi) <b className="text-txt">=</b>{' '}
                <span className="font-mono text-red">Ödenecek {vatName}</span>.<br />
                Sonuç negatifse <b className="text-blue">devreden {vatName}</b> olarak sonraki aya aktarılır.
              </div>
              <div className="rounded-lg border border-line bg-ink/40 p-3 font-mono text-[10px] leading-relaxed text-mut2">
                <b className="text-mut">Örnek ({countryVat.countryName} - %{countryVat.defaultRate}):</b><br />
                Alış: 10.000 + %{countryVat.defaultRate} → ödenen {vatName} <span className="text-amber2">{fmt(round2(10000 * countryVat.defaultRate / 100))}</span><br />
                Satış: 15.000 + %{countryVat.defaultRate} → tahsil {vatName} <span className="text-mint">{fmt(round2(15000 * countryVat.defaultRate / 100))}</span><br />
                <span className="text-red">{fmt(round2(15000 * countryVat.defaultRate / 100))} − {fmt(round2(10000 * countryVat.defaultRate / 100))} = {fmt(round2(5000 * countryVat.defaultRate / 100))} ödenecek {vatName}</span><br />
                <span className="text-blue">+ Masraf faturalarının {vatName}'si de indirilir.</span>
              </div>
            </div>
          </section>

          {/* Alış faturası özeti — özet bağlantı */}
          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-panel p-3">
            <Btn v="ghost" className="border-amber/40 text-amber2" onClick={() => setTab('history')}>
              <Ic n="file" c="h-4 w-4" /> Alış Faturası Geçmişine Dön
            </Btn>
            <span className="font-mono text-[10.5px] text-mut2">
              Dönem: <b className="text-txt">{vatMonth}</b> · {vd.invoiceCount} alış faturası · {vd.expenseCount} masraf belgesi · {vd.saleCount} satış
            </span>
          </div>

          {/* Yazdır / PDF önizleme */}
          {vatPrintOpen && (
            <Modal
              title={`${vatName} Beyannamesi — PDF / Yazdırma Önizleme (${vatMonth})`}
              icon={<Ic n="print" c="h-4.5 w-4.5" />}
              onClose={() => setVatPrintOpen(false)}
              w="max-w-3xl"
            >
              <div id="vat-print" className="rounded-xl bg-white p-6 font-sans text-[#101828]">
                <div className="border-b-2 border-[#101828] pb-4">
                  <div className="text-xl font-extrabold tracking-wide">{state.settings.storeName}</div>
                  <div className="mt-1 text-sm font-bold">{vatName} Beyanname Özeti — {countryVat.countryName}</div>
                  <div className="mt-1 text-xs text-[#475467]">
                    Dönem: {new Date(vatMonth + '-01T12:00:00').toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}
                  </div>
                  {state.settings.taxNo && (
                    <div className="text-xs text-[#475467]">VKN / Tax ID: {state.settings.taxNo} · {state.settings.taxOffice}</div>
                  )}
                  <div className="text-xs text-[#667085]">Oluşturulma: {new Date().toLocaleString('tr-TR')}</div>
                </div>

                {([
                  { title: `1) HESAPLANAN ${vatName.toUpperCase()} — SATIŞLAR`, rows: vd.outputRows, base: vd.outputBase, vat: vd.outputVat, count: `${vd.saleCount} satış fişi` },
                  { title: `2) İNDİRİLECEK ${vatName.toUpperCase()} — ALIŞ FATURALARI`, rows: vd.purchaseRows, base: vd.purchaseBase, vat: vd.purchaseVat, count: `${vd.invoiceCount} alış faturası` },
                  { title: `3) İNDİRİLECEK ${vatName.toUpperCase()} — MASRAF FATURALARI`, rows: vd.expenseRows, base: vd.expenseBase, vat: vd.expenseVat, count: `${vd.expenseCount} masraf belgesi` },
                ] as const).map((blk) => (
                  <div key={blk.title} className="mt-4">
                    <div className="mb-1 text-[12px] font-bold">{blk.title}</div>
                    <table className="w-full border-collapse text-[11px]">
                      <thead>
                        <tr className="border-b border-[#d0d5dd] bg-[#f2f4f7]">
                          <th className="px-2 py-1.5 text-left">Oran</th>
                          <th className="px-2 py-1.5 text-right">Matrah</th>
                          <th className="px-2 py-1.5 text-right">{vatName}</th>
                          <th className="px-2 py-1.5 text-right">Toplam</th>
                        </tr>
                      </thead>
                      <tbody>
                        {blk.rows.length === 0 ? (
                          <tr><td colSpan={4} className="px-2 py-2 text-center text-[#667085]">Bu dönemde kayıt yok</td></tr>
                        ) : blk.rows.map((r) => (
                          <tr key={r.rate} className="border-b border-[#e4e7ec]">
                            <td className="px-2 py-1.5 font-bold">%{r.rate}</td>
                            <td className="px-2 py-1.5 text-right">{fmt(r.base)}</td>
                            <td className="px-2 py-1.5 text-right font-bold">{fmt(r.vat)}</td>
                            <td className="px-2 py-1.5 text-right">{fmt(round2(r.base + r.vat))}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-[#101828] bg-[#f9fafb]">
                          <td className="px-2 py-1.5 font-bold">TOPLAM</td>
                          <td className="px-2 py-1.5 text-right font-bold">{fmt(blk.base)}</td>
                          <td className="px-2 py-1.5 text-right font-bold">{fmt(blk.vat)}</td>
                          <td className="px-2 py-1.5 text-right text-[10px] text-[#667085]">{blk.count}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ))}

                <div className="mt-5 rounded-lg border-2 border-[#101828] p-3">
                  <div className="mb-1.5 text-[12px] font-bold">SONUÇ — {countryVat.countryName.toUpperCase()} VERGİ DAİRESİ HESABI</div>
                  <table className="w-full border-collapse text-[12px]">
                    <tbody>
                      <tr className="border-b border-[#e4e7ec]"><td className="py-1">Hesaplanan {vatName} (Satış)</td><td className="py-1 text-right font-bold">{fmt(vd.outputVat)}</td></tr>
                      <tr className="border-b border-[#e4e7ec]"><td className="py-1">İndirilecek {vatName} (Alış)</td><td className="py-1 text-right">− {fmt(vd.purchaseVat)}</td></tr>
                      <tr className="border-b border-[#e4e7ec]"><td className="py-1">İndirilecek {vatName} (Masraf)</td><td className="py-1 text-right">− {fmt(vd.expenseVat)}</td></tr>
                      <tr className="border-b-2 border-[#101828]"><td className="py-1 font-bold">Toplam İndirilecek {vatName}</td><td className="py-1 text-right font-bold">{fmt(vd.inputVat)}</td></tr>
                      <tr>
                        <td className="py-2 text-[14px] font-extrabold">{vd.payable > 0 ? `ÖDENECEK ${vatName.toUpperCase()}` : `DEVREDEN ${vatName.toUpperCase()}`}</td>
                        <td className="py-2 text-right text-[16px] font-extrabold">{fmt(vd.payable > 0 ? vd.payable : vd.carryForward)}</td>
                      </tr>
                    </tbody>
                  </table>
                  <div className="mt-1.5 text-[10px] text-[#667085]">
                    Hesaplanan {vatName} − İndirilecek {vatName} = {vd.payable > 0 ? `Ödenecek ${vatName} (vergi dairesine)` : `Devreden ${vatName} (sonraki döneme aktarılır)`}
                  </div>
                </div>

                <div className="mt-4 border-t border-[#d0d5dd] pt-2 text-[10px] text-[#667085]">
                  MOSBARKODYAZILIM v{APP_VERSION} · Otomatik {vatName} beyanname özeti ({countryVat.countryName}) · Bu belge bilgilendirme amaçlıdır, resmi beyanname yerine geçmez.
                </div>
              </div>

              <div className="mt-3 flex flex-wrap justify-end gap-2">
                <Btn v="ghost" onClick={() => setVatPrintOpen(false)}>Kapat</Btn>
                <Btn v="mint" onClick={sendVatWhatsApp}>
                  <Ic n="phone" c="h-4 w-4" /> WhatsApp ile Gönder
                </Btn>
                <Btn v="primary" onClick={() => window.print()}>
                  <Ic n="print" c="h-4 w-4" /> PDF Olarak Kaydet / Yazdır
                </Btn>
              </div>
            </Modal>
          )}
        </>
      )}

      {tab === 'history' && (
        <>
          {/* Tedarikçi skoru + en pahalı uyarı */}
          <section className="mb-4 rounded-xl border border-line bg-panel p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-mono text-[12px] font-bold uppercase tracking-widest text-amber2">Tedarikçi Skoru & Özet</h3>
              {mostExpensive && (
                <span className="rounded-md border border-red/40 bg-red/10 px-2 py-0.5 font-mono text-[10px] font-bold text-red">
                  En Yüksek Harcama: {mostExpensive.name} ({fmt(mostExpensive.paid)})
                </span>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-[11.5px]">
                <thead><tr className="border-b border-line bg-ink/40"><Th>Tedarikçi</Th><Th className="text-right">Toplam</Th><Th className="text-right">Ödenen</Th><Th className="text-right">Bekleyen</Th><Th className="text-center">Fatura</Th><Th className="text-center">Ortalama Teslim</Th></tr></thead>
                <tbody>{supplierScore.map((s) => (
                  <tr key={s.name} className="border-b border-line/60 hover:bg-panel2/50">
                    <Td className="font-medium">{s.name}</Td>
                    <Td className="text-right font-mono font-bold tabular-nums">{fmt(s.total)}</Td>
                    <Td className="text-right font-mono tabular-nums text-mint">{fmt(s.paid)}</Td>
                    <Td className="text-right font-mono tabular-nums text-red">{fmt(s.pending)}</Td>
                    <Td className="text-center font-mono text-mut2">{s.count}</Td>
                    <Td className="text-center font-mono text-amber2">{s.lead != null ? `${s.lead} gün` : '—'}</Td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </section>

          {/* Geçmiş filtreleri */}
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-panel p-3">
            <div className="relative min-w-[200px] flex-1">
              <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-mut2"><Ic n="search" c="h-4 w-4" /></span>
              <Inp className="pl-8" value={hq} onChange={(e) => setHq(e.target.value)} placeholder="Fatura No / Tedarikçi / ürün kalem ara…" />
            </div>
            <Sel className="w-[180px] flex-none" value={fSupplier} onChange={(e) => setFSupplier(e.target.value)}>
              <option value="">Tüm Tedarikçiler</option>
              {supplierList.map((s) => <option key={s}>{s}</option>)}
            </Sel>
            <Sel className="w-[150px] flex-none" value={fStatus} onChange={(e) => setFStatus(e.target.value as typeof fStatus)}>
              <option value="all">Tüm Durumlar</option>
              <option value="odendi">Ödendi</option>
              <option value="bekliyor">Bekliyor</option>
              <option value="overdue">Vade Geçti</option>
              <option value="dueSoon">Ödeme Yakın</option>
            </Sel>
            <div className="flex items-center gap-1.5 font-mono text-[10.5px] text-mut2">
              <Inp type="date" value={fFrom} onChange={(e) => setFFrom(e.target.value)} className="w-[136px] py-1.5 font-mono text-[11px]" title="Başlangıç" />
              <span>→</span>
              <Inp type="date" value={fTo} onChange={(e) => setFTo(e.target.value)} className="w-[136px] py-1.5 font-mono text-[11px]" title="Bitiş" />
            </div>
          </div>

          <section className="overflow-x-auto rounded-xl border border-line bg-panel">
            <div className="border-b border-line px-4 py-3 font-mono text-[12px] font-bold uppercase tracking-widest text-mut">
              Alış Faturası Geçmiş Kayıtları — {filteredList.length} sonuç
            </div>
            <table className="w-full min-w-[1080px] border-collapse">
              <thead className="border-b border-line bg-panel2/40">
                <tr>
                  <Th>Fatura No</Th><Th>Tarih</Th><Th>Tedarikçi</Th><Th>Ödeme</Th><Th>Vade</Th><Th className="text-right">Matrah</Th><Th className="text-right">KDV</Th><Th className="text-right">Genel Toplam</Th><Th className="text-right">Ödenen</Th><Th>Durum</Th><Th>Foto</Th><Th className="text-center">WA</Th><Th className="text-right">İşlemler</Th>
                </tr>
              </thead>
              <tbody>
                {filteredList.map((i) => {
                  const badge = statusBadge(i);
                  const paidNow = round2((i.payments ?? []).reduce((a, p) => a + p.amount, 0));
                  const remaining = round2(i.total - paidNow);
                  const attachImg = getInvImg(i);
                  return (
                    <tr key={i.id} className={cn('border-b border-line/60 last:border-0 hover:bg-panel2/50', badge.label === 'VADE GEÇTİ' && 'bg-red/5')}>
                      <Td className="font-mono text-[11px] text-txt">
                        {i.no}
                        {i.supplierNo && <div className="text-[9px] text-mut2">Bel: {i.supplierNo}</div>}
                        {i.docType && <div className="text-[8.5px] uppercase text-blue">{i.docType}</div>}
                      </Td>
                      <Td className="font-mono text-[11px] text-mut">{dstr(i.date)}</Td>
                      <Td className="font-medium">
                        {i.supplier}
                        {i.taxNo && <div className="font-mono text-[9px] text-mut2">VKN {i.taxNo}</div>}
                      </Td>
                      <Td>{payBadge(i.payType)}</Td>
                      <Td>{i.dueDate ? <span className={cn('font-mono text-[10px]', badge.label === 'VADE GEÇTİ' ? 'font-bold text-red' : badge.label === 'ÖDEME YAKIN' ? 'font-bold text-[#c084fc]' : 'text-mut')}>{dstr(i.dueDate)}</span> : <span className="text-mut2">—</span>}</Td>
                      <Td className="text-right font-mono text-[11px] tabular-nums text-txt">{fmt(invoiceVatSummary(i).base)}</Td>
                      <Td className="text-right font-mono text-[11px] font-bold tabular-nums text-amber2">
                        {fmt(invoiceVatSummary(i).vat)}
                        <div className="text-[8.5px] font-normal text-mut2">
                          {invoiceVatSummary(i).rows.map((r) => `%${r.rate}`).join(' ')}
                        </div>
                      </Td>
                      <Td className="text-right font-mono font-bold text-mint tabular-nums">{fmt(i.total)}</Td>
                      <Td className="text-right font-mono text-[11px] tabular-nums">{paidNow > 0 ? <span className="text-mint">{fmt(paidNow)}</span> : <span className="text-mut2">—</span>}</Td>
                      <Td>
                        <span className={cn('rounded border px-2 py-0.5 font-mono text-[9.5px] font-bold', badge.cls)}>{badge.label}</span>
                        {badge.days > 0 && <div className="mt-0.5 text-[9px] font-bold text-red">{badge.days} gün gecikti</div>}
                        {i.paidDate && badge.label === 'ÖDENDİ' && <div className="mt-0.5 text-[9px] text-mut2">{dstr(i.paidDate)}</div>}
                      </Td>
                      <Td>
                        {attachImg ? (
                          <button onClick={() => setViewImg(attachImg)} title="Fatura fotoğrafını aç" className="block h-8 w-12 overflow-hidden rounded border border-line2 hover:border-amber/50">
                            <img src={attachImg} alt="" className="h-full w-full object-cover" />
                          </button>
                        ) : <span className="text-mut2">—</span>}
                      </Td>
                      <Td className="text-center">
                        <button
                          onClick={() => negotiateWhatsApp(i)}
                          title={`${supplierPhone[i.supplier] ? 'WhatsApp ile pazarlık: ' + supplierPhone[i.supplier] : 'Telefon tanımla ve WhatsApp ile gönder'}`}
                          className="rounded-md border border-mint/40 bg-mint/10 px-1.5 py-1.5 text-mint hover:bg-mint/20"
                        >
                          <Ic n="phone" c="h-3.5 w-3.5" />
                        </button>
                      </Td>
                      <Td>
                        <div className="flex justify-end gap-1">
                          <button onClick={() => duplicateInvoice(i)} title="Faturayı kopyala (yenile)" className="rounded-md border border-line2 p-1.5 text-mut hover:border-mint/50 hover:text-mint"><Ic n="file" c="h-3.5 w-3.5" /></button>
                          <button onClick={() => setEdit(i)} className="rounded-md border border-line2 p-1.5 text-mut hover:border-amber/50 hover:text-amber2" title="Düzenle"><Ic n="edit" c="h-3.5 w-3.5" /></button>
                          {i.status === 'bekliyor' && remaining > 1e-9 && (
                            <>
                              <button onClick={() => setPayInv(i)} title="Kısmi / tam ödeme" className="rounded-md border border-amber/40 bg-amber/10 px-1.5 py-0.5 font-mono text-[9px] font-bold text-amber2 hover:bg-amber/20">Öde</button>
                              <button onClick={() => markAsPaid(i, 'nakit')} className="rounded-md border border-mint/30 bg-mint/10 px-1.5 py-0.5 font-mono text-[9px] font-bold text-mint hover:bg-mint/20" title="Tam: nakit ile öde">Nakit</button>
                              <button onClick={() => markAsPaid(i, 'pos')} className="rounded-md border border-blue/30 bg-blue/10 px-1.5 py-0.5 font-mono text-[9px] font-bold text-blue hover:bg-blue/20" title="Tam: POS ile öde">POS</button>
                            </>
                          )}
                          <button onClick={() => setDel(i)} className="rounded-md border border-line2 p-1.5 text-mut hover:border-red/50 hover:text-red" title="Sil"><Ic n="trash" c="h-3.5 w-3.5" /></button>
                        </div>
                      </Td>
                    </tr>
                  );
                })}
                {filteredList.length === 0 && <tr><td colSpan={13} className="py-10 text-center font-mono text-[12px] text-mut2">Filtreye uyan alış faturası bulunamadı.</td></tr>}
              </tbody>
              {filteredList.length > 0 && (
                <tfoot className="border-t-2 border-amber/40 bg-amber/5">
                  <tr>
                    <td colSpan={5} className="px-3 py-2.5 font-mono text-[10px] uppercase tracking-widest text-mut2">FİLTRE TOPLAMI — {filteredList.length} fatura</td>
                    <td className="px-3 py-2.5 text-right font-mono font-bold text-txt tabular-nums">{fmt(footerBase)}</td>
                    <td className="px-3 py-2.5 text-right font-mono font-bold text-amber2 tabular-nums">{fmt(footerVat)}</td>
                    <td className="px-3 py-2.5 text-right font-mono font-bold text-mint tabular-nums">{fmt(footerTotal)}</td>
                    <td className="px-3 py-2.5 text-right font-mono font-bold text-mint tabular-nums">{fmt(footerPaid)}</td>
                    <td colSpan={4} className="px-3 py-2.5 font-mono text-[11px] font-bold text-red tabular-nums">Bekleyen: {fmt(footerPending)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </section>
        </>
      )}

      {del && (
        <Confirm title="Faturayı Sil" msg={`${del.no} numaralı, ${del.supplier} tedarikçili ${fmt(del.total)} tutarlı fatura silinecek. (Stok geri alınmaz.)`} label="Sil" onCancel={() => setDel(null)} onOk={() => { remove(del.id); setDel(null); toast('Fatura silindi', 'err'); }} />
      )}

      {payInv && (
        <PayInvoiceModal
          inv={payInv}
          onClose={() => setPayInv(null)}
          onPatch={(id, patch) => update(id, patch)}
          toast={toast}
        />
      )}

      {viewImg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-[2px]" onClick={() => setViewImg(null)}>
          <div className="anim-pop max-h-[92vh] max-w-[92vw] rounded-xl border border-line2 bg-panel p-2">
            <img src={viewImg} alt="Fatura görseli" className="max-h-[85vh] rounded-lg object-contain" />
            <div className="mt-2 text-center font-mono text-[10px] text-mut2">Kapatmak için karanlık alana tıklayın</div>
          </div>
        </div>
      )}

      {edit && (
        <Modal title={`Fatura Düzenle — ${edit.no}`} icon={<Ic n="edit" c="h-4.5 w-4.5" />} onClose={() => setEdit(null)} w="max-w-lg" footer={<><Btn v="ghost" onClick={() => setEdit(null)}>Vazgeç</Btn><Btn v="primary" onClick={() => { update(edit.id, { supplier: edit.supplier, payType: edit.payType, dueDate: edit.dueDate }); setEdit(null); toast('Fatura güncellendi'); }}>Kaydet</Btn></>}>
          <div className="space-y-3">
            <Field label="Tedarikçi"><Inp value={edit.supplier} onChange={(e) => setEdit({ ...edit, supplier: e.target.value })} /></Field>
            <Field label="Ödeme Türü">
              <Sel value={edit.payType} onChange={(e) => setEdit({ ...edit, payType: e.target.value as Invoice['payType'] })}>
                <option value="nakit">Nakit</option><option value="pos">POS</option><option value="veresiye">Veresiye</option>
              </Sel>
            </Field>
            {edit.payType === 'veresiye' && <Field label="Vade Tarihi"><Inp type="date" value={edit.dueDate || ''} onChange={(e) => setEdit({ ...edit, dueDate: e.target.value })} /></Field>}
          </div>
        </Modal>
      )}
    </div>
  );
}

function daysTo(date: string): number {
  const d1 = new Date(todayKey());
  const d2 = new Date(date);
  return Math.floor((d2.getTime() - d1.getTime()) / 86400000);
}

/* ================= VERESİYE TAKİP ================= */

export function CreditScreen({
  customers,
  settings,
  addCustomer,
  addPayment,
  removeClosed,
  toast,
}: {
  customers: Customer[];
  settings: Settings;
  addCustomer: (name: string, phone: string) => string;
  addPayment: (id: string, amount: number, note: string) => void;
  removeClosed: () => number;

  toast: Toast;
}) {
  const sendReminder = (c: Customer) => {
    if (!c.phone) {
      toast('Bu müşteri için telefon kayıtlı değil — önce müşteri kartına telefon ekleyin', 'err');
      return;
    }
    const text = settings.waDebtTemplate.replace('[MUSTERI_ADI]', c.name).replace('[BORC_TUTARI]', fmt(c.balance));
    window.open(waLink(c.phone, text), '_blank');
    toast(`${c.name} için borç hatırlatma mesajı hazırlandı`);
  };

  const [selId, setSelId] = useState(customers[0]?.id ?? '');
  const [payAmt, setPayAmt] = useState('');
  const [payNote, setPayNote] = useState('');
  const [newOpen, setNewOpen] = useState(false);
  const [nName, setNName] = useState('');
  const [nPhone, setNPhone] = useState('');
  const [closedConfirm, setClosedConfirm] = useState(false);

  const sel = customers.find((c) => c.id === selId) ?? customers[0];
  const totalDebt = round2(customers.reduce((s, c) => s + c.balance, 0));
  const collected = round2(customers.reduce((s, c) => s + c.entries.filter((e) => e.type === 'tahsilat').reduce((a, e) => a + e.amount, 0), 0));
  const closedCustomers = customers.filter((c) => round2(c.balance) <= 0);

  const doPay = () => {
    const amt = Number(payAmt.replace(',', '.'));
    if (!sel || !amt || amt <= 0) {
      toast('Geçerli bir tahsilat tutarı girin', 'err');
      return;
    }
    addPayment(sel.id, toTRY(amt), payNote.trim());
    setPayAmt('');
    setPayNote('');
    toast(`${fmt(toTRY(amt))} tahsilat kaydedildi`);
  };

  const doNew = () => {
    if (!nName.trim()) {
      toast('Müşteri adı zorunludur', 'err');
      return;
    }
    const id = addCustomer(nName.trim(), nPhone.trim());
    setSelId(id);
    setNewOpen(false);
    setNName('');
    setNPhone('');
    toast('Yeni müşteri eklendi');
  };

  return (
    <div className="h-full overflow-y-auto">
      <ScreenHead
        title="VERESİYE TAKİP"
        icon="scale"
        desc="Müşteri alacakları ve tahsilatlar"
        actions={
          <div className="flex flex-wrap gap-2">
            <Btn v="primary" onClick={() => setNewOpen(true)}>
              <Ic n="plus" c="h-4 w-4" /> Yeni Müşteri
            </Btn>
            <Btn v="ghost" className="border-red/40 text-red" onClick={() => setClosedConfirm(true)} disabled={closedCustomers.length === 0}>
              <Ic n="trash" c="h-4 w-4" /> Borcu Bitenleri Sil ({closedCustomers.length})
            </Btn>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Toplam Alacak" value={fmt(totalDebt)} tone="red" icon={<Ic n="scale" c="h-4 w-4" />} />
        <Stat label="Müşteri Sayısı" value={String(customers.length)} tone="blue" icon={<Ic n="users" c="h-4 w-4" />} />
        <Stat label="Toplam Tahsilat" value={fmt(collected)} tone="mint" icon={<Ic n="banknote" c="h-4 w-4" />} />
        <Stat label="Borcu Biten Kayıtlar" value={String(closedCustomers.length)} tone="mint" icon={<Ic n="check" c="h-4 w-4" />} sub="silinmeye hazır" />
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-[1fr_400px]">
        <section className="overflow-x-auto rounded-xl border border-line bg-panel">
          <table className="w-full min-w-[480px] border-collapse">
            <thead className="border-b border-line">
              <tr>
                <Th>Müşteri</Th>
                <Th>Telefon</Th>
                <Th className="text-right">Bakiye</Th>
                <Th className="text-right">İşlem</Th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} onClick={() => setSelId(c.id)} className={cn('cursor-pointer border-b border-line/60 transition-colors last:border-0 hover:bg-panel2/60', sel?.id === c.id && 'bg-amber/8')}>
                  <Td>
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full border border-blue/40 font-mono text-[11px] font-bold text-blue">{c.name.slice(0, 1)}</span>
                      <span className="font-semibold">{c.name}</span>
                      {sel?.id === c.id && <Ic n="chevR" c="h-3.5 w-3.5 text-amber2" />}
                    </div>
                  </Td>
                  <Td className="font-mono text-[11.5px] text-mut">{c.phone || '—'}</Td>
                  <Td className={cn('text-right font-mono font-bold tabular-nums', c.balance > 0 ? 'text-red' : 'text-mint')}>{fmt(c.balance)}</Td>
                  <Td>
                    <div className="flex items-center justify-end gap-2">
                      {c.balance > 0 && (
                        <button onClick={() => sendReminder(c)} className="rounded-md border border-mint/40 bg-mint/10 p-1.5 text-mint transition-colors hover:bg-mint/20" title="WhatsApp ile borç hatırlatması gönder">
                          <Ic n="phone" c="h-3.5 w-3.5" />
                        </button>
                      )}
                      <span className="font-mono text-[11.5px] text-mut">{c.entries.length}</span>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {sel ? (
          <section className="flex flex-col rounded-xl border border-line bg-panel">
            <div className="border-b border-line p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-blue/40 font-mono text-sm font-bold text-blue">{sel.name.slice(0, 1)}</span>
                <div>
                  <div className="text-[14px] font-bold">{sel.name}</div>
                  <div className="font-mono text-[11px] text-mut">{sel.phone || 'Telefon kayıtlı değil'}</div>
                </div>
                <div className="ml-auto text-right">
                  <div className="font-mono text-[9px] uppercase tracking-widest text-mut2">Bakiye</div>
                  <div className={cn('font-mono text-lg font-bold tabular-nums', sel.balance > 0 ? 'text-red' : 'text-mint')}>{fmt(sel.balance)}</div>
                </div>
              </div>
            </div>
            <div className="border-b border-line bg-ink/30 p-4">
              <div className="mb-1.5 font-mono text-[10px] uppercase tracking-widest text-mut">Tahsilat Kaydet</div>
              <div className="flex gap-1.5">
                <Inp type="number" placeholder={`Tutar ${activeSymbol()}`} value={payAmt} onChange={(e) => setPayAmt(e.target.value)} />
                <Inp placeholder="Not (ops.)" value={payNote} onChange={(e) => setPayNote(e.target.value)} />
                <Btn v="mint" onClick={doPay} className="flex-none px-3">
                  <Ic n="check" c="h-4 w-4" />
                </Btn>
              </div>
            </div>
            <div className="max-h-[300px] flex-1 space-y-1.5 overflow-y-auto p-3">
              {[...sel.entries].reverse().map((e, i) => (
                <div key={i} className="flex items-center gap-2.5 rounded-lg border border-line bg-panel2/60 px-3 py-2">
                  <span className={cn('rounded-md p-1', e.type === 'satış' ? 'bg-red/10 text-red' : 'bg-mint/10 text-mint')}>
                    <Ic n={e.type === 'satış' ? 'cart' : 'banknote'} c="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[12px] font-semibold capitalize">{e.type}</div>
                    {e.note && <div className="truncate text-[10.5px] text-mut2">{e.note}</div>}
                  </div>
                  <div className="text-right">
                    <div className={cn('font-mono text-[12.5px] font-bold tabular-nums', e.type === 'satış' ? 'text-red' : 'text-mint')}>
                      {e.type === 'satış' ? '+' : '−'}
                      {fmt(e.amount)}
                    </div>
                    <div className="font-mono text-[9.5px] text-mut2">
                      {dstr(e.date)} {tstr(e.date)}
                    </div>
                  </div>
                </div>
              ))}
              {sel.entries.length === 0 && <div className="py-8 text-center font-mono text-[11.5px] text-mut2">İşlem geçmişi yok.</div>}
            </div>
          </section>
        ) : (
          <section className="rounded-xl border border-dashed border-line2 p-8 text-center font-mono text-[12px] text-mut2">Müşteri seçin</section>
        )}
      </div>

      {newOpen && (
        <Modal title="Yeni Müşteri" icon={<Ic n="user" c="h-4.5 w-4.5" />} onClose={() => setNewOpen(false)} w="max-w-sm" footer={<><Btn v="ghost" onClick={() => setNewOpen(false)}>Vazgeç</Btn><Btn v="primary" onClick={doNew}><Ic n="check" c="h-4 w-4" /> Ekle</Btn></>}>
          <div className="space-y-3">
            <Field label="Ad Soyad"><Inp value={nName} onChange={(e) => setNName(e.target.value)} placeholder="Müşteri adı" /></Field>
            <Field label="Telefon"><Inp value={nPhone} onChange={(e) => setNPhone(e.target.value)} placeholder="05xx xxx xx xx" className="font-mono" /></Field>
          </div>
        </Modal>
      )}

      {closedConfirm && typeof removeClosed === 'function' && (
        <Confirm title="Borcu Bitenleri Defterden Sil" msg={`${closedCustomers.length} adet borcu tamamen kapanmış müşteri kaydı veresiye defterinden silinecek. Silinen kayıtlar geçmiş satış ve tahsilat işlemlerini etkilemez. Devam edilsin mi?`} label={`Evet, ${closedCustomers.length} Kaydı Sil`} onCancel={() => setClosedConfirm(false)} onOk={() => { const removed = removeClosed(); setClosedConfirm(false); setSelId(''); toast(`${removed} adet borcu biten veresiye kaydı defterden silindi`, 'err'); }} />
      )}
    </div>
  );
}

/* ================= MASRAF DEFTERİ ================= */

export function ExpenseScreen({
  expenses,
  add,
  remove,
  toast,
}: {
  expenses: Expense[];
  add: (e: Expense) => void;
  remove: (id: string) => void;
  toast: Toast;
}) {
  const { locale } = useLocale();
  const countryVat = useMemo(() => getCountryVatProfile(locale), [locale]);
  const vatRates = countryVat.rates;
  const vatMeta = countryVat.meta;
  const vatName = countryVat.vatName;

  const [date, setDate] = useState(todayKey());
  const [cat, setCat] = useState(EXPENSE_CATS[0].name);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [del, setDel] = useState<Expense | null>(null);
  /* KDV — masraf faturaları indirilecek KDV'ye girer */
  const [exVat, setExVat] = useState(() => countryVat.defaultRate);
  const [exVatIncluded, setExVatIncluded] = useState(true);
  const [exHasInvoice, setExHasInvoice] = useState(true);

  // Ülke/dil değişince varsayılan KDV oranı da yeni ülkenin oranına göre güncellenir.
  useEffect(() => {
    setExVat(countryVat.defaultRate);
  }, [locale, countryVat.defaultRate]);

  const amtNum = Number(amount.replace(',', '.')) || 0;
  const exBase = exHasInvoice && exVat > 0 ? round2(exVatIncluded ? amtNum / (1 + exVat / 100) : amtNum) : amtNum;
  const exVatAmt = exHasInvoice && exVat > 0 ? round2(exVatIncluded ? amtNum - exBase : amtNum * (exVat / 100)) : 0;

  const monthVatTotal = round2(
    expenses
      .filter((e) => e.date.slice(0, 7) === new Date().toISOString().slice(0, 7) && (e.hasInvoice ?? true) && (e.vatRate ?? 0) > 0)
      .reduce((a, e) => {
        const r = e.vatRate ?? 0;
        const incl = e.vatIncluded ?? true;
        const b = incl ? e.amount / (1 + r / 100) : e.amount;
        return a + (incl ? e.amount - b : e.amount * (r / 100));
      }, 0)
  );

  const monthKey = new Date().toISOString().slice(0, 7);
  const monthLabel = new Date().toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
  const monthTotal = expenses.filter((e) => e.date.slice(0, 7) === monthKey).reduce((s, e) => s + e.amount, 0);
  const todayTotal = expenses.filter((e) => e.date === new Date().toISOString()).reduce((s, e) => s + e.amount, 0);

  const byCat = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of expenses) if (e.date.slice(0, 7) === monthKey) m.set(e.category, (m.get(e.category) ?? 0) + e.amount);
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [expenses, monthKey]);
  const maxCat = Math.max(1, ...byCat.map(([, v]) => v));

  const submit = () => {
    const amt = Number(amount.replace(',', '.'));
    if (!amt || amt <= 0) {
      toast('Geçerli bir tutar girin', 'err');
      return;
    }
    add({
      id: uid(),
      date: new Date(date + 'T12:00:00').toISOString(),
      category: cat,
      amount: toTRY(amt),
      note: note.trim(),
      vatRate: exHasInvoice ? exVat : 0,
      vatIncluded: exVatIncluded,
      hasInvoice: exHasInvoice,
    });
    setAmount('');
    setNote('');
    toast(exHasInvoice && exVat > 0 ? `Masraf kaydedildi — indirilecek ${vatName}: ${fmt(toTRY(exVatAmt))}` : `Masraf kaydedildi (${vatName} indirimi yok)`);
  };

  return (
    <div className="h-full overflow-y-auto">
      <ScreenHead title="MASRAF DEFTERİ" icon="folder" desc="İşletme giderleri ve aylık özet" />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={`Aylık Masraf (${monthLabel})`} value={fmt(monthTotal)} tone="amber" icon={<Ic n="banknote" c="h-4 w-4" />} />
        <Stat label="Bugün" value={fmt(todayTotal)} icon={<Ic n="clock" c="h-4 w-4" />} />
        <Stat label="Toplam Kayıt" value={String(expenses.length)} icon={<Ic n="file" c="h-4 w-4" />} />
        <Stat
          label="Aylık İndirilecek KDV"
          value={fmt(monthVatTotal)}
          tone="blue"
          icon={<Ic n="percent" c="h-4 w-4" />}
          sub="masraf faturalarından"
        />
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-[400px_1fr]">
        <div className="space-y-3">
          <section className="rounded-xl border border-line bg-panel p-4">
            <h3 className="mb-3 flex items-center gap-2 font-mono text-[12px] font-bold uppercase tracking-widest text-amber2">
              <Ic n="plus" c="h-4 w-4" /> Yeni Masraf
            </h3>
            <div className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <Field label="Tarih">
                  <Inp type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </Field>
                <Field label="Kategori">
                  <Sel value={cat} onChange={(e) => setCat(e.target.value)}>
                    {EXPENSE_CATS.map((c) => (
                      <option key={c.name}>{c.name}</option>
                    ))}
                  </Sel>
                </Field>
              </div>
              <Field label="Tutar (₺)">
                <Inp type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" />
              </Field>
              <Field label="Açıklama">
                <Inp value={note} onChange={(e) => setNote(e.target.value)} placeholder="Kısa açıklama" />
              </Field>

              {/* KDV — masraf faturaları indirilecek KDV'ye girer */}
              <div className="rounded-lg border border-blue/30 bg-blue/5 p-2.5">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-widest text-blue">
                    <Ic n="percent" c="h-3.5 w-3.5" /> Masraf KDV'si
                  </span>
                  <label className="flex cursor-pointer items-center gap-1.5 text-[10px] text-mut">
                    <button
                      role="checkbox"
                      aria-checked={exHasInvoice}
                      onClick={() => setExHasInvoice(!exHasInvoice)}
                      className={cn('flex h-4 w-4 items-center justify-center rounded border transition-colors', exHasInvoice ? 'border-blue bg-blue text-[#04121f]' : 'border-line2 bg-ink')}
                    >
                      {exHasInvoice && <Ic n="check" c="h-3 w-3" />}
                    </button>
                    Faturalı (KDV indirilebilir)
                  </label>
                </div>

                {exHasInvoice && (
                  <>
                    <div className="mb-2 flex gap-1">
                      {vatRates.map((r) => (
                        <button
                          key={r}
                          onClick={() => setExVat(r)}
                          title={vatMeta[r]?.desc ?? `${r}%`}
                          className={cn(
                            'flex-1 rounded border py-1.5 font-mono text-[10px] font-bold transition-colors',
                            exVat === r ? 'border-transparent text-[#0a0e13]' : 'border-line2 bg-ink/40 text-mut hover:text-txt'
                          )}
                          style={exVat === r ? { background: vatMeta[r]?.color ?? '#f59e0b' } : undefined}
                        >
                          %{r}
                        </button>
                      ))}
                    </div>
                    <div className="mb-2 grid grid-cols-2 gap-1.5">
                      {([
                        { v: true, label: 'KDV DAHİL' },
                        { v: false, label: 'KDV HARİÇ' },
                      ]).map((o) => (
                        <button
                          key={String(o.v)}
                          onClick={() => setExVatIncluded(o.v)}
                          className={cn('rounded-md border py-1.5 font-mono text-[10px] font-bold transition-colors', exVatIncluded === o.v ? 'border-blue bg-blue/15 text-blue' : 'border-line2 bg-ink/40 text-mut hover:text-txt')}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                    {amtNum > 0 && (
                      <div className="flex justify-between rounded-md border border-line bg-ink/50 px-2.5 py-1.5 font-mono text-[10px]">
                        <span className="text-mut2">Matrah: <b className="text-txt">{fmt(toTRY(exBase))}</b></span>
                        <span className="text-mut2">İnd. KDV: <b className="text-blue">{fmt(toTRY(exVatAmt))}</b></span>
                      </div>
                    )}
                  </>
                )}
                {!exHasInvoice && (
                  <p className="text-[9.5px] leading-relaxed text-mut2">
                    Belgesiz masrafın KDV'si indirilemez; tutarın tamamı gider yazılır.
                  </p>
                )}
              </div>

              <Btn v="primary" className="w-full" onClick={submit}>
                <Ic n="check" c="h-4 w-4" /> Kaydet
              </Btn>
            </div>
          </section>

          <section className="rounded-xl border border-line bg-panel p-4">
            <h3 className="mb-3 font-mono text-[12px] font-bold uppercase tracking-widest text-mut">
              Aylık Kategori Dağılımı
            </h3>
            <div className="space-y-2.5">
              {byCat.map(([name, val]) => {
                const c = EXPENSE_CATS.find((x) => x.name === name);
                return (
                  <div key={name}>
                    <div className="mb-1 flex justify-between text-[11px]">
                      <span className="flex items-center gap-1.5 text-mut">
                        <span className="h-2 w-2 rounded-full" style={{ background: c?.color ?? '#888' }} />
                        {name}
                      </span>
                      <span className="font-mono font-bold tabular-nums">{fmt(val)}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-ink">
                      <div className="h-full rounded-full transition-all" style={{ width: `${(val / maxCat) * 100}%`, background: c?.color ?? '#888' }} />
                    </div>
                  </div>
                );
              })}
              {byCat.length === 0 && <div className="py-4 text-center font-mono text-[11px] text-mut2">Bu ay kayıt yok.</div>}
            </div>
          </section>
        </div>

        <section className="overflow-x-auto rounded-xl border border-line bg-panel">
          <table className="w-full min-w-[520px] border-collapse">
            <thead className="border-b border-line">
              <tr>
                <Th>Tarih</Th>
                <Th>Kategori</Th>
                <Th>Açıklama</Th>
                <Th className="text-right">Matrah</Th>
                <Th className="text-right">KDV</Th>
                <Th className="text-right">Tutar</Th>
                <Th className="text-right" />
              </tr>
            </thead>
            <tbody>
              {[...expenses].sort((a, b) => b.date.localeCompare(a.date)).map((e) => {
                const c = EXPENSE_CATS.find((x) => x.name === e.category);
                return (
                  <tr key={e.id} className="border-b border-line/60 last:border-0 hover:bg-panel2/50">
                    <Td className="font-mono text-[11.5px] text-mut">{dstr(e.date)}</Td>
                    <Td>
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full" style={{ background: c?.color ?? '#888' }} />
                        {e.category}
                      </span>
                    </Td>
                    <Td className="max-w-[220px] truncate text-mut">{e.note || '—'}</Td>
                    {(() => {
                      const r = e.vatRate ?? 0;
                      const hasInv = e.hasInvoice ?? true;
                      const incl = e.vatIncluded ?? true;
                      const b = hasInv && r > 0 ? round2(incl ? e.amount / (1 + r / 100) : e.amount) : e.amount;
                      const v = hasInv && r > 0 ? round2(incl ? e.amount - b : e.amount * (r / 100)) : 0;
                      return (
                        <>
                          <Td className="text-right font-mono text-[11px] tabular-nums text-mut">{fmt(b)}</Td>
                          <Td className="text-right font-mono text-[11px] tabular-nums">
                            {v > 0 ? (
                              <span className="text-blue">
                                {fmt(v)}
                                <span className="ml-1 rounded px-1 text-[8.5px] font-bold text-[#0a0e13]" style={{ background: vatMeta[r]?.color ?? '#7d8ca0' }}>%{r}</span>
                              </span>
                            ) : (
                              <span className="text-mut2">—</span>
                            )}
                          </Td>
                        </>
                      );
                    })()}
                    <Td className="text-right font-mono font-bold tabular-nums text-red">-{fmt(e.amount)}</Td>
                    <Td>
                      <div className="flex justify-end">
                        <button onClick={() => setDel(e)} className="rounded-md border border-line2 p-1.5 text-mut hover:border-red/50 hover:text-red" title="Sil">
                          <Ic n="trash" c="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </Td>
                  </tr>
                );
              })}
              {expenses.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-10 text-center font-mono text-[12px] text-mut2">Kayıt yok.</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </div>

      {del && (
        <Confirm title="Masrafı Sil" msg={`${dstr(del.date)} — ${del.category}: ${fmt(del.amount)} kaydı silinecek.`} label="Sil" onCancel={() => setDel(null)} onOk={() => { remove(del.id); setDel(null); toast('Kayıt silindi', 'err'); }} />
      )}
    </div>
  );
}
