import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import * as XLSX from 'xlsx';
import { cn } from '../utils/cn';
import { Ic } from '../icons';
import { Badge, Btn, Confirm, Field, Inp, Modal, Sel, Td, Th } from '../components/ui';
import CameraScanner from '../components/CameraScanner';
import LabelStudioModal from '../components/LabelStudioModal';
import StockImportModal from '../components/StockImportModal';
import Barcode from '../components/Barcode';
import { CATEGORIES, dstr, fmt, fmtN, fromTRY, toTRY, tstr, uid, type Product, type Sale, type Settings, type StockCountSession } from '../data';
import { fetchProductByBarcode, generateEan13, searchProductsByName, type AiProductMeta } from '../lib/productAi';
import { fileToDataUrl } from '../lib/image';
import { analyzeStock, ABC_META, type AbcClass } from '../lib/stockIntel';
import { buildCountEntries, summarizeCount, type StockCountSummary } from '../lib/stockCount';
import { SEED_IMAGES, resolveProductImage } from '../lib/seedImages';

type Toast = (msg: string, type?: 'ok' | 'err') => void;

/* Yerel Hızlı Görüntü Şablonları — görseller uygulamanın içine gömülüdür,
   internet olmadan da (Play Store / telefon sürümü dahil) görünür. */
const PRESETS = {
  beer: SEED_IMAGES.biraKutu,
  liquor: SEED_IMAGES.rakiBuyuk,
  tobacco: SEED_IMAGES.sigara,
  soda: SEED_IMAGES.kola,
  chips: SEED_IMAGES.cips,
  /* ekmek/manav görseli bir sonraki sürümde gömülecek — şablon yanlış fotoğraf göstermesin */
  bread: 'https://images.pexels.com/photos/32651589/pexels-photo-32651589.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=400&w=640',
};

/* Yerel Barkod Veritabanı (Open Food Facts çalışmazsa veya offline iken fallback) */
const LOCAL_BARCODES: Record<string, { name: string; brand: string; gram: string; cat: string; img: string }> = {
  '8691041001111': { name: 'Tuborg Gold Kütü 50cl', brand: 'Tuborg', gram: '50cl', cat: 'Bira', img: PRESETS.beer },
  '8691041002222': { name: 'Efes Malt Şişe 50cl', brand: 'Efes', gram: '50cl', cat: 'Bira', img: PRESETS.beer },
  '8691041011111': { name: 'Coca-Cola 33cl', brand: 'Coca-Cola', gram: '33cl', cat: 'Meşrubat', img: PRESETS.soda },
  '8691041013131': { name: 'Cips Büyük Boy', brand: 'Lays', gram: '150g', cat: 'Atıştırmalık', img: PRESETS.chips },
};

function Thumb({ p, dot, big }: { p: Product; dot: string; big?: boolean }) {
  const [fail, setFail] = useState(false);
  const sz = big ? 'h-12 w-12' : 'h-9 w-14';
  const src = resolveProductImage(p.image);
  if (!src || fail) {
    return (
      <div
        className={cn('flex shrink-0 items-center justify-center rounded-md', sz)}
        style={{ background: `linear-gradient(135deg, ${dot}26, #141b24)` }}
      >
        <span className="font-mono text-[11px] font-bold" style={{ color: dot }}>
          {p.name.slice(0, 2).toUpperCase()}
        </span>
      </div>
    );
  }
  return <img src={src} alt="" loading="lazy" onError={() => setFail(true)} className={cn('shrink-0 rounded-md object-cover', sz)} />;
}

const emptyForm = (s: Settings) => ({
  id: '',
  name: '',
  brand: '',
  gram: '',
  barcode: '',
  customCode: '',
  category: CATEGORIES[0].name,
  unit: 'adet',
  stock: '0',
  cost: '',
  p1: '',
  p2: '',
  p3: '',
  installment: '',
  expiry: '',
  critical: String(s.criticalDefault),
  image: '',
  supplier: 'Tedarikçi Yok / Standart',
  quickAccess: false,
  isWeight: false,
});
type Form = ReturnType<typeof emptyForm>;

const isExpired = (p: Product) => Boolean(p.expiry && new Date(p.expiry) < new Date());

export default function Products({
  products,
  sales,
  settings,
  isAdmin = true,
  save,
  remove,
  bulkUpdate,
  stockCounts,
  onApplyCount,
  toast,
  proLocked = false,
  onRequirePro,
}: {
  products: Product[];
  sales: Sale[];
  settings: Settings;
  isAdmin?: boolean;
  save: (p: Product) => void;
  remove: (id: string) => void;
  bulkUpdate: (list: Product[]) => void;
  stockCounts: StockCountSession[];
  onApplyCount: (counts: Record<string, string>) => void;
  toast: Toast;
  proLocked?: boolean;
  onRequirePro?: () => void;
}) {
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState('Tüm Kategoriler');
  const [tab, setTab] = useState<'all' | 'critical' | 'skt'>('all');
  const [form, setForm] = useState<Form | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [del, setDel] = useState<Product | null>(null);
  const [countOpen, setCountOpen] = useState(false);
  const [zamOpen, setZamOpen] = useState(false);
  const [labelStudioOpen, setLabelStudioOpen] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [nameFetching, setNameFetching] = useState(false);
  const [aiResults, setAiResults] = useState<AiProductMeta[]>([]);
  const [aiSearchOpen, setAiSearchOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [intelOpen, setIntelOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [intelWindow, setIntelWindow] = useState<7 | 30 | 90>(30);
  const imgFileRef = useRef<HTMLInputElement>(null);
  const imgCamRef = useRef<HTMLInputElement>(null);

  const list = useMemo(
    () =>
      products.filter((p) => {
        if (cat !== 'Tüm Kategoriler' && p.category !== cat) return false;
        if (tab === 'critical' && !(p.stock <= p.critical)) return false;
        if (tab === 'skt' && !isExpired(p)) return false;
        const q = query.trim().toLowerCase();
        if (q && !p.name.toLowerCase().includes(q) && !p.barcode.includes(q) && !(p.brand ?? '').toLowerCase().includes(q))
          return false;
        return true;
      }),
    [products, query, cat, tab]
  );

  const critCount = products.filter((p) => p.stock <= p.critical).length;
  const sktCount = products.filter(isExpired).length;
  const invCost = products.reduce((s, p) => s + Math.max(0, p.stock) * (p.cost || 0), 0);
  const invSale = products.reduce((s, p) => s + Math.max(0, p.stock) * p.p1, 0);
  const totalUnits = products.reduce((s, p) => s + (p.unit === 'adet' || p.unit === 'paket' || p.unit === 'kutu' ? Math.max(0, p.stock) : 0), 0);
  const totalKg = products.reduce((s, p) => s + (p.unit === 'kg' || p.unit === 'lt' ? Math.max(0, p.stock) : 0), 0);

  const submit = () => {
    if (!form) return;
    const p1 = Number(form.p1);
    if (!form.name.trim() || !p1 || p1 <= 0) {
      toast('Ürün adı ve geçerli Satış Fiyatı (F1) zorunludur', 'err');
      return;
    }
    save({
      id: form.id || 'p' + uid(),
      name: form.name.trim(),
      brand: form.brand.trim() || undefined,
      gram: form.gram.trim() || undefined,
      barcode: form.barcode.trim(),
      category: form.category,
      unit: form.isWeight ? 'kg' : form.unit,
      stock: Number(form.stock) || 0,
      cost: toTRY(Number(form.cost) || 0),
      p1: toTRY(p1),
      p2: toTRY(Number(form.p2) || 0),
      p3: toTRY(Number(form.p3) || 0),
      installment: toTRY(Number(form.installment)) > 0 ? toTRY(Number(form.installment)) : undefined,
      expiry: form.expiry || undefined,
      critical: Number(form.critical) || 0,
      image: form.image.trim() || undefined,
      supplier: form.supplier === 'Tedarikçi Yok / Standart' ? undefined : form.supplier,
      quick: form.quickAccess,
      weighed: form.isWeight,
    });
    toast(isNew ? 'Ürün eklendi' : 'Ürün güncellendi');
    setForm(null);
  };

  const openEdit = (p: Product) => {
    setForm({
      id: p.id,
      name: p.name,
      brand: p.brand ?? '',
      gram: p.gram ?? '',
      barcode: p.barcode,
      customCode: '',
      category: p.category,
      unit: p.unit,
      stock: String(p.stock),
      cost: String(fromTRY(p.cost || 0)),
      p1: String(fromTRY(p.p1)),
      p2: String(fromTRY(p.p2)),
      p3: String(fromTRY(p.p3)),
      installment: p.installment ? String(fromTRY(p.installment)) : '',
      expiry: p.expiry ?? '',
      critical: String(p.critical),
      image: p.image ?? '',
      supplier: p.supplier ?? 'Tedarikçi Yok / Standart',
      quickAccess: !!p.quick,
      isWeight: !!p.weighed || p.unit === 'kg' || p.unit === 'lt',
    });
    setIsNew(false);
  };

  /* ================= AKTARIM MOTORU (XLSX + CSV, Türkçe Excel uyumlu) ================= */

  const CSV_HEAD = ['Barkod', 'Ürün Adı', 'Marka', 'Gramaj', 'Kategori', 'Birim', 'Stok', 'Alış', 'F1', 'F2', 'F3', 'Kritik', 'SKT'] as const;

  const toAoa = () =>
    products.map((p) => [
      p.barcode,
      p.name,
      p.brand ?? '',
      p.gram ?? '',
      p.category,
      p.unit,
      p.stock,
      p.cost || 0,
      p.p1,
      p.p2,
      p.p3,
      p.critical,
      p.expiry ?? '',
    ]);

  const stamp = () => new Date().toISOString().slice(0, 10);

  /* Excel (.xlsx) dışa aktar — gerçek Excel dosyası */
  const exportXlsx = () => {
    try {
      const ws = XLSX.utils.aoa_to_sheet([CSV_HEAD as unknown as string[], ...toAoa()]);
      ws['!cols'] = CSV_HEAD.map(() => ({ wch: 18 }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Urunler');
      XLSX.writeFile(wb, `mosbarkod-urunler-${stamp()}.xlsx`);
      toast(`${products.length} ürün Excel (.xlsx) olarak dışa aktarıldı`);
    } catch {
      toast('Excel dosyası oluşturulamadı', 'err');
    }
  };




  /* ----- Yapay Zekâ Meta Veri Sihirbazı (barkod / isim → barkod + bilgi + görsel) ----- */

  const applyMeta = (m: AiProductMeta) => {
    setForm((f) =>
      f
        ? {
            ...f,
            name: m.name || f.name,
            brand: m.brand || f.brand,
            gram: m.gram || f.gram,
            barcode: m.barcode || f.barcode,
            category: m.category ?? f.category,
            image: m.image || f.image,
          }
        : f
    );
  };

  /* Barkod ile otomatik doldur */
  const fetchMetadata = async () => {
    if (!form || !form.barcode.trim()) {
      toast('Önce barkod alanını doldurun veya "Barkod Üret" butonunu kullanın', 'err');
      return;
    }
    const bc = form.barcode.trim();
    setFetching(true);

    // 1. Yerel veritabanı kontrolü
    if (LOCAL_BARCODES[bc]) {
      const match = LOCAL_BARCODES[bc];
      applyMeta({
        barcode: bc,
        name: match.name,
        brand: match.brand,
        gram: match.gram,
        category: match.cat,
        image: match.img,
        source: 'local',
      });
      setFetching(false);
      toast('Ürün bilgileri yerel katalogdan getirildi');
      return;
    }

    // 2. Open Food Facts canlı sorgu
    try {
      const meta = await fetchProductByBarcode(bc);
      if (meta) {
        applyMeta(meta);
        toast('Ürünün barkodu, bilgileri ve görseli Open Food Facts küresel veri tabanından çekildi!');
      } else {
        toast('Sorgulanan barkod küresel veri tabanında bulunamadı. Lütfen manuel doldurun.', 'err');
      }
    } catch {
      toast('Küresel veri tabanı sorgulanamadı (ağ hatası)', 'err');
    }
    setFetching(false);
  };

  /* İsim ile otomatik doldur (AI simgesi) */
  const fetchByName = async () => {
    if (!form || !form.name.trim()) {
      toast('Önce ürün adını yazın, ardından AI simgesine basın', 'err');
      return;
    }
    setNameFetching(true);
    try {
      const results = await searchProductsByName(form.name.trim());
      if (!results.length) {
        toast('Bu isimle ürün bulunamadı. Barkod ile deneyebilir veya manuel doldurabilirsiniz.', 'err');
        return;
      }
      setAiResults(results);
      setAiSearchOpen(true);
      applyMeta(results[0]);
      toast(`Yapay zekâ ${results.length} ürün buldu — en iyi eşleşme forma uygulandı, diğerleri listede`);
    } catch {
      toast('Ürün veri tabanına ulaşılamadı (ağ hatası)', 'err');
    } finally {
      setNameFetching(false);
    }
  };

  /* ----- Fiyat Otomatik Sihirbazı (Alış / F1 girilince diğerlerini kâr oranlarına göre doldurur) ----- */
  const autoCalcPrices = () => {
    if (!form) return;
    const f1 = Number(form.p1) || 0;
    const cost = Number(form.cost) || 0;
    if (f1 > 0) {
      setForm((f) => f && {
        ...f,
        p2: String(Math.round(f1 * 0.95 * 100) / 100),
        p3: String(Math.round(f1 * 1.05 * 100) / 100),
      });
      toast('F2 ve F3 fiyatları F1 baz alınarak otomatik hesaplandı (%5 indirim / %5 zam)');
    } else if (cost > 0) {
      setForm((f) => f && {
        ...f,
        p1: String(Math.round(cost * 1.4 * 100) / 100),
        p2: String(Math.round(cost * 1.35 * 100) / 100),
        p3: String(Math.round(cost * 1.45 * 100) / 100),
      });
      toast('Satış fiyatları alış maliyeti baz alınarak otomatik hesaplandı (%40 kâr)');
    } else {
      toast('Hesaplama için önce Satış Fiyatı (F1) veya Alış Maliyeti girin', 'err');
    }
  };

  /* ----- Yerel görsel yükleme / çekme (sıkıştırılmış dataURL) ----- */
  const onPickImage = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try {
      const dataUrl = await fileToDataUrl(f, 512, 0.72);
      setForm((prev) => (prev ? { ...prev, image: dataUrl } : prev));
      toast('Ürün görseli sıkıştırılıp cihaza kaydedildi (internet gerekmez)');
    } catch {
      toast('Görsel okunamadı — farklı bir dosya deneyin', 'err');
    }
  };

  /* ----- Stok zekâsı ----- */
  const intel = useMemo(() => analyzeStock(products, sales, intelWindow), [products, sales, intelWindow]);
  const topSellers = intel.rows.filter((r) => r.moving).slice(0, 5);
  const slowMovers = intel.rows.filter((r) => !r.moving && r.product.stock > 0).slice(0, 8);
  const abcCounts = (['A', 'B', 'C'] as AbcClass[]).map((c) => ({
    cls: c,
    count: intel.rows.filter((r) => r.cls === c).length,
    revenue: intel.rows.filter((r) => r.cls === c).reduce((s, r) => s + r.revenue, 0),
  }));

  return (
    <div className="h-full overflow-y-auto">
      {/* başlık + butonlar */}
      <div className="mb-4 flex flex-wrap items-start gap-3">
        <div className="flex items-start gap-2.5">
          <div className="rounded-lg border border-amber/40 bg-amber/10 p-2 text-amber">
            <Ic n="box" c="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-mono text-[16px] font-bold tracking-wide">Ürün & Stok Yönetim Paneli</h2>
            <p className="max-w-[520px] text-[11.5px] leading-relaxed text-mut2">
              Ürün kartları tanımlayabilir, barkoda göre küresel veri tabanından meta verileri çekebilir, Excel ile
              toplu işlem yapabilirsiniz.
            </p>
          </div>
        </div>
        {isAdmin && (
        <div className="ml-auto grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <Btn
            v="ghost"
            onClick={() => (proLocked ? onRequirePro?.() : setLabelStudioOpen(true))}
            className="border-amber/40 bg-amber/10 text-amber2 hover:bg-amber/20"
            title={proLocked ? 'PRO — Raf Etiketleri ve Barkod Basım Stüdyosu' : 'Raf Etiketleri ve Barkod Basım Stüdyosu'}
          >
            <Ic n="print" c="h-4 w-4" /> Raf Etiketi & Barkod{proLocked && <Ic n="lock" c="h-3 w-3" />}
          </Btn>
          <Btn v="ghost" onClick={exportXlsx} title="Gerçek .xlsx dosyası indirir">
            <Ic n="download" c="h-4 w-4" /> Excel Dışarı Aktar
          </Btn>
          <Btn v="ghost" onClick={() => (proLocked ? onRequirePro?.() : setImportOpen(true))} title={proLocked ? 'PRO — Excel ile toplu ürün içe aktarma' : 'Desteklenenler: .xlsx, .xls, .csv, .txt — farklı program formatlarını eşler'}>
            <Ic n="file" c="h-4 w-4" /> Excel İçe Aktar{proLocked && <Ic n="lock" c="h-3 w-3" />}
          </Btn>
          <Btn v="ghost" onClick={() => setCountOpen(true)}>
            <Ic n="reset" c="h-4 w-4" /> Stok Sayımı Yap
          </Btn>
          <Btn
            v="ghost"
            onClick={() => (proLocked ? onRequirePro?.() : setIntelOpen(true))}
            className="border-mint/40 bg-mint/5 text-mint hover:bg-mint/10"
            title={proLocked ? 'PRO — Stok Zekâsı (ABC analizi)' : 'ABC analizi, satış hızı ve stok ömrü kestirimi'}
          >
            <Ic n="sparkles" c="h-4 w-4" /> Stok Zekâsı{proLocked && <Ic n="lock" c="h-3 w-3" />}
          </Btn>
          <Btn v="ghost" onClick={() => setZamOpen(true)}>
            <Ic n="trend" c="h-4 w-4" /> Kategoriye Zam Yap
          </Btn>
          <Btn
            v="primary"
            onClick={() => {
              setForm(emptyForm(settings));
              setIsNew(true);
            }}
          >
            <Ic n="plus" c="h-4 w-4" /> Yeni Ürün Ekle
          </Btn>
        </div>
        )}
      </div>



      {/* stat kartları */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Toplam Ürün Kartı', val: String(products.length), sub: `${fmtN(totalUnits)} adet · ${fmtN(totalKg)} kg/lt`, icon: 'box', tone: 'text-txt', bd: 'border-line' },
          { label: 'Kritik Stok Seviyesi', val: String(critCount), sub: 'eşik altında ürün', icon: 'alert', tone: 'text-amber2', bd: 'border-amber/25' },
          { label: 'SKT Geçen Ürünler', val: String(sktCount), sub: 'son kullanma geçmiş', icon: 'clock', tone: sktCount ? 'text-red' : 'text-mint', bd: sktCount ? 'border-red/25' : 'border-line' },
          { label: 'Envanter Maliyet Değeri', val: fmt(invCost), sub: `tahmini satış: ${fmt(invSale)}`, icon: 'banknote', tone: 'text-mint', bd: 'border-mint/25' },
        ].map((s) => (
          <div key={s.label} className={cn('flex items-start justify-between rounded-xl border bg-panel p-3.5', s.bd)}>
            <div className="min-w-0">
              <div className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-mut2">{s.label}</div>
              <div className={cn('mt-1 font-mono text-xl font-bold leading-none tabular-nums', s.tone)}>{s.val}</div>
              <div className="mt-1.5 truncate text-[10px] text-mut2">{s.sub}</div>
            </div>
            <div className={cn('rounded-lg border border-line2 bg-panel3 p-2', s.tone)}>
              <Ic n={s.icon} c="h-4 w-4" />
            </div>
          </div>
        ))}
      </div>

      {/* filtreler */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[240px] flex-1">
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-mut2">
            <Ic n="search" c="h-4 w-4" />
          </span>
          <Inp className="pl-8" placeholder="Ürün adı, barkod veya marka ara…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <Sel className="w-48 flex-none" value={cat} onChange={(e) => setCat(e.target.value)}>
          <option>Tüm Kategoriler</option>
          {CATEGORIES.map((c) => (
            <option key={c.name}>{c.name}</option>
          ))}
        </Sel>
        <div className="flex flex-none gap-1 rounded-lg border border-line2 bg-ink/50 p-1">
          {(
            [
              { id: 'all', label: 'Tümü' },
              { id: 'critical', label: 'Kritik Stoklar' },
              { id: 'skt', label: 'SKT Geçenler' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'rounded-md px-3 py-1.5 text-[11.5px] font-semibold transition-colors',
                tab === t.id ? 'bg-amber text-[#1a1102]' : 'text-mut hover:text-txt'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* tablo */}
      <div className="mt-3 overflow-x-auto rounded-xl border border-line bg-panel">
        <table className="w-full min-w-[880px] border-collapse">
          <thead className="border-b border-line">
            <tr>
              <Th>Görsel</Th>
              <Th>Ürün Bilgisi</Th>
              <Th>Kategori</Th>
              <Th>Barkod / Özel Kod</Th>
              {isAdmin && <Th className="text-right">Alış Fiyatı</Th>}
              <Th className="text-right">Satış Fiyatı (F1)</Th>
              <Th className="text-right">Stok Miktarı</Th>
              <Th>SKT</Th>
              <Th className="text-right">İşlemler</Th>
            </tr>
          </thead>
          <tbody>
            {list.map((p) => {
              const c = CATEGORIES.find((x) => x.name === p.category);
              const crit = p.stock <= p.critical;
              const neg = p.stock < 0;
              const exp = isExpired(p);
              return (
                <tr key={p.id} className="border-b border-line/60 transition-colors last:border-0 hover:bg-panel2/50">
                  <Td>
                    <Thumb p={p} dot={c?.dot ?? '#888'} big />
                  </Td>
                  <Td>
                    <div className="font-semibold leading-tight">{p.name}</div>
                    <div className="mt-0.5 flex items-center gap-2 text-[10px] text-mut2">
                      {p.brand && <span>Marka: {p.brand}</span>}
                      {p.gram && <span>Gramaj: {p.gram}</span>}
                    </div>
                  </Td>
                  <Td>
                    <span
                      className={cn('inline-block rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-semibold', c?.chip)}
                    >
                      {p.category}
                    </span>
                  </Td>
                  <Td className="font-mono text-[11px] text-mut">{p.barcode || '—'}</Td>
                  {isAdmin && <Td className="text-right font-mono tabular-nums text-mut">{fmt(p.cost || 0)}</Td>}
                  <Td className="text-right font-mono font-bold tabular-nums text-mint">{fmt(p.p1)}</Td>
                  <Td className="text-right">
                    <span
                      className={cn(
                        'font-mono font-bold tabular-nums',
                        neg ? 'text-red' : crit ? 'text-amber2' : 'text-txt'
                      )}
                    >
                      {fmtN(p.stock)}
                    </span>
                    <span className="ml-1 text-[10px] text-mut2">{p.unit}</span>
                    {crit && !neg && <div className="text-[9px] font-bold text-amber2">KRİTİK</div>}
                    {neg && <div className="text-[9px] font-bold text-red">EKSİ</div>}
                  </Td>
                  <Td>
                    {p.expiry ? (
                      <Badge tone={exp ? 'bad' : 'mut'}>{new Date(p.expiry).toLocaleDateString('tr-TR')}</Badge>
                    ) : (
                      <span className="text-mut2">—</span>
                    )}
                  </Td>
                  <Td>
                    {isAdmin ? (
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => openEdit(p)}
                        className="rounded-md border border-line2 p-1.5 text-mut transition-colors hover:border-amber/50 hover:text-amber2"
                        title="Düzenle"
                      >
                        <Ic n="edit" c="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setDel(p)}
                        className="rounded-md border border-line2 p-1.5 text-mut transition-colors hover:border-red/50 hover:text-red"
                        title="Sil"
                      >
                        <Ic n="trash" c="h-3.5 w-3.5" />
                      </button>
                    </div>
                    ) : (
                      <span className="text-mut2"><Ic n="lock" c="h-3.5 w-3.5 inline" /></span>
                    )}
                  </Td>
                </tr>
              );
            })}
            {list.length === 0 && (
              <tr>
                <td colSpan={9} className="py-10 text-center font-mono text-[12px] text-mut2">
                  Kayıt bulunamadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ÜRÜN EKLEME / DÜZENLEME MODALI (GÖNDERİLEN GÖRSELİN GELİŞMİŞ HALİ) */}
      {form && (
        <Modal
          title={isNew ? 'Yapay Zekâ Destekli Ürün Ekleme Sihirbazı' : 'Ürünü Düzenle'}
          icon={<Ic n="sparkles" c="h-4.5 w-4.5 text-amber" />}
          onClose={() => setForm(null)}
          w="max-w-2xl"
          footer={
            <>
              <Btn v="ghost" onClick={() => setForm(null)}>
                İptal
              </Btn>
              <Btn v="primary" onClick={submit} className="gap-2 px-6">
                <Ic n="check" c="h-4 w-4" /> {isNew ? 'Ürünü Kaydet ve Listeye Ekle' : 'Değişiklikleri Kaydet'}
              </Btn>
            </>
          }
        >
          <div className="space-y-3">
            {/* Row 1: Barkod + Özel Kod */}
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-[1fr_auto_150px] items-end">
              <Field label="Barkod Numarası (Opsiyonel)">
                <div className="flex gap-1.5">
                  <Inp
                    value={form.barcode}
                    onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                    placeholder="Barkod opsiyonel - çakmak"
                    className="font-mono text-[13px] tracking-widest"
                  />
                  <button
                    type="button"
                    onClick={() => setScanOpen(true)}
                    title="Kamera ile barkod okut"
                    className="flex h-[38px] shrink-0 items-center justify-center rounded-lg border border-blue/50 bg-blue/10 px-3 text-blue transition-colors hover:bg-blue/20"
                  >
                    <Ic n="camera" c="h-5 w-5" />
                  </button>
                  {!form.barcode.trim() && (
                    <button
                      type="button"
                      onClick={() => {
                        const bc = generateEan13(form.name || form.customCode);
                        setForm({ ...form, barcode: bc });
                        toast(`Yeni EAN-13 barkod üretildi: ${bc}`);
                      }}
                      title="Barkodsuz ürün için geçerli EAN-13 barkod üret"
                      className="flex h-[38px] shrink-0 items-center justify-center gap-1 rounded-lg border border-mint/50 bg-mint/10 px-2.5 text-mint transition-colors hover:bg-mint/20"
                    >
                      <Ic n="zap" c="h-4 w-4" />
                      <span className="font-mono text-[9px] font-bold uppercase">Üret</span>
                    </button>
                  )}
                </div>
              </Field>
              <Btn
                v="primary"
                type="button"
                onClick={fetchMetadata}
                disabled={fetching}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 h-[38px] px-4 gap-1.5 shadow-[0_0_12px_rgba(79,70,229,0.3)] disabled:opacity-40"
              >
                <Ic n="globe" c={cn('h-4 w-4', fetching && 'animate-spin')} />
                {fetching ? 'Getiriliyor…' : 'Bilgileri Otomatik Getir'}
              </Btn>
              <Field label="Özel Kod / Tuş">
                <Inp
                  value={form.customCode}
                  onChange={(e) => setForm({ ...form, customCode: e.target.value })}
                  placeholder="Örn: 101, 27001"
                  className="font-mono text-center"
                />
              </Field>
            </div>
            <p className="-mt-1.5 text-[9.5px] text-mut2">
              Barkodsuz ürünlerde alanı boş bırakın; sistem benzersiz bir iç kod oluşturur.
            </p>

            {/* Canlı barkod önizleme */}
            {/^\d{13}$/.test(form.barcode.trim()) && (
              <div className="flex items-center gap-3 rounded-xl border border-line bg-white/95 p-3">
                <Barcode value={form.barcode.trim()} height={40} width={180} />
                <div className="min-w-0 text-[10px] leading-relaxed text-mut2">
                  <div className="font-bold text-mint">Gerçek EAN-13 barkod önizlemesi</div>
                  Bu barkod standart okuyucularla taranabilir; kaydettikten sonra raf etiketlerinde de aynı şekilde basılır.
                </div>
              </div>
            )}

            {/* Row 2: Ürün Adı (AI) + Kategori */}
            <div className="grid gap-3 sm:grid-cols-[1fr_200px]">
              <Field label="Ürün Adı *">
                <div className="flex gap-1.5">
                  <Inp
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Örn: Tuborg Gold Kutu 50cl"
                  />
                  <button
                    type="button"
                    onClick={fetchByName}
                    disabled={nameFetching}
                    title="Yapay zekâ ile bu ürünün barkodunu, tüm bilgilerini ve görselini getir"
                    className="flex h-[38px] shrink-0 items-center justify-center gap-1 rounded-lg border border-amber/50 bg-gradient-to-br from-amber/20 to-indigo-500/20 px-3 text-amber2 shadow-[0_0_14px_rgba(245,158,11,0.25)] transition-all hover:from-amber/30 hover:to-indigo-500/30 disabled:opacity-40"
                  >
                    <Ic n="sparkles" c={cn('h-4 w-4', nameFetching && 'animate-spin')} />
                    <span className="font-mono text-[9px] font-bold uppercase tracking-wider">AI</span>
                  </button>
                </div>
              </Field>
              <Field label="Kategori *">
                <Sel value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {CATEGORIES.map((c) => (
                    <option key={c.name}>{c.name}</option>
                  ))}
                </Sel>
              </Field>
            </div>

            {/* Row 3: Marka + Gramaj + Birim + Resim URL */}
            <div className="grid gap-3 sm:grid-cols-[1fr_1fr_120px_1.5fr_auto]">
              <Field label="Marka">
                <Inp
                  value={form.brand}
                  onChange={(e) => setForm({ ...form, brand: e.target.value })}
                  placeholder="Örn: Tuborg"
                />
              </Field>
              <Field label="Gramaj / Boyut">
                <Inp
                  value={form.gram}
                  onChange={(e) => setForm({ ...form, gram: e.target.value })}
                  placeholder="Örn: 50cl, 120g, 1.5"
                />
              </Field>
              <Field label="Ölçü Birimi">
                <Sel value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                  <option value="adet">Adet</option>
                  <option value="kg">Kg (Kilo)</option>
                  <option value="lt">Lt (Litre)</option>
                  <option value="paket">Paket</option>
                  <option value="kutu">Kutu</option>
                </Sel>
              </Field>
              <Field label="Ürün Resim URL / Dosya">
                <Inp
                  value={form.image}
                  onChange={(e) => setForm({ ...form, image: e.target.value })}
                  placeholder="images/soda.jpg"
                  className="font-mono text-xs text-mint"
                />
              </Field>
              <div className="flex flex-col justify-end">
                <Btn
                  v="ghost"
                  type="button"
                  onClick={() => {
                    const cat = form.category;
                    const url =
                      cat === 'Bira'
                        ? PRESETS.beer
                        : cat === 'Raki' || cat === 'Viski'
                          ? PRESETS.liquor
                          : cat.startsWith('Sigara')
                            ? PRESETS.tobacco
                            : cat === 'Meşrubat'
                              ? PRESETS.soda
                              : cat === 'Atıştırmalık' || cat === 'Kuru Yemiş'
                                ? PRESETS.chips
                                : cat === 'Kahve & Çay'
                                  ? PRESETS.tobacco
                                  : PRESETS.soda;
                    setForm((f) => f && { ...f, image: url });
                    toast(`"${cat}" kategorisine uygun görsel URL atandı`);
                  }}
                  className="border-mint/50 text-mint h-[38px] px-3 gap-1 hover:bg-mint/10"
                >
                  <Ic n="star" c="h-4 w-4" /> Resim URL Bul
                </Btn>
              </div>
            </div>

            {/* Yerel görsel yükleme / çekme */}
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={imgFileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onPickImage}
              />
              <input
                ref={imgCamRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={onPickImage}
              />
              <Btn v="ghost" className="border-blue/40 text-blue" onClick={() => imgFileRef.current?.click()}>
                <Ic n="file" c="h-4 w-4" /> Dosyadan Yükle
              </Btn>
              <Btn v="ghost" className="border-blue/40 text-blue" onClick={() => imgCamRef.current?.click()}>
                <Ic n="camera" c="h-4 w-4" /> Kamerayla Çek
              </Btn>
              <span className="text-[10px] text-mut2">
                Görsel sıkıştırılıp cihazda saklanır — internet gerektirmez, URL gerekmez.
              </span>
            </div>

            {/* Resim Şablonları */}
            <div className="rounded-xl border border-line bg-ink/40 p-3">
              <div className="mb-2 font-mono text-[9px] uppercase tracking-wider text-mut2">
                Hızlı Hazır Resim Şablonları:
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: 'Bira (Beer)', url: PRESETS.beer },
                  { label: 'Viski/Rakı (Liquor)', url: PRESETS.liquor },
                  { label: 'Sigara (Tobacco)', url: PRESETS.tobacco },
                  { label: 'Meşrubat (Soda)', url: PRESETS.soda },
                  { label: 'Cips/Snack (Chips)', url: PRESETS.chips },
                  { label: 'Ekmek (Bread)', url: PRESETS.bread },
                ].map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => {
                      setForm((f) => f && { ...f, image: s.url });
                      toast(`${s.label} şablon görseli seçildi`);
                    }}
                    className={cn(
                      'rounded-md border border-line2 bg-panel3 px-2.5 py-1.5 font-mono text-[10px] text-mut transition-colors hover:border-amber/50 hover:text-amber2',
                      form.image === s.url && 'border-amber bg-amber/15 text-amber2'
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              {form.image && (
                <div className="mt-3 flex items-center gap-3 border-t border-line/50 pt-2.5">
                  <img src={form.image} alt="" className="h-10 w-16 rounded object-cover border border-line2" />
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold text-mut">Görsel önizleme:</div>
                    <div className="truncate font-mono text-[9px] text-mut2">{form.image}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Maliyet ve Fiyat kutuları */}
            <div className="rounded-xl border border-line bg-ink/40 p-3.5">
              <div className="mb-2.5 flex items-center justify-between">
                <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-mut">
                  Fiyat ve Maliyet Tanımları
                </span>
                <button
                  type="button"
                  onClick={autoCalcPrices}
                  className="font-mono text-[10px] font-semibold text-amber2 hover:text-amber"
                >
                  [ F2, F3, KK, Taksit Hesaplama Sihirbazını Çalıştır ]
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2.5 md:grid-cols-6">
                <Field label="Maliyet (Alış) ₺">
                  <Inp
                    type="number"
                    value={form.cost}
                    onChange={(e) => setForm({ ...form, cost: e.target.value })}
                    placeholder="0.00"
                    className="font-mono"
                  />
                </Field>
                <Field label="Satış Fiyatı 1 ₺">
                  <Inp
                    type="number"
                    value={form.p1}
                    onChange={(e) => setForm({ ...form, p1: e.target.value })}
                    placeholder="0.00"
                    className="font-mono text-mint"
                  />
                </Field>
                <Field label="Satış Fiyatı 2 ₺">
                  <Inp
                    type="number"
                    value={form.p2}
                    onChange={(e) => setForm({ ...form, p2: e.target.value })}
                    placeholder="F1 ile a…"
                    className="font-mono text-mut"
                  />
                </Field>
                <Field label="Satış Fiyatı 3 ₺">
                  <Inp
                    type="number"
                    value={form.p3}
                    onChange={(e) => setForm({ ...form, p3: e.target.value })}
                    placeholder="F1 ile a…"
                    className="font-mono text-mut"
                  />
                </Field>
                <Field label="Kredi Kartı ₺">
                  <Inp
                    readOnly
                    value={form.p1 ? String(Math.round(Number(form.p1) * 100) / 100) : ''}
                    placeholder="F1 ile aynı"
                    className="font-mono text-mint bg-ink/30 cursor-not-allowed"
                  />
                </Field>
                <Field label="Taksitli Satış ₺">
                  <Inp
                    type="number"
                    value={form.installment}
                    onChange={(e) => setForm({ ...form, installment: e.target.value })}
                    placeholder="Elle gir"
                    className={cn(
                      'font-mono',
                      form.installment && Number(form.installment) > 0 && Number(form.installment) <= Number(form.p1)
                        ? 'border-red/60 text-red'
                        : 'text-amber2'
                    )}
                  />
                </Field>
              </div>
            </div>

            {/* Row 6: Stok + Kritik + SKT + Tedarikçi */}
            <div className="grid gap-3 sm:grid-cols-4">
              <Field label="Mevcut Stok Miktarı">
                <Inp
                  type="number"
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                  placeholder="0"
                />
              </Field>
              <Field label="Kritik Stok Seviyesi">
                <Inp
                  type="number"
                  value={form.critical}
                  onChange={(e) => setForm({ ...form, critical: e.target.value })}
                  placeholder="10"
                />
              </Field>
              <Field label="Son Kullanma Tarihi">
                <Inp
                  type="date"
                  value={form.expiry}
                  onChange={(e) => setForm({ ...form, expiry: e.target.value })}
                />
              </Field>
              <Field label="Tedarikçi Firma">
                <Sel value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })}>
                  <option>Tedarikçi Yok / Standart</option>
                  <option>Anadolu Toptan Gıda</option>
                  <option>TÜBİTAK Tekel Dağıtım</option>
                  <option>Efes Bira Grubu</option>
                  <option>Marlboro Philip Morris</option>
                </Sel>
              </Field>
            </div>

            {/* Checkbox'lar */}
            <div className="rounded-xl border border-line bg-ink/40 p-3 flex gap-6 items-center">
              <label className="flex cursor-pointer items-center gap-2 text-[12px] text-mut">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={form.quickAccess}
                  onClick={() => setForm({ ...form, quickAccess: !form.quickAccess })}
                  className={cn(
                    'flex h-4.5 w-4.5 items-center justify-center rounded border transition-colors',
                    form.quickAccess ? 'border-amber bg-amber text-[#1a1102]' : 'border-line2 bg-ink'
                  )}
                >
                  {form.quickAccess && <Ic n="check" c="h-3 w-3" />}
                </button>
                Ana Ekranda Kısayol Göster (Hızlı Satış)
              </label>

              <label className="flex cursor-pointer items-center gap-2 text-[12px] text-mut">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={form.isWeight}
                  onClick={() => setForm({ ...form, isWeight: !form.isWeight })}
                  className={cn(
                    'flex h-4.5 w-4.5 items-center justify-center rounded border transition-colors',
                    form.isWeight ? 'border-blue bg-blue text-[#04121f]' : 'border-line2 bg-ink'
                  )}
                >
                  {form.isWeight && <Ic n="check" c="h-3 w-3" />}
                </button>
                Terazi Ürünü (Tartılı Satış)
              </label>
            </div>
          </div>
        </Modal>
      )}

      {/* onay silme */}
      {del && (
        <Confirm
          title="Ürünü Sil"
          msg={`"${del.name}" ürünü kalıcı olarak silinecek. Devam edilsin mi?`}
          label="Sil"
          onCancel={() => setDel(null)}
          onOk={() => {
            remove(del.id);
            setDel(null);
            toast('Ürün silindi', 'err');
          }}
        />
      )}

      {countOpen && (
        <StockCountModal
          products={products}
          history={stockCounts}
          onClose={() => setCountOpen(false)}
          onApply={onApplyCount}
          toast={toast}
        />
      )}
      {zamOpen && (
        <ZamModal products={products} onClose={() => setZamOpen(false)} onApply={bulkUpdate} toast={toast} />
      )}

      {labelStudioOpen && (
        <LabelStudioModal
          products={products}
          settings={settings}
          onClose={() => setLabelStudioOpen(false)}
        />
      )}

      {importOpen && (
        <StockImportModal
          products={products}
          settings={settings}
          onApply={bulkUpdate}
          onClose={() => setImportOpen(false)}
          toast={toast}
        />
      )}

      {intelOpen && (
        <Modal
          title="Stok Zekâsı (ABC Analizi & Stok Ömrü)"
          icon={<Ic n="sparkles" c="h-4.5 w-4.5 text-mint" />}
          onClose={() => setIntelOpen(false)}
          w="max-w-4xl"
        >
          {/* Dönem seçici + özet kartlar */}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-mut">Analiz dönemi:</span>
            <div className="flex gap-1 rounded-lg border border-line2 bg-ink/50 p-1">
              {([7, 30, 90] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setIntelWindow(d)}
                  className={cn(
                    'rounded-md px-3 py-1 font-mono text-[11px] font-semibold transition-colors',
                    intelWindow === d ? 'bg-mint text-[#04211a]' : 'text-mut hover:text-txt'
                  )}
                >
                  {d} Gün
                </button>
              ))}
            </div>
            <span className="ml-auto font-mono text-[10.5px] text-mut2">
              Dönem cirosu: <b className="text-mint">{fmt(intel.totalRevenue)}</b>
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {abcCounts.map((a) => (
              <div
                key={a.cls}
                className="rounded-xl border bg-panel p-3"
                style={{ borderColor: ABC_META[a.cls].dot + '55' }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-lg font-mono text-sm font-black"
                    style={{ background: ABC_META[a.cls].dot + '22', color: ABC_META[a.cls].dot }}
                  >
                    {a.cls}
                  </span>
                  <div>
                    <div className="font-mono text-[11px] font-bold text-txt">{a.count} ürün</div>
                    <div className="font-mono text-[10px] text-mut2">{fmt(a.revenue)} ciro</div>
                  </div>
                </div>
              </div>
            ))}
            <div className="rounded-xl border border-line bg-panel p-3">
              <div className="font-mono text-[9.5px] uppercase tracking-wider text-mut2">Hareketli</div>
              <div className="mt-1 font-mono text-lg font-bold text-txt">{intel.movingCount}</div>
            </div>
          </div>

          <div className="mb-2 mt-3 flex flex-wrap gap-2">
            <Badge tone="ok">Hareketli: {intel.movingCount}</Badge>
            <Badge tone="warn">Atıl stok (hareketsiz): {intel.deadCount}</Badge>
            <Badge tone="bad">Kritik/tükenmiş: {intel.outRiskCount}</Badge>
          </div>

          {/* Tablo */}
          <div className="max-h-[42vh] overflow-y-auto rounded-xl border border-line bg-panel">
            <table className="w-full min-w-[720px] border-collapse">
              <thead className="sticky top-0 border-b border-line bg-ink/80">
                <tr>
                  <Th>Ürün</Th>
                  <Th>ABC</Th>
                  <Th className="text-right">Dönem Ciro</Th>
                  <Th className="text-right">Satış</Th>
                  <Th className="text-right">Hız (ad/gün)</Th>
                  <Th className="text-right">Stok</Th>
                  <Th className="text-right">Kalan Gün</Th>
                </tr>
              </thead>
              <tbody>
                {intel.rows.map((r) => {
                  const m = ABC_META[r.cls];
                  const risk = r.daysLeft !== null && r.daysLeft <= r.product.critical;
                  return (
                    <tr key={r.product.id} className="border-b border-line/60 last:border-0 hover:bg-panel2/40">
                      <Td>
                        <div className="font-semibold leading-tight">{r.product.name}</div>
                        <div className="text-[10px] text-mut2">{r.product.category}</div>
                      </Td>
                      <Td>
                        <span className={cn('inline-block rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-bold', m.chip)}>
                          {r.cls}
                        </span>
                      </Td>
                      <Td className="text-right font-mono tabular-nums text-mint">{fmt(r.revenue)}</Td>
                      <Td className="text-right font-mono tabular-nums">{fmtN(r.qty)}</Td>
                      <Td className="text-right font-mono tabular-nums text-mut">{r.moving ? r.velocity.toFixed(1) : '—'}</Td>
                      <Td className="text-right font-mono tabular-nums">{fmtN(r.product.stock)}</Td>
                      <Td className="text-right">
                        {r.daysLeft === null ? (
                          <span className="font-mono text-[10px] text-mut2">hareketsiz</span>
                        ) : (
                          <span className={cn('font-mono tabular-nums font-bold', risk ? 'text-red' : 'text-txt')}>
                            {r.daysLeft} gün
                          </span>
                        )}
                      </Td>
                    </tr>
                  );
                })}
                {intel.rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center font-mono text-[11px] text-mut2">Ürün bulunamadı.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* En çok satanlar + atıl stok */}
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-line bg-ink/40 p-3">
              <div className="mb-2 font-mono text-[10px] font-bold uppercase tracking-wider text-mint">
                🏆 En Çok Satanlar (A)
              </div>
              <div className="space-y-1.5">
                {topSellers.map((r, i) => (
                  <div key={r.product.id} className="flex items-center gap-2 text-[11.5px]">
                    <span className="w-4 font-mono font-bold text-amber2">{i + 1}.</span>
                    <span className="min-w-0 flex-1 truncate">{r.product.name}</span>
                    <span className="font-mono text-mint">{fmt(r.revenue)}</span>
                    <span className="font-mono text-mut2">{fmtN(r.qty)} ad</span>
                  </div>
                ))}
                {topSellers.length === 0 && <div className="text-[11px] text-mut2">Dönemde satış kaydı yok.</div>}
              </div>
            </div>
            <div className="rounded-xl border border-line bg-ink/40 p-3">
              <div className="mb-2 font-mono text-[10px] font-bold uppercase tracking-wider text-amber2">
                ⚠️ Atıl Stok (hareketsiz ama depoda)
              </div>
              <div className="space-y-1.5">
                {slowMovers.map((r) => (
                  <div key={r.product.id} className="flex items-center gap-2 text-[11.5px]">
                    <span className="min-w-0 flex-1 truncate">{r.product.name}</span>
                    <span className="font-mono text-mut2">{fmtN(r.product.stock)} {r.product.unit}</span>
                    <span className="font-mono text-mut2">{fmt(r.product.cost * r.product.stock)} maliyet</span>
                  </div>
                ))}
                {slowMovers.length === 0 && <div className="text-[11px] text-mut2">Atıl stok yok 🎉</div>}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {aiSearchOpen && (
        <Modal
          title="Yapay Zekâ Ürün Eşleşmeleri"
          icon={<Ic n="sparkles" c="h-4.5 w-4.5 text-amber" />}
          onClose={() => setAiSearchOpen(false)}
          w="max-w-xl"
        >
          <p className="mb-3 text-[11px] leading-relaxed text-mut2">
            Adını yazdığınız ürün için küresel veri tabanında bulunan eşleşmeler. Birine tıkladığınızda barkodu,
            markası, gramajı, kategorisi ve görseli forma aktarılır.
          </p>
          <div className="space-y-2">
            {aiResults.map((m, i) => (
              <button
                key={`${m.barcode}-${i}`}
                type="button"
                onClick={() => {
                  applyMeta(m);
                  setAiSearchOpen(false);
                  toast('Seçilen ürünün bilgileri forma uygulandı');
                }}
                className="flex w-full items-center gap-3 rounded-xl border border-line bg-panel2/60 p-3 text-left transition-colors hover:border-amber/60"
              >
                {m.image ? (
                  <img
                    src={m.image}
                    alt=""
                    className="h-12 w-12 shrink-0 rounded-lg border border-line2 object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-line2 bg-panel3">
                    <Ic n="box" c="h-5 w-5 text-mut" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-bold text-txt">{m.name || 'İsimsiz Ürün'}</div>
                  <div className="truncate text-[10px] text-mut2">
                    {m.brand}
                    {m.brand && m.gram ? ' · ' : ''}
                    {m.gram}
                  </div>
                  <div className="mt-1 flex items-center gap-1.5">
                    {m.barcode && <span className="font-mono text-[10px] text-blue">{m.barcode}</span>}
                    {m.category && <Badge tone="info">{m.category}</Badge>}
                  </div>
                </div>
                <span className="shrink-0 rounded-lg border border-amber/40 bg-amber/10 px-2 py-1 font-mono text-[10px] font-bold text-amber2">
                  SEÇ
                </span>
              </button>
            ))}
          </div>
        </Modal>
      )}

      {scanOpen && (
        <CameraScanner
          onDetected={(barcode) => {
            setForm((f) => (f ? { ...f, barcode } : f));
            toast(`Barkod okundu: ${barcode}`);
            return true;
          }}
          onClose={() => setScanOpen(false)}
        />
      )}
    </div>
  );
}

/* ---------------- Stok Sayımı ---------------- */

function StockCountModal({
  products,
  history,
  onClose,
  onApply,
  toast,
}: {
  products: Product[];
  history: StockCountSession[];
  onClose: () => void;
  onApply: (counts: Record<string, string>) => void;
  toast: Toast;
}) {
  const [q, setQ] = useState('');
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [showHistory, setShowHistory] = useState(false);
  const filtered = products.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()) || p.barcode.includes(q));

  const entries = buildCountEntries(products, counts);
  const summary: StockCountSummary = summarizeCount(entries);

  const apply = () => {
    onApply(counts);
    toast(
      `Sayım uygulandı — ${entries.length} üründe düzeltme (fire: ${fmtN(summary.minusQty)}, fazla: ${fmtN(summary.plusQty)})`
    );
    onClose();
  };

  return (
    <Modal
      title="Stok Sayımı Yap"
      icon={<Ic n="reset" c="h-4.5 w-4.5" />}
      onClose={onClose}
      w="max-w-2xl"
      footer={
        <>
          <Btn v="ghost" onClick={onClose}>
            Vazgeç
          </Btn>
          <Btn v="primary" onClick={apply} disabled={entries.length === 0}>
            <Ic n="check" c="h-4 w-4" /> Sayımı Uygula ({entries.length})
          </Btn>
        </>
      }
    >
      {/* Özet kartları */}
      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <SummaryCard label="Fire (eksik)" value={`-${fmtN(summary.minusQty)}`} tone="text-red" />
        <SummaryCard label="Fazla" value={`+${fmtN(summary.plusQty)}`} tone="text-mint" />
        <SummaryCard label="Fire değeri" value={fmt(summary.minusValue)} tone="text-red" />
        <SummaryCard label="Net fark değeri" value={fmt(summary.netValue)} tone={summary.netValue < 0 ? 'text-red' : 'text-mint'} />
      </div>

      <div className="mb-2">
        <Inp placeholder="Ürün ara…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="max-h-[40vh] space-y-1 overflow-y-auto">
        {filtered.map((p) => {
          const v = counts[p.id] ?? '';
          const diff = v !== '' ? Number(v) - p.stock : 0;
          return (
            <div key={p.id} className="flex items-center gap-2 rounded-lg border border-line bg-panel2/50 px-3 py-2">
              <span className="min-w-0 flex-1 truncate text-[12px] font-medium">{p.name}</span>
              <span className="font-mono text-[11px] text-mut2">Sistem: {fmtN(p.stock)}</span>
              <input
                type="number"
                value={v}
                onChange={(e) => setCounts({ ...counts, [p.id]: e.target.value })}
                placeholder="Sayım"
                className="w-24 rounded-md border border-line2 bg-ink/70 px-2 py-1.5 text-right font-mono text-[12px] outline-none focus:border-amber/70"
              />
              {v !== '' && diff !== 0 && (
                <span className={cn('w-14 text-right font-mono text-[11px] font-bold', diff > 0 ? 'text-mint' : 'text-red')}>
                  {diff > 0 ? '+' : ''}
                  {fmtN(diff)}
                </span>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="rounded-lg border border-dashed border-line px-3 py-6 text-center text-[12px] text-mut2">
            Ürün bulunamadı.
          </div>
        )}
      </div>

      {/* Sayım geçmişi */}
      <div className="mt-3">
        <button
          onClick={() => setShowHistory((v) => !v)}
          className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-mut hover:text-txt"
        >
          <Ic n={showHistory ? 'chevD' : 'chevR'} c="h-3.5 w-3.5" />
          Sayım Geçmişi ({history.length})
        </button>
        {showHistory && (
          <div className="mt-2 max-h-[30vh] space-y-1 overflow-y-auto">
            {history.length === 0 && (
              <div className="rounded-lg border border-dashed border-line px-3 py-4 text-center text-[11px] text-mut2">
                Henüz sayım yapılmadı.
              </div>
            )}
            {history.map((s) => {
              const sum = summarizeCount(s.entries);
              return (
                <div key={s.id} className="flex items-center gap-2 rounded-lg border border-line bg-panel2/40 px-3 py-2">
                  <Ic n="reset" c="h-4 w-4 text-mut" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12px] font-medium">
                      {dstr(s.date)} {tstr(s.date)} · {s.by}
                    </div>
                    <div className="font-mono text-[10px] text-mut2">
                      {s.entries.length} ürün · fire {fmtN(sum.minusQty)} · fazla {fmtN(sum.plusQty)}
                    </div>
                  </div>
                  <span className={cn('font-mono text-[11px] font-bold', sum.netValue < 0 ? 'text-red' : 'text-mint')}>
                    {fmt(sum.netValue)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-lg border border-line bg-panel2/50 px-3 py-2">
      <div className="font-mono text-[9px] uppercase tracking-wider text-mut2">{label}</div>
      <div className={cn('mt-0.5 font-mono text-[13px] font-bold tabular-nums', tone)}>{value}</div>
    </div>
  );
}

/* ---------------- Kategoriye Zam ---------------- */

function ZamModal({
  products,
  onClose,
  onApply,
  toast,
}: {
  products: Product[];
  onClose: () => void;
  onApply: (list: Product[]) => void;
  toast: Toast;
}) {
  const [cat, setCat] = useState('Tüm Kategoriler');
  const [pct, setPct] = useState('');
  const [which, setWhich] = useState<{ p1: boolean; p2: boolean; p3: boolean }>({ p1: true, p2: true, p3: true });
  const affected = products.filter((p) => cat === 'Tüm Kategoriler' || p.category === cat);
  const rate = Number(pct.replace(',', '.')) || 0;

  const apply = () => {
    if (rate === 0) {
      toast('Zam oranı girin', 'err');
      return;
    }
    const f = 1 + rate / 100;
    const next = products.map((p) => {
      if (cat !== 'Tüm Kategoriler' && p.category !== cat) return p;
      return {
        ...p,
        p1: which.p1 ? Math.round(p.p1 * f * 100) / 100 : p.p1,
        p2: which.p2 ? Math.round(p.p2 * f * 100) / 100 : p.p2,
        p3: which.p3 ? Math.round(p.p3 * f * 100) / 100 : p.p3,
      };
    });
    onApply(next);
    toast(`${affected.length} ürüne %${rate} ${rate > 0 ? 'zam' : 'indirim'} uygulandı`);
    onClose();
  };

  return (
    <Modal
      title="Kategoriye Zam / İndirim Yap"
      icon={<Ic n="trend" c="h-4.5 w-4.5" />}
      onClose={onClose}
      w="max-w-md"
      footer={
        <>
          <Btn v="ghost" onClick={onClose}>
            Vazgeç
          </Btn>
          <Btn v="primary" onClick={apply}>
            <Ic n="check" c="h-4 w-4" /> Uygula
          </Btn>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Kategori">
          <Sel value={cat} onChange={(e) => setCat(e.target.value)}>
            <option>Tüm Kategoriler</option>
            {CATEGORIES.map((c) => (
              <option key={c.name}>{c.name}</option>
            ))}
          </Sel>
        </Field>
        <Field label="Oran (%) — indirim için eksi değer girin">
          <Inp type="number" value={pct} onChange={(e) => setPct(e.target.value)} placeholder="Örn: 10" />
        </Field>
        <div>
          <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-mut">Uygulanacak Fiyatlar</span>
          <div className="flex gap-2">
            {(['p1', 'p2', 'p3'] as const).map((k) => (
              <button
                key={k}
                onClick={() => setWhich({ ...which, [k]: !which[k] })}
                className={cn(
                  'flex-1 rounded-lg border px-2 py-2 text-[12px] font-bold transition-colors',
                  which[k] ? 'border-amber bg-amber/15 text-amber2' : 'border-line2 bg-ink/40 text-mut'
                )}
              >
                {k.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-line bg-ink/40 px-3 py-2 text-[11.5px] text-mut">
          <span className="font-bold text-amber2">{affected.length}</span> ürün etkilenecek.
        </div>
      </div>
    </Modal>
  );
}
