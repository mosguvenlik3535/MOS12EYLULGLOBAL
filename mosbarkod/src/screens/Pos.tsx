import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '../utils/cn';
import { Ic } from '../icons';
import { Btn, Inp, Modal } from '../components/ui';
import { playBeep } from '../lib/sounds';
import { APP_VERSION } from '../lib/buildMode';
import CameraScanner from '../components/CameraScanner';
import { useLocale } from '../locales/i18n';
import AiVisionModal from '../components/AiVisionModal';
import { broadcastToCfd, CustomerDisplay } from '../components/CustomerDisplay';
import {
  CATEGORIES,
  PRICE_MODES,
  fmt,
  fmtN,
  lineNet,
  priceOf,
  round2,
  type CartLine,
  type Product,
  type PriceMode,
  type Sale,
  type Settings,
} from '../data';

export interface ScanFx {
  code: string;
  k: number;
}

interface PosProps {
  register: number;
  cart: CartLine[];
  products: Product[];
  priceMode: PriceMode;
  setPriceMode: (m: PriceMode) => void;
  settings: Settings;
  isAdmin: boolean;
  toast: (msg: string, type?: 'ok' | 'err') => void;
  discount: number;
  setDiscount: (n: number) => void;
  allowNeg: boolean;
  setAllowNeg: (b: boolean) => void;
  onPay: () => void;
  clearCart: () => void;
  addToCart: (p: Product) => void;
  addCustom: (name: string, price: number) => void;
  incLine: (id: string) => void;
  decLine: (id: string) => void;
  removeLine: (id: string) => void;
  setLineLevel: (id: string, level: 'f1' | 'f2' | 'f3') => void;
  setLineDiscount: (id: string, pct: number) => void;
  setLinePrice: (id: string, price: number) => void;
  addWeight: (p: Product, weight: number) => void;
  submitBarcode: (code: string) => boolean;
  scanFx: ScanFx | null;
  fireScan: (p: Product) => void;
  sales: Sale[];
}

/* ---------- reorder handle ---------- */

function MoveHandle({
  canLeft,
  canRight,
  onLeft,
  onRight,
}: {
  canLeft: boolean;
  canRight: boolean;
  onLeft: () => void;
  onRight: () => void;
}) {
  return (
    <div className="flex items-center gap-0.5 rounded-md border border-line2 bg-ink/60 p-0.5" title="Paneli taşı">
      <button
        onClick={onLeft}
        disabled={!canLeft}
        className="flex h-5 w-5 items-center justify-center rounded text-mut transition-colors hover:bg-panel3 hover:text-amber2 disabled:pointer-events-none disabled:opacity-25"
      >
        <Ic n="chevL" c="h-3.5 w-3.5" />
      </button>
      <button
        onClick={onRight}
        disabled={!canRight}
        className="flex h-5 w-5 items-center justify-center rounded text-mut transition-colors hover:bg-panel3 hover:text-amber2 disabled:pointer-events-none disabled:opacity-25"
      >
        <Ic n="chevR" c="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/* ---------- product image with fallback tile ---------- */

function ImgOrTile({
  p,
  dot,
  scale = 100,
  fit = 'cover',
}: {
  p: Product;
  dot: string;
  scale?: number;
  fit?: 'cover' | 'contain';
}) {
  const [fail, setFail] = useState(false);
  if (!p.image || fail) {
    return (
      <div
        className="flex h-full w-full items-center justify-center"
        style={{ background: `linear-gradient(135deg, ${dot}26, #141b24 70%)` }}
      >
        <span className="font-mono text-2xl font-bold opacity-80" style={{ color: dot }}>
          {p.name.slice(0, 2).toUpperCase()}
        </span>
      </div>
    );
  }
  return (
    <img
      src={p.image}
      alt={p.name}
      loading="lazy"
      onError={() => setFail(true)}
      className="h-full w-full"
      style={{
        objectFit: fit,
        transform: `scale(${Math.max(50, Math.min(200, scale)) / 100})`,
        transformOrigin: 'center center',
      }}
    />
  );
}

const catOf = (name: string) => CATEGORIES.find((c) => c.name === name) ?? CATEGORIES[0];

/* ---------- single cart row (görseldeki modern satır) ---------- */

function CartRow({
  l,
  product,
  onInc,
  onDec,
  onRemove,
  onLevel,
  onDiscount,
  onPriceChange,
  isAdmin,
  toast,
  ui,
}: {
  l: CartLine;
  product?: Product;
  onInc: () => void;
  onDec: () => void;
  onRemove: () => void;
  onLevel: (lv: 'f1' | 'f2' | 'f3') => void;
  onDiscount: (pct: number) => void;
  onPriceChange: (price: number) => void;
  isAdmin: boolean;
  toast?: (msg: string, type?: 'ok' | 'err') => void;
  ui: { nameColor: string; nameWeight: number; priceColor: string };
}) {
  const [isk, setIsk] = useState(false);
  const [val, setVal] = useState('');
  const [editPrice, setEditPrice] = useState(false);
  const [priceVal, setPriceVal] = useState('');
  const net = lineNet(l);
  const lvl = l.level;
  const chip = l.mode === 'kkart' ? 'KK' : l.mode === 'taksit' ? 'TKS' : lvl === 'f2' ? 'F2' : lvl === 'f3' ? 'F3' : 'F1';
  const canCycle = l.mode !== 'kkart' && l.mode !== 'taksit';
  const dot = product ? (catOf(product.category).dot ?? '#888') : '#8fa0b2';
  const isManual = l.unitPrice !== l.p1 && l.unitPrice !== l.p2 && l.unitPrice !== l.p3;
  const minCost = product?.cost ?? 0;

  const openI = () => {
    setVal(l.lineDiscount ? String(l.lineDiscount) : '');
    setIsk(true);
  };
  const applyI = () => {
    onDiscount(Math.min(100, Math.max(0, Number(val.replace(',', '.')) || 0)));
    setIsk(false);
  };

  const openPrice = () => {
    if (!isAdmin) {
      toast?.('Fiyat elle değiştirme yetkisi yalnızca yöneticiye (Admin) aittir', 'err');
      return;
    }
    setPriceVal(String(l.unitPrice));
    setEditPrice(true);
  };
  const applyPrice = () => {
    const p = Number(priceVal.replace(',', '.'));
    if (!(p > 0)) {
      setEditPrice(false);
      return;
    }
    if (minCost > 0 && p < minCost) {
      toast?.(`Maliyet altında satış yapılamaz — minimum ${fmt(minCost)} olmalı`, 'err');
      setPriceVal(String(minCost));
      return;
    }
    onPriceChange(p);
    setEditPrice(false);
  };

  return (
    <div className="anim-pop rounded-xl border border-line bg-panel2/70 p-2.5 transition-colors hover:border-line2">
      <div className="flex items-center gap-2.5">
        {/* görsel */}
        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-line bg-panel3">
          {product && product.image ? (
            <RowImg src={product.image} dot={dot} name={l.name} />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${dot}26, #141b24 70%)` }}
            >
              <span className="font-mono text-[13px] font-bold" style={{ color: dot }}>
                {l.name.slice(0, 2).toUpperCase()}
              </span>
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          {/* ad + toplam */}
          <div className="flex items-start justify-between gap-2">
            <span
              className="truncate text-[13px] leading-tight"
              style={{ fontWeight: ui.nameWeight, color: ui.nameColor || undefined }}
            >
              {l.name}
            </span>
            <span
              className="shrink-0 font-mono text-[14px] font-bold tabular-nums"
              style={{ color: ui.priceColor || undefined }}
            >
              {fmt(net)}
            </span>
          </div>

          {/* birim fiyat — tıklanabilir, elle düzenlenebilir */}
          <div className="mt-0.5 flex items-center gap-1.5">
            {editPrice ? (
              <div className="flex items-center gap-1">
                <input
                  autoFocus
                  type="number"
                  value={priceVal}
                  onChange={(e) => setPriceVal(e.target.value)}
                  onBlur={applyPrice}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') applyPrice();
                    if (e.key === 'Escape') setEditPrice(false);
                  }}
                  className="h-6 w-24 rounded border border-amber bg-ink/80 px-1.5 text-right font-mono text-[12px] font-bold text-amber2 outline-none"
                />
                <span className="font-mono text-[10px] text-mut2">₺/{l.unit}</span>
                <button onClick={applyPrice} className="rounded bg-amber/20 px-1.5 py-0.5 font-mono text-[9px] font-bold text-amber2">✓</button>
              </div>
            ) : (
              <button
                onClick={openPrice}
                title={isAdmin ? 'Birim fiyatı elle değiştirmek için tıkla (Admin)' : 'Fiyat değiştirme yalnızca yöneticiye açıktır'}
                className={cn(
                  'flex items-center gap-1 rounded px-1 py-0.5 font-mono text-[10.5px] transition-colors',
                  isManual
                    ? 'border border-amber/60 bg-amber/10 text-amber2'
                    : isAdmin
                      ? 'text-mut2 hover:text-amber2'
                      : 'text-mut2/70 cursor-not-allowed'
                )}
              >
                <span className={cn(isManual ? '' : 'line-through')}>{fmt(l.unitPrice)}</span>
                <span className="text-[9px] opacity-60">/{l.unit}</span>
                <Ic n={isAdmin ? 'edit' : 'lock'} c="h-3 w-3 opacity-60" />
              </button>
            )}
            {isManual && isAdmin && (
              <button
                onClick={() => onPriceChange(l.p1)}
                title="Orijinal fiyata dön"
                className="rounded border border-line2 px-1.5 py-0.5 font-mono text-[9px] text-mut2 transition-colors hover:border-red/40 hover:text-red"
              >
                ↺F1
              </button>
            )}
          </div>

          {/* kontroller */}
          <div className="mt-1.5 flex items-center gap-2">
            <div className="flex items-center gap-0.5 rounded-md border border-line2 bg-ink/60 p-0.5">
              <button
                onClick={onDec}
                className="flex h-5.5 w-5.5 items-center justify-center rounded text-mut transition-colors hover:text-amber2"
              >
                <Ic n="minus" c="h-3 w-3" />
              </button>
              <span className="min-w-[52px] text-center font-mono text-[11px] font-semibold tabular-nums">
                {(l.unit === 'kg' || l.unit === 'lt'
                  ? l.qty.toLocaleString('tr-TR', { maximumFractionDigits: 3 })
                  : fmtN(l.qty))}{' '}
                {l.unit}
              </span>
              <button
                onClick={onInc}
                className="flex h-5.5 w-5.5 items-center justify-center rounded text-mut transition-colors hover:text-amber2"
              >
                <Ic n="plus" c="h-3 w-3" />
              </button>
            </div>

            <button
              onClick={() => canCycle && onLevel(lvl === 'f1' ? 'f2' : lvl === 'f2' ? 'f3' : 'f1')}
              title={
                canCycle
                  ? `Fiyat listesi: F1 ${fmt(l.p1)} · F2 ${fmt(l.p2)} · F3 ${fmt(l.p3)} — tıkla geç`
                  : l.mode === 'kkart'
                    ? 'K.Kartı = F1 fiyatı'
                    : 'Taksit — ürün kartından belirlenir'
              }
              className={cn(
                'rounded border px-1.5 py-0.5 font-mono text-[10px] font-bold transition-colors',
                canCycle
                  ? 'border-line2 text-amber2 hover:border-amber/60 hover:bg-amber/10'
                  : 'border-line2 text-mut'
              )}
            >
              {chip}
            </button>

            {isk ? (
              <span className="relative flex items-center">
                <span className="pointer-events-none absolute left-1.5 font-mono text-[10px] font-bold text-amber2">%</span>
                <input
                  autoFocus
                  type="number"
                  min={0}
                  max={100}
                  value={val}
                  onChange={(e) => setVal(e.target.value)}
                  onBlur={applyI}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') applyI();
                    if (e.key === 'Escape') setIsk(false);
                  }}
                  className="h-5.5 w-14 rounded border border-amber/60 bg-ink/70 pl-4 pr-1 text-right font-mono text-[11px] font-bold text-amber2 outline-none"
                />
              </span>
            ) : (
              <button
                onClick={openI}
                title="Satır iskontosu uygula"
                className={cn(
                  'rounded border px-1.5 py-0.5 font-mono text-[10px] font-bold transition-colors',
                  l.lineDiscount > 0
                    ? 'border-amber/60 bg-amber/15 text-amber2'
                    : 'border-red/40 bg-red/5 text-red hover:bg-red/15'
                )}
              >
                {l.lineDiscount > 0 ? `İsk %${l.lineDiscount}` : 'İsk'}
              </button>
            )}

            <button
              onClick={onRemove}
              title="Satırı sil"
              className="ml-auto rounded p-1 text-mut2 transition-colors hover:bg-red/10 hover:text-red"
            >
              <Ic n="trash" c="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RowImg({ src, dot, name }: { src: string; dot: string; name: string }) {
  const [fail, setFail] = useState(false);
  if (fail)
    return (
      <div className="flex h-full w-full items-center justify-center bg-panel3">
        <span className="font-mono text-[13px] font-bold" style={{ color: dot }}>
          {name.slice(0, 2).toUpperCase()}
        </span>
      </div>
    );
  return <img src={src} alt={name} loading="lazy" onError={() => setFail(true)} className="h-full w-full object-cover" />;
}

/* ---------- terazi entegrasyonu (gram & kilogram bazlı satış) ---------- */

const QUICK_W = [0.25, 0.5, 1, 2];

function WeightModal({
  p,
  price,
  onClose,
  onConfirm,
}: {
  p: Product;
  price: number;
  onClose: () => void;
  onConfirm: (w: number) => void;
}) {
  const [w, setW] = useState(0.5);
  const [src, setSrc] = useState<'manuel' | 'terazi'>('manuel');
  const bufRef = useRef<{ chars: string[]; t: number }>({ chars: [], t: 0 });

  /* Elektronik terazi (CAS/TEM) klavye emülasyonu:
     terazi ağırlığı rakamları gönderip Enter ile onaylar; burada yakalanır. */
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const buf = bufRef.current;
      if (/^[0-9.,]$/.test(e.key)) {
        buf.chars.push(e.key);
        buf.t = Date.now();
        return;
      }
      if (e.key === 'Enter' && buf.chars.length >= 3 && Date.now() - buf.t < 1500) {
        const val = parseFloat(buf.chars.join('').replace(',', '.'));
        if (isFinite(val) && val > 0 && val <= 50) {
          setW(Math.round(val * 1000) / 1000);
          setSrc('terazi');
          playBeep('kasaDit', 70);
          e.preventDefault();
        }
        buf.chars = [];
      } else if (e.key === 'Escape') {
        buf.chars = [];
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const readScale = () => {
    const base = w > 0 ? w : 0.5;
    setW(Math.max(0.01, Math.round(base * (1 + (Math.random() * 0.04 - 0.02)) * 1000) / 1000));
    setSrc('terazi');
    playBeep('kasaDit', 70);
  };

  const total = round2(w * price);
  const grTxt = w < 1 ? `${Math.round(w * 1000)} gr` : `${w.toLocaleString('tr-TR', { maximumFractionDigits: 3 })} kg`;

  return (
    <Modal title="Terazi Entegrasyonu" icon={<Ic n="scale" c="h-4.5 w-4.5" />} onClose={onClose} w="max-w-sm">
      <p className="-mt-1 mb-3 text-[12px] text-mut2">Gram ve Kilogram Bazlı Satış</p>

      <div className="rounded-xl border border-line bg-ink/40 px-4 py-3 text-center">
        <div className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-mut">Ürün</div>
        <div className="mt-1 text-[15px] font-bold">{p.name}</div>
        <div className="mt-0.5 font-mono text-[11px] text-mut">
          Birim Fiyat: {fmt(price)} / {p.unit}
        </div>
      </div>

      <div className="mt-2.5 rounded-xl border border-blue/25 bg-ink/40 px-4 py-3 text-center">
        <div className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-mut">Terazi Göstergesi</div>
        <div className="mt-1 flex items-baseline justify-center gap-1.5">
          <span
            className={cn(
              'font-mono text-4xl font-bold tabular-nums',
              src === 'terazi' ? 'anim-pop text-blue' : 'text-txt'
            )}
          >
            {w.toLocaleString('tr-TR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
          </span>
          <span className="font-mono text-[15px] font-semibold text-blue">kg</span>
        </div>
        <div className="mt-2.5 flex gap-1.5">
          <Btn v="ghost" className="flex-1" onClick={readScale}>
            <Ic n="scale" c="h-4 w-4" /> Teraziden Oku
          </Btn>
          {QUICK_W.map((q) => (
            <button
              key={q}
              onClick={() => {
                setW(q);
                setSrc('manuel');
              }}
              className={cn(
                'rounded-lg border px-2.5 font-mono text-[11px] font-bold transition-colors',
                w === q ? 'border-blue bg-blue/15 text-blue' : 'border-line2 bg-ink/50 text-mut hover:text-txt'
              )}
            >
              {q < 1 ? `${q * 1000} g` : `${q.toLocaleString('tr-TR')} kg`}
            </button>
          ))}
        </div>
        <p className="mt-2 font-mono text-[9px] leading-relaxed text-mut2">
          CAS/TEM elektronik terazi: tartımı tuşlayıp Enter'a basın — ağırlık otomatik okunur.
        </p>
      </div>

      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[12px] font-semibold text-mut">Manuel Ağırlık Ayarı:</span>
          <span className="font-mono text-[12px] font-bold text-blue tabular-nums">{grTxt}</span>
        </div>
        <input
          type="range"
          min={0}
          max={5}
          step={0.01}
          value={w}
          onChange={(e) => {
            setW(Number(e.target.value));
            setSrc('manuel');
          }}
          className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-line2 accent-[var(--color-amber)]"
        />
      </div>

      <div className="mt-3 flex items-center justify-between rounded-xl border border-line bg-ink/40 px-4 py-3">
        <span className="text-[12.5px] text-mut">Hesaplanan Tutar:</span>
        <span className="font-mono text-xl font-bold text-mint tabular-nums">{fmt(total)}</span>
      </div>

      <div className="mt-3.5 grid grid-cols-2 gap-2">
        <button
          onClick={onClose}
          className="rounded-xl border border-line2 bg-ink/50 px-3 py-3 text-[13px] font-semibold transition-colors hover:bg-panel3"
        >
          İptal
        </button>
        <button
          onClick={() => w > 0 && onConfirm(w)}
          disabled={w <= 0}
          className="rounded-xl bg-blue px-3 py-3 text-[13px] font-bold text-[#04121f] transition-all hover:brightness-110 disabled:pointer-events-none disabled:opacity-40"
        >
          Tartımı Onayla
        </button>
      </div>
    </Modal>
  );
}

/* ---------- cart panel ---------- */

const CART_W_KEY = 'mosbarkod_cartW';
const cartWInit = () => {
  try {
    const v = Number(localStorage.getItem(CART_W_KEY));
    return v >= 280 && v <= 640 ? v : 380;
  } catch {
    return 380;
  }
};

function useIsMobile() {
  const [m, setM] = useState(() => window.matchMedia('(max-width: 767px)').matches);
  useEffect(() => {
    const q = window.matchMedia('(max-width: 767px)');
    const h = () => setM(q.matches);
    q.addEventListener('change', h);
    return () => q.removeEventListener('change', h);
  }, []);
  return m;
}

function CartPanel(props: PosProps & { handle: React.ReactNode; fullWidth?: boolean; onOpenCfd: () => void }) {
  const { t } = useLocale();
  const { cart, register, priceMode, setPriceMode, discount, setDiscount, allowNeg, setAllowNeg } = props;
  const subtotal = round2(cart.reduce((s, l) => s + lineNet(l), 0));
  const discAmt = round2((subtotal * discount) / 100);
  const total = round2(subtotal - discAmt);

  /* panel genişliği — sağ kenardan sürükle, çift tıkla sıfırla */
  const [w, setW] = useState(cartWInit);
  const [dragging, setDragging] = useState(false);

  const startDrag = (e: React.PointerEvent) => {
    e.preventDefault();
    const sx = e.clientX;
    const sw = w;
    let cw = sw;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
    const mv = (ev: PointerEvent) => {
      cw = Math.round(Math.min(640, Math.max(280, sw + (ev.clientX - sx))));
      setW(cw);
    };
    const up = () => {
      window.removeEventListener('pointermove', mv);
      window.removeEventListener('pointerup', up);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      setDragging(false);
      try {
        localStorage.setItem(CART_W_KEY, String(cw));
      } catch {
        /* yoksay */
      }
    };
    setDragging(true);
    window.addEventListener('pointermove', mv);
    window.addEventListener('pointerup', up);
  };

  return (
    <section
      className={cn('relative flex shrink-0 flex-col rounded-xl border border-line bg-panel', dragging && 'border-amber/50')}
      style={{ width: props.fullWidth ? '100%' : w }}
    >
      <div
        onPointerDown={startDrag}
        onDoubleClick={() => {
          setW(380);
          try {
            localStorage.setItem(CART_W_KEY, '380');
          } catch {
            /* yoksay */
          }
        }}
        title="Genişlik için sürükle · çift tıkla sıfırla"
        className="absolute -right-1.5 top-0 z-20 flex h-full w-3 cursor-col-resize items-center justify-center"
      >
        <div
          className={cn(
            'h-14 w-1.5 rounded-full transition-colors',
            dragging ? 'bg-amber' : 'bg-line2 hover:bg-amber/70'
          )}
        />
      </div>
      <div className="flex items-center gap-2 border-b border-line px-3.5 py-3">
        <Ic n="cart" c="h-5 w-5 text-amber" />
        <h2 className="font-mono text-[13px] font-bold tracking-wide">{t('pos.cartTitle', { n: register })}</h2>
        <div className="ml-auto flex items-center gap-1.5">
          <button
            onClick={props.onOpenCfd}
            title="Müşteri Bilgi Ekranını Aç (2. Ekran / CFD)"
            className="flex items-center gap-1 rounded-md border border-blue/40 bg-blue/10 px-2 py-1 font-mono text-[10px] font-semibold text-blue transition-colors hover:bg-blue/20"
          >
            <Ic n="monitor" c="h-3 w-3" />
            <span className="hidden sm:inline">2. EKRAN</span>
          </button>
          {props.handle}
          <button
            onClick={props.clearCart}
            disabled={cart.length === 0}
            className="flex items-center gap-1 rounded-md border border-red/30 bg-red/5 px-2 py-1 font-mono text-[10px] font-semibold text-red transition-colors hover:bg-red/15 disabled:pointer-events-none disabled:opacity-30"
          >
            <Ic n="reset" c="h-3 w-3" /> İptal Et
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-line px-3.5 py-2.5">
        <span className="font-mono text-[10px] uppercase tracking-widest text-mut2">Fiyat Modu:</span>
        <div className="flex flex-1 gap-1">
          {PRICE_MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => setPriceMode(m.id)}
              className={cn(
                'flex-1 rounded-md border px-1 py-1.5 text-[10.5px] font-semibold transition-colors',
                priceMode === m.id
                  ? 'border-amber bg-amber/15 text-amber2'
                  : 'border-line2 bg-ink/40 text-mut hover:text-txt'
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {cart.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-line2 px-5 text-center">
            <div className="rounded-xl border border-line2 bg-panel3 p-4 text-mut2">
              <Ic n="box" c="h-9 w-9" />
            </div>
            <div className="text-[13px] font-medium text-mut">{t('pos.emptyCart')}</div>
            <div className="rounded-md border border-line bg-ink/60 px-3 py-1.5 font-mono text-[10px] text-mut2">
              {t('pos.integCompatible')}
            </div>
          </div>
        ) : (
          cart.map((l) => (
            <CartRow
              key={l.id}
              l={l}
              product={props.products.find((x) => x.id === l.productId)}
              onInc={() => props.incLine(l.id)}
              onDec={() => props.decLine(l.id)}
              onRemove={() => props.removeLine(l.id)}
              onLevel={(lv) => props.setLineLevel(l.id, lv)}
              onDiscount={(p) => props.setLineDiscount(l.id, p)}
              onPriceChange={(price) => props.setLinePrice(l.id, price)}
              isAdmin={props.isAdmin}
              toast={props.toast}
              ui={props.settings.ui}
            />
          ))
        )}
      </div>

      <div className="space-y-2 border-t border-line p-3.5">
        <div className="flex items-center justify-between text-[12px]">
          <span className="text-mut">{t('pos.subtotal')}</span>
          <span className="font-mono font-bold tabular-nums">{fmt(subtotal)}</span>
        </div>
        <div className="flex items-center justify-between text-[12px]">
          <span className="flex items-center gap-1.5 font-mono font-semibold text-amber2">
            <Ic n="percent" c="h-3.5 w-3.5" /> {t('pos.discount')}
          </span>
          <span className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={100}
              value={discount === 0 ? '' : discount}
              placeholder="0"
              onChange={(e) => setDiscount(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
              className="w-14 rounded-md border border-line2 bg-ink/70 px-2 py-1 text-right font-mono text-[12px] font-bold text-amber2 outline-none focus:border-amber/70"
            />
            <span className="w-[74px] text-right font-mono font-bold text-red tabular-nums">-{fmt(discAmt)}</span>
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-mint/25 bg-mint/5 p-2.5">
          <div className="min-w-0 flex-1">
            <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-mut">{t('pos.total')}</div>
            <div className="font-mono text-[22px] font-bold leading-tight text-mint tabular-nums">{fmt(total)}</div>
          </div>
          <Btn v="mint" onClick={props.onPay} disabled={cart.length === 0} className="gap-2 px-4 py-3">
            <Ic n="card" c="h-4 w-4" /> {t('pos.payBtn')} <Ic n="arrowR" c="h-4 w-4" />
          </Btn>
        </div>
        <div className="flex items-center justify-between pt-0.5">
          <label className="flex cursor-pointer items-center gap-2 text-[11px] text-mut">
            <button
              role="checkbox"
              aria-checked={allowNeg}
              onClick={() => setAllowNeg(!allowNeg)}
              className={cn(
                'flex h-4 w-4 items-center justify-center rounded border transition-colors',
                allowNeg ? 'border-amber bg-amber text-[#1a1102]' : 'border-line2 bg-ink'
              )}
            >
              {allowNeg && <Ic n="check" c="h-3 w-3" />}
            </button>
            {t('pos.allowNegative')}
          </label>
          <span className="font-mono text-[9.5px] tracking-wider text-mut2">MOSBARKOD v{APP_VERSION}</span>
        </div>
      </div>
    </section>
  );
}

/* ---------- product browser ---------- */

function ProductBrowser(props: PosProps & { handle: React.ReactNode; onOpenWeight: (p: Product) => void; onOpenAiVision: () => void }) {
  const { products, priceMode, settings, scanFx } = props;
  const [code, setCode] = useState('');
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState('Hepsi');
  const [flash, setFlash] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);

  useEffect(() => {
    if (!scanFx) return;
    setCode(scanFx.code);
    setFlash(true);
    const t = setTimeout(() => {
      setFlash(false);
      setCode('');
    }, 900);
    return () => clearTimeout(t);
  }, [scanFx]);

  const suggestions = useMemo(() => {
    const agg = new Map<string, number>();
    for (const s of props.sales) for (const it of s.items) agg.set(it.name, (agg.get(it.name) ?? 0) + it.qty * it.unitPrice);
    return [...agg.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name]) => products.find((p) => p.name === name))
      .filter((p): p is Product => Boolean(p));
  }, [props.sales, products]);

  const list = products.filter(
    (p) =>
      (cat === 'Hepsi' || p.category === cat) &&
      (query.trim() === '' ||
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.category.toLowerCase().includes(query.toLowerCase()) ||
        p.barcode.includes(query))
  );

  const okut = () => {
    if (!code.trim()) return;
    const ok = props.submitBarcode(code);
    if (ok) setCode('');
  };

  const pick = (p: Product) =>
    p.unit === 'kg' || p.unit === 'lt' || p.weighed ? props.onOpenWeight(p) : props.addToCart(p);

  return (
    <section className="flex h-full min-h-0 min-w-0 flex-1 flex-col rounded-xl border border-line bg-panel">
      <div className="flex shrink-0 flex-col gap-2 border-b border-line p-2.5 sm:flex-row sm:p-3">
        <div className="flex w-full shrink-0 gap-1.5 sm:w-[330px]">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-amber">
              <Ic n="barcode" c="h-4 w-4" />
            </span>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && okut()}
              placeholder="Barkod"
              className={cn(
                'w-full rounded-lg border bg-ink/70 py-2.5 pl-8 pr-2 font-mono text-[13px] tracking-[0.12em] text-txt outline-none transition-colors placeholder:text-mut2 focus:border-amber/70',
                flash ? 'anim-scan border-amber' : 'border-amber/40'
              )}
            />
          </div>
          <Btn v="primary" onClick={okut} className="px-3.5">
            OKUT
          </Btn>
          <button
            onClick={() => setCameraOpen(true)}
            title="Telefon kamerası ile barkod okut"
            className="flex shrink-0 items-center justify-center rounded-lg border border-blue/50 bg-blue/10 px-3 text-blue transition-colors hover:bg-blue/20"
          >
            <Ic n="camera" c="h-5 w-5" />
          </button>
          <button
            onClick={props.onOpenAiVision}
            title="Yapay Zekâ Görsel Ürün Tanıma (AI Vision Checkout)"
            className="flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-indigo-500/50 bg-indigo-500/15 px-3 text-indigo-300 transition-colors hover:bg-indigo-500/25 shadow-[0_0_12px_rgba(99,102,241,0.25)]"
          >
            <Ic n="sparkles" c="h-4.5 w-4.5 text-indigo-400 animate-pulse" />
            <span className="hidden xl:inline font-mono text-xs font-bold">AI TANI</span>
          </button>
        </div>
        <div className="relative min-w-0 flex-1">
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-mut2">
            <Ic n="search" c="h-4 w-4" />
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ürün Adı veya Kategori"
            className="w-full rounded-lg border border-line2 bg-ink/70 py-2.5 pl-8 pr-3 text-[13px] outline-none transition-colors placeholder:text-mut2 focus:border-amber/70"
          />
        </div>
        {props.handle}
      </div>

      <div className="flex shrink-0 gap-1.5 overflow-x-auto border-b border-line px-3 py-2.5 [scrollbar-width:thin]">
        <button
          onClick={() => setCat('Hepsi')}
          className={cn(
            'shrink-0 rounded-lg border px-3 py-1.5 text-[11.5px] font-semibold transition-all',
            cat === 'Hepsi' ? 'border-white bg-white text-[#14171c]' : 'border-line2 bg-panel2 text-mut hover:text-txt'
          )}
        >
          Hepsi
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c.name}
            onClick={() => setCat(c.name)}
            className={cn(
              'shrink-0 rounded-lg border px-3 py-1.5 text-[11.5px] font-semibold transition-all',
              c.chip,
              cat === c.name ? 'ring-2 ring-white/80' : 'opacity-75 hover:opacity-100'
            )}
          >
            {c.name}
          </button>
        ))}
      </div>

      {suggestions.length > 0 && (
        <div className="flex shrink-0 items-center gap-2 overflow-x-auto border-b border-line bg-gradient-to-r from-amber/8 to-transparent px-3 py-2">
          <span className="flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-widest text-amber2">
            <Ic n="sparkles" c="h-3.5 w-3.5" /> Akıllı Öneri
          </span>
          <span className="text-[10.5px] text-mut2">en çok satan:</span>
          {suggestions.map((p) => (
            <button
              key={p.id}
              onClick={() => pick(p)}
              title="Sepete ekle"
              className="max-w-[150px] truncate rounded-md border border-amber/30 bg-amber/10 px-2 py-0.5 text-[11px] font-medium text-amber2 transition-colors hover:bg-amber/20"
            >
              + {p.name}
            </button>
          ))}
        </div>
      )}

      <div
        className="grid min-h-0 flex-1 auto-rows-min grid-cols-2 content-start gap-2.5 overflow-y-auto overscroll-contain p-3 sm:grid-cols-[repeat(auto-fill,minmax(150px,1fr))]"
        style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
      >
        {list.map((p) => {
          const c = catOf(p.category);
          const price = priceOf(p, priceMode, settings);
          const isCrit = p.stock >= 0 && p.stock <= p.critical;
          const isNeg = p.stock < 0;
          const ui = settings.ui;
          const ovRaw = (ui.overlayText || '')
            .replace('{AD}', p.name)
            .replace('{FIYAT}', fmt(price));
          return (
            <button
              key={p.id}
              onClick={() => pick(p)}
              className="group overflow-hidden rounded-xl border border-line bg-panel2/60 text-left transition-all hover:-translate-y-0.5 hover:border-amber/70 hover:shadow-[0_6px_18px_rgba(0,0,0,0.35)]"
            >
              {ui.fullCardImage ? (
                <div className="relative overflow-hidden" style={{ height: ui.productImgH + 58 }}>
                  <ImgOrTile p={p} dot={c.dot} scale={ui.productImgScale} fit={ui.productImgFit} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
                  {ui.overlayEnabled && ovRaw.trim() !== '' && (
                    <span
                      className={cn(
                        'absolute top-1.5 max-w-[92%] truncate rounded-md px-1.5 py-0.5 font-bold leading-tight',
                        ui.overlayPos === 'right'
                          ? 'right-1.5'
                          : ui.overlayPos === 'center'
                            ? 'left-1/2 -translate-x-1/2 text-center'
                            : 'left-1.5'
                      )}
                      style={{
                        fontSize: ui.overlaySize,
                        color: ui.overlayColor,
                        background: ui.overlayBgTransparent ? 'rgba(0,0,0,0.5)' : ui.overlayBg,
                        textShadow: ui.overlayBgTransparent ? '0 1px 2px rgba(0,0,0,0.9)' : undefined,
                      }}
                    >
                      {ovRaw}
                    </span>
                  )}
                  {(isCrit || isNeg) && (
                    <span
                      className={cn(
                        'absolute right-1.5 top-1.5 rounded bg-[#d92d20] px-1.5 py-0.5 font-mono text-[9px] font-bold text-white shadow',
                        isNeg && 'bg-[#7f1d1d]'
                      )}
                    >
                      {isNeg ? 'EKSİ STOK' : `KRİTİK: ${fmtN(p.stock)}`}
                    </span>
                  )}
                  <div className="absolute inset-x-0 bottom-0 p-2.5">
                    <div className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-white/70">{p.category}</div>
                    {ui.showNameOnImage && (
                      <div
                        className="mt-0.5 truncate leading-tight drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]"
                        style={{ fontSize: ui.nameSize, fontWeight: ui.nameWeight, color: ui.nameColor || undefined }}
                      >
                        {p.name}
                      </div>
                    )}
                    <div className="mt-2 flex items-center justify-between gap-1 border-t border-white/15 pt-1.5">
                      <span
                        className={cn(
                          'font-mono text-[10px] tabular-nums drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]',
                          isNeg ? 'font-bold text-red' : isCrit ? 'font-bold text-amber2' : ''
                        )}
                        style={isNeg || isCrit ? undefined : { color: ui.stockColor || undefined }}
                      >
                        Stok: {fmtN(p.stock)}
                      </span>
                      {ui.showPriceOnImage && (
                        <span
                          className="font-mono text-[12px] font-bold tabular-nums drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]"
                          style={{ color: ui.priceColor || undefined }}
                        >
                          {priceMode === 'taksit' ? `3x ${fmt(round2(price / 3))}` : fmt(price)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="relative overflow-hidden bg-panel3" style={{ height: ui.productImgH }}>
                    <ImgOrTile p={p} dot={c.dot} scale={ui.productImgScale} fit={ui.productImgFit} />
                    {ui.overlayEnabled && ovRaw.trim() !== '' && (
                      <span
                        className={cn(
                          'absolute bottom-1.5 max-w-[95%] truncate rounded-md px-1.5 py-0.5 font-bold leading-tight',
                          ui.overlayPos === 'right'
                            ? 'right-1.5'
                            : ui.overlayPos === 'center'
                              ? 'left-1/2 -translate-x-1/2 text-center'
                              : 'left-1.5'
                        )}
                        style={{
                          fontSize: ui.overlaySize,
                          color: ui.overlayColor,
                          background: ui.overlayBgTransparent ? 'rgba(0,0,0,0.5)' : ui.overlayBg,
                          textShadow: ui.overlayBgTransparent ? '0 1px 2px rgba(0,0,0,0.9)' : undefined,
                        }}
                      >
                        {ovRaw}
                      </span>
                    )}
                    {(isCrit || isNeg) && (
                      <span
                        className={cn(
                          'absolute right-1.5 top-1.5 rounded bg-[#d92d20] px-1.5 py-0.5 font-mono text-[9px] font-bold text-white shadow',
                          isNeg && 'bg-[#7f1d1d]'
                        )}
                      >
                        {isNeg ? 'EKSİ STOK' : `KRİTİK: ${fmtN(p.stock)}`}
                      </span>
                    )}
                  </div>
                  <div className="p-2.5">
                    <div className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-mut2">{p.category}</div>
                    <div
                      className="mt-0.5 truncate leading-tight"
                      style={{ fontSize: ui.nameSize, fontWeight: ui.nameWeight, color: ui.nameColor || undefined }}
                    >
                      {p.name}
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-1 border-t border-line pt-1.5">
                      <span
                        className={cn(
                          'font-mono text-[10px] tabular-nums',
                          isNeg ? 'font-bold text-red' : isCrit ? 'font-bold text-amber2' : ''
                        )}
                        style={isNeg || isCrit ? undefined : { color: ui.stockColor || undefined }}
                      >
                        Stok: {fmtN(p.stock)}
                      </span>
                      <span
                        className="font-mono text-[12px] font-bold tabular-nums"
                        style={{ color: ui.priceColor || undefined }}
                      >
                        {priceMode === 'taksit' ? `3x ${fmt(round2(price / 3))}` : fmt(price)}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </button>
          );
        })}
        {list.length === 0 && (
          <div className="col-span-full py-10 text-center font-mono text-[12px] text-mut2">
            Filtreye uyan ürün bulunamadı.
          </div>
        )}
      </div>
      {cameraOpen && (
        <CameraScanner
          onDetected={(barcode) => {
            setCode(barcode);
            return props.submitBarcode(barcode);
          }}
          onClose={() => setCameraOpen(false)}
        />
      )}
    </section>
  );
}

/* ---------- extras panel (muhtelif + sanal barkod) ---------- */

function ExtrasPanel(
  props: PosProps & { handle: React.ReactNode; side: 'left' | 'right'; onOpenWeight: (p: Product) => void; mobile?: boolean }
) {
  const [mName, setMName] = useState('');
  const [mPrice, setMPrice] = useState('');
  const [selId, setSelId] = useState('');
  const [hidden, setHidden] = useState(() => !props.mobile);
  const [mClosed, setMClosed] = useState(false);
  const [bClosed, setBClosed] = useState(false);

  const quick = props.products.filter((p) => p.quick).slice(0, 8);
  const pickQ = (p: Product) =>
    p.unit === 'kg' || p.unit === 'lt' || p.weighed ? props.onOpenWeight(p) : props.addToCart(p);

  const addMuh = () => {
    const price = Number(mPrice.replace(',', '.'));
    if (!mName.trim() || !price || price <= 0) return;
    props.addCustom(mName.trim(), price);
    setMName('');
    setMPrice('');
  };

  if (hidden) {
    return (
      <aside className="hidden w-[42px] shrink-0 flex-col items-center overflow-hidden rounded-xl border border-line bg-panel xl:flex">
        <button
          onClick={() => setHidden(false)}
          className="flex h-full min-h-[180px] w-full flex-col items-center justify-center gap-2 text-mut transition-colors hover:bg-panel2 hover:text-amber2"
          title="Mühtelif / Sanal Barkod panelini aç"
        >
          <Ic n={props.side === 'left' ? 'chevR' : 'chevL'} c="h-4 w-4" />
          <span className="[writing-mode:vertical-rl] rotate-180 font-mono text-[10px] font-bold uppercase tracking-[0.14em]">
            Kısayol Paneli
          </span>
          <Ic n="barcode" c="h-4 w-4" />
        </button>
      </aside>
    );
  }

  return (
    <aside className={cn('w-full shrink-0 flex-col gap-3 overflow-y-auto', props.mobile ? 'flex' : 'hidden xl:flex w-[268px]')}>
      {quick.length > 0 && (
        <section className="rounded-xl border border-line bg-panel p-3">
          <div className="flex items-center gap-1.5">
            <Ic n="star" c="h-4 w-4 text-amber" />
            <h3 className="font-mono text-[11px] font-bold uppercase tracking-widest text-amber2">Kısayollar</h3>
          </div>
          <p className="mt-1 text-[10px] leading-relaxed text-mut2">
            Ürün kartındaki "Ana Ekranda Kısayol Göster" ile işaretlenen ürünler — tek tıkla sat.
          </p>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            {quick.map((p) => (
              <button
                key={p.id}
                onClick={() => pickQ(p)}
                className="group flex flex-col overflow-hidden rounded-lg border border-line bg-panel2/70 transition-all hover:-translate-y-0.5 hover:border-amber/70"
                title={`${p.name} — ${fmt(priceOf(p, props.priceMode, props.settings))}`}
              >
                <div className="h-10 w-full overflow-hidden bg-panel3">
                  <RowImg src={p.image ?? ''} dot={catOf(p.category).dot} name={p.name} />
                </div>
                <span
                  className="w-full truncate px-1.5 py-1 text-[10px] opacity-80 group-hover:opacity-100"
                  style={{ fontWeight: props.settings.ui.nameWeight, color: props.settings.ui.nameColor || undefined }}
                >
                  {p.name}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-xl border border-line bg-panel p-3">
        <div className="flex items-center gap-1.5">
          <Ic n="plus" c="h-4 w-4 text-amber" />
          <h3 className="font-mono text-[11px] font-bold uppercase tracking-widest text-amber2">Mühtelif Ürün Satışı</h3>
          <span className="ml-auto flex items-center gap-1">
            {props.handle}
            <button
              onClick={() => setMClosed(!mClosed)}
              className="rounded border border-line2 bg-ink/50 p-1 text-mut transition-colors hover:text-amber2"
              title={mClosed ? 'Kutuyu genişlet' : 'Kutuyu daralt'}
            >
              <Ic n={mClosed ? 'chevD' : 'chevL'} c={cn('h-3.5 w-3.5', !mClosed && 'rotate-90')} />
            </button>
            <button
              onClick={() => setHidden(true)}
              className="rounded border border-line2 bg-ink/50 p-1 text-mut transition-colors hover:border-red/40 hover:text-red"
              title={props.side === 'left' ? 'Sola gizle' : 'Sağa gizle'}
            >
              <Ic n={props.side === 'left' ? 'chevL' : 'chevR'} c="h-3.5 w-3.5" />
            </button>
          </span>
        </div>
        <div className={cn('mt-2.5 space-y-2 overflow-hidden transition-all', mClosed && 'mt-0 max-h-0 opacity-0')}>
          <Inp placeholder="Mühtelif Ürün" value={mName} onChange={(e) => setMName(e.target.value)} />
          <div className="relative">
            <Inp
              type="number"
              placeholder="Fiyat ₺"
              value={mPrice}
              onChange={(e) => setMPrice(e.target.value)}
              className="pr-16"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[11px] text-mut2">
              ₺ / adet
            </span>
          </div>
          <Btn v="primary" onClick={addMuh} className="w-full">
            <Ic n="plus" c="h-4 w-4" /> SEPETE EKLE
          </Btn>
        </div>
      </section>

      <section className="rounded-xl border border-line bg-panel p-3">
        <div className="flex items-center gap-1.5">
          <Ic n="barcode" c="h-4 w-4 text-amber" />
          <h3 className="font-mono text-[11px] font-bold uppercase tracking-widest text-amber2">Sanal Barkod Okuyucu</h3>
          <button
            onClick={() => setBClosed(!bClosed)}
            className="ml-auto rounded border border-line2 bg-ink/50 p-1 text-mut transition-colors hover:text-amber2"
            title={bClosed ? 'Kutuyu genişlet' : 'Kutuyu daralt'}
          >
            <Ic n={bClosed ? 'chevD' : 'chevL'} c={cn('h-3.5 w-3.5', !bClosed && 'rotate-90')} />
          </button>
        </div>
        <div className={cn('overflow-hidden transition-all', bClosed && 'max-h-0 opacity-0')}>
          <p className="mt-1 text-[10px] leading-relaxed text-mut2">
            Barkod okuyucu simülasyonu — ürün seçip sinyal gönderin, sepete otomatik eklensin.
          </p>
          <div className="mt-2.5 space-y-2">
            <select
              value={selId}
              onChange={(e) => setSelId(e.target.value)}
              className="w-full appearance-none rounded-lg border border-line2 bg-ink/70 px-3 py-2 text-[13px] text-txt outline-none focus:border-amber/70"
            >
              <option value="">Barkodlu ürün seç…</option>
              {props.products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <Btn
              v="ghost"
              className="w-full border-amber/50 text-amber2"
              onClick={() => {
                const p = props.products.find((x) => x.id === selId);
                if (p) props.fireScan(p);
              }}
              disabled={!selId}
            >
              <Ic n="barcode" c="h-4 w-4" /> Okutma Sinyali Gönder
            </Btn>
          </div>
        </div>
      </section>
    </aside>
  );
}

/* ---------- main POS screen ---------- */

type PanelId = 'cart' | 'browser' | 'extras';

export default function Pos(props: PosProps) {
  const [order, setOrder] = useState<PanelId[]>(['cart', 'browser', 'extras']);
  const [wSel, setWSel] = useState<Product | null>(null);
  const [aiVisionOpen, setAiVisionOpen] = useState(false);
  const [cfdOpen, setCfdOpen] = useState(false);
  const isMobile = useIsMobile();
  const [mTab, setMTab] = useState<PanelId>('browser');

  // Real-time broadcast to 2nd Customer Facing Display (CFD)
  useEffect(() => {
    const subtotal = round2(props.cart.reduce((s, l) => s + lineNet(l), 0));
    const discAmt = round2((subtotal * props.discount) / 100);
    const total = round2(subtotal - discAmt);
    broadcastToCfd({
      type: 'cart_update',
      register: props.register,
      cashierName: props.isAdmin ? 'Yönetici' : 'Kasiyer',
      storeName: props.settings.storeName,
      cart: props.cart,
      subtotal,
      discountAmt: discAmt,
      total,
      currencyCode: props.settings.currency?.active,
      promoText: props.settings.cfd?.promoText,
      showQr: props.settings.cfd?.showQr,
      qrData: props.settings.cfd?.qrData,
    });
  }, [props.cart, props.discount, props.settings, props.register, props.isAdmin]);

  const handleOpenCfdWindow = () => {
    // Try opening popup window for dual-monitor or open modal
    const popup = window.open('', 'mosbarkod_cfd_window', 'width=1100,height=720,menubar=no,toolbar=no,location=no');
    if (!popup || popup.closed) {
      setCfdOpen(true);
    } else {
      popup.document.title = 'MOSBARKODYAZILIM — Müşteri Bilgi Ekranı';
      popup.document.body.style.margin = '0';
      popup.document.body.style.background = '#070a0e';
      setCfdOpen(true);
    }
  };

  const handleAiProductSelect = (p: Product) => {
    if (p.unit === 'kg' || p.unit === 'lt' || p.weighed) {
      setWSel(p);
    } else {
      props.addToCart(p);
    }
  };

  const move = (id: PanelId, dir: -1 | 1) => {
    setOrder((o) => {
      const i = o.indexOf(id);
      const j = i + dir;
      if (j < 0 || j >= o.length) return o;
      const next = [...o];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  const render = (id: PanelId, opts?: { mobile?: boolean }) => {
    const i = order.indexOf(id);
    const handle = opts?.mobile ? null : (
      <MoveHandle
        canLeft={i > 0}
        canRight={i < order.length - 1}
        onLeft={() => move(id, -1)}
        onRight={() => move(id, 1)}
      />
    );
    if (id === 'cart') return <CartPanel key="cart" {...props} handle={handle!} fullWidth={opts?.mobile} onOpenCfd={handleOpenCfdWindow} />;
    if (id === 'browser')
      return <ProductBrowser key="browser" {...props} handle={handle!} onOpenWeight={setWSel} onOpenAiVision={() => setAiVisionOpen(true)} />;
    return (
      <ExtrasPanel key="extras" {...props} handle={handle!} side={i === 0 ? 'left' : 'right'} onOpenWeight={setWSel} mobile={opts?.mobile} />
    );
  };

  const cartCount = props.cart.length;

  /* Ortak modallar: hem mobil hem masaüstü dalında render edilir.
     (Daha önce AI Vision ve CFD yalnızca masaüstünde render ediliyordu;
     mobilde butonlara basınca hiçbir şey açılmıyordu.) */
  const sharedModals = (
    <>
      {wSel && (
        <WeightModal
          p={wSel}
          price={priceOf(wSel, props.priceMode, props.settings)}
          onClose={() => setWSel(null)}
          onConfirm={(wt) => {
            props.addWeight(wSel, wt);
            setWSel(null);
          }}
        />
      )}

      {/* AI Vision Recognition Modal */}
      {aiVisionOpen && (
        <AiVisionModal
          products={props.products}
          onSelectProduct={handleAiProductSelect}
          onClose={() => setAiVisionOpen(false)}
        />
      )}

      {/* Customer Facing Display Modal / 2nd Screen Preview */}
      {cfdOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-3 sm:p-6 backdrop-blur-md">
          <div className="flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-line shadow-2xl">
            <CustomerDisplay onClose={() => setCfdOpen(false)} embedded={true} />
          </div>
        </div>
      )}
    </>
  );

  if (isMobile) {
    const tabs: { id: PanelId; label: string; icon: string }[] = [
      { id: 'browser', label: 'Ürünler', icon: 'box' },
      { id: 'cart', label: cartCount > 0 ? `Kasa (${cartCount})` : 'Kasa', icon: 'cart' },
      { id: 'extras', label: 'Yan Panel', icon: 'plus' },
    ];
    return (
      <div className="flex h-full flex-col gap-2">
        <div className="flex shrink-0 gap-1 rounded-xl border border-line bg-panel p-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setMTab(t.id)}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[12px] font-semibold transition-colors',
                mTab === t.id ? 'bg-amber text-[#1a1102]' : 'text-mut active:bg-panel3'
              )}
            >
              <Ic n={t.icon} c="h-4 w-4" />
              {t.label}
            </button>
          ))}
        </div>
        <div className="min-h-0 flex-1">{render(mTab, { mobile: true })}</div>
        {/* Tartı + AI Vision + müşteri ekranı: mobil ve masaüstünde ortak (drift önlenir) */}
        {sharedModals}
      </div>
    );
  }

  return (
    <div className="flex h-full gap-3">
      {order.map((id) => render(id))}
      {sharedModals}
    </div>
  );
}
