import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { cn } from '../utils/cn';
import { Ic } from '../icons';
import { fmt, type CartLine } from '../data';
import { useLocale } from '../locales/i18n';

export interface CfdPayload {
  type: 'cart_update' | 'payment_stage' | 'sale_completed' | 'clear';
  register: number;
  cashierName: string;
  storeName: string;
  cart: CartLine[];
  subtotal: number;
  discountAmt: number;
  total: number;
  currencyCode?: string;
  promoText?: string;
  showQr?: boolean;
  qrData?: string;
  payment?: {
    received: number;
    change: number;
    method: string;
  };
}

const CFD_STORAGE_KEY = 'mosbarkod_cfd_live_state';
const CHANNEL_NAME = 'mosbarkod_cfd_channel';

/** Send broadcast from POS cashier terminal to CFD customer screen */
export function broadcastToCfd(payload: CfdPayload) {
  try {
    localStorage.setItem(CFD_STORAGE_KEY, JSON.stringify({ ...payload, timestamp: Date.now() }));
    if ('BroadcastChannel' in window) {
      const bc = new BroadcastChannel(CHANNEL_NAME);
      bc.postMessage(payload);
      bc.close();
    }
  } catch {
    /* ignore */
  }
}

export function CustomerDisplay({
  onClose,
  embedded = false,
}: {
  onClose?: () => void;
  embedded?: boolean;
}) {
  const { t } = useLocale();
  const [data, setData] = useState<CfdPayload>(() => {
    try {
      const raw = localStorage.getItem(CFD_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {
      /* ignore */
    }
    return {
      type: 'cart_update',
      register: 1,
      cashierName: 'Admin',
      storeName: 'MOSBARKODYAZILIM POS',
      cart: [],
      subtotal: 0,
      discountAmt: 0,
      total: 0,
      promoText: 'MOSBARKODYAZILIM — Hoş Geldiniz! Kaliteli Hizmet, Güvenli Alışveriş.',
      showQr: true,
      qrData: 'https://wa.me/905554066143',
    };
  });

  const [timeStr, setTimeStr] = useState(() => new Date().toLocaleTimeString('tr-TR'));

  useEffect(() => {
    const timer = setInterval(() => setTimeStr(new Date().toLocaleTimeString('tr-TR')), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let bc: BroadcastChannel | null = null;
    if ('BroadcastChannel' in window) {
      bc = new BroadcastChannel(CHANNEL_NAME);
      bc.onmessage = (ev) => {
        if (ev.data) setData(ev.data);
      };
    }

    const handleStorage = (ev: StorageEvent) => {
      if (ev.key === CFD_STORAGE_KEY && ev.newValue) {
        try {
          setData(JSON.parse(ev.newValue));
        } catch {
          /* ignore */
        }
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => {
      bc?.close();
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const isCompleted = data.type === 'sale_completed';
  const cartItems = data.cart || [];
  const itemCount = cartItems.reduce((s, i) => s + i.qty, 0);

  return (
    <div
      className={cn(
        'flex flex-col bg-[#070a0e] font-sans text-txt select-none',
        embedded ? 'h-full w-full rounded-2xl overflow-hidden border border-line' : 'fixed inset-0 z-[100] h-[100dvh] w-screen'
      )}
    >
      {/* Top Header Bar */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-line bg-[#0d131a] px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber/50 bg-gradient-to-br from-amber to-amber2 text-[#180c02] shadow-[0_0_20px_rgba(245,158,11,0.35)]">
            <Ic n="flame" c="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-mono text-base font-bold tracking-widest text-txt">{data.storeName || 'MOSBARKODYAZILIM'}</h1>
            <p className="font-mono text-[10px] tracking-[0.2em] text-mut2">MÜŞTERİ BİLGİ EKRANI · CUSTOMER DISPLAY</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 rounded-lg border border-line2 bg-ink/60 px-3 py-1.5 font-mono text-xs text-mut">
            <span className="h-2 w-2 rounded-full bg-mint animate-pulse" />
            <span>Kasa {data.register || 1}</span>
            <span className="text-line2">|</span>
            <span className="text-txt font-semibold">{data.cashierName || 'Kasiyer'}</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 rounded-lg border border-line2 bg-ink/60 px-3 py-1.5 font-mono text-xs text-amber2">
            <Ic n="clock" c="h-3.5 w-3.5" />
            <span className="tabular-nums font-bold">{timeStr}</span>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="rounded-lg border border-line2 p-2 text-mut hover:border-red/50 hover:text-red transition-colors"
              title="Kapat"
            >
              <Ic n="x" c="h-4 w-4" />
            </button>
          )}
        </div>
      </header>

      {/* Main Display Grid */}
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-12 gap-0">
        {/* Left Column: Cart items list (7 cols) */}
        <div className="flex flex-col border-b lg:border-b-0 lg:border-r border-line bg-[#0a0e14] lg:col-span-7 min-h-0">
          <div className="flex items-center justify-between border-b border-line bg-panel2/50 px-6 py-3">
            <div className="flex items-center gap-2">
              <Ic n="cart" c="h-4 w-4 text-amber" />
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-mut">
                Alışveriş Sepetiniz ({itemCount} {t('common.amount')})
              </span>
            </div>
            <span className="font-mono text-xs text-mut2">{cartItems.length} Kalem</span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2.5 [scrollbar-width:thin]">
            {cartItems.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center p-8 text-center">
                <div className="h-20 w-20 rounded-2xl border border-line2 bg-panel3 flex items-center justify-center text-mut2 mb-4">
                  <Ic n="cart" c="h-10 w-10" />
                </div>
                <h3 className="text-base font-bold text-txt">Hoş Geldiniz</h3>
                <p className="mt-1 text-xs text-mut max-w-sm">
                  Ürünleriniz kasiyer tarafından okutuldukça bu ekranda anlık olarak listelenecektir.
                </p>
                <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-mint/30 bg-mint/10 px-4 py-1.5 font-mono text-xs text-mint">
                  <span className="h-2 w-2 rounded-full bg-mint animate-ping" />
                  Kasa İşleme Hazır
                </div>
              </div>
            ) : (
              cartItems.map((item, idx) => {
                const itemTotal = item.unitPrice * item.qty * (1 - (item.lineDiscount || 0) / 100);
                return (
                  <div
                    key={item.id || idx}
                    className="anim-pop flex items-center gap-4 rounded-xl border border-line bg-[#111720] p-3.5 shadow-md hover:border-line2 transition-all"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-line2 bg-panel3 font-mono text-sm font-bold text-amber2">
                      {idx + 1}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold text-txt">{item.name}</div>
                      <div className="mt-0.5 flex items-center gap-3 font-mono text-xs text-mut2">
                        <span>
                          {fmt(item.unitPrice, data.currencyCode)} × {item.qty} {item.unit}
                        </span>
                        {item.lineDiscount > 0 && (
                          <span className="rounded bg-amber/15 px-1.5 py-0.2 text-[10px] font-bold text-amber2">
                            -%{item.lineDiscount} İskonto
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-mono text-base font-bold text-mint tabular-nums">
                        {fmt(itemTotal, data.currencyCode)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Grand Total, Stage, Payment QR, Promo (5 cols) */}
        <div className="flex flex-col justify-between bg-[#0e141c] lg:col-span-5 p-6 space-y-6">
          {/* Status Banner */}
          {isCompleted ? (
            <div className="rounded-2xl border-2 border-mint bg-mint/10 p-5 text-center anim-pop shadow-[0_0_30px_rgba(47,214,165,0.2)]">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-mint text-[#04211a] mb-2 shadow-lg">
                <Ic n="check" c="h-8 w-8" />
              </div>
              <h2 className="font-mono text-xl font-extrabold text-mint">ÖDEME TAMAMLANDI</h2>
              <p className="mt-1 text-xs text-mut">Bizi tercih ettiğiniz için teşekkür ederiz!</p>
              {data.payment && (
                <div className="mt-4 grid grid-cols-2 gap-2 border-t border-mint/20 pt-3 font-mono text-xs">
                  <div>
                    <span className="text-mut2 block text-[10px]">Ödenen:</span>
                    <span className="font-bold text-txt">{fmt(data.payment.received, data.currencyCode)}</span>
                  </div>
                  <div>
                    <span className="text-mut2 block text-[10px]">Para Üstü:</span>
                    <span className="font-bold text-amber2">{fmt(data.payment.change, data.currencyCode)}</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Active Cart Totals Box */
            <div className="rounded-2xl border border-line2 bg-panel p-5 shadow-xl space-y-3.5">
              <div className="flex justify-between items-center text-xs text-mut border-b border-line pb-2.5">
                <span>Ara Toplam (Subtotal):</span>
                <span className="font-mono text-sm font-bold text-txt tabular-nums">{fmt(data.subtotal || 0, data.currencyCode)}</span>
              </div>

              {(data.discountAmt || 0) > 0 && (
                <div className="flex justify-between items-center text-xs text-amber2 border-b border-line pb-2.5">
                  <span className="flex items-center gap-1">
                    <Ic n="percent" c="h-3.5 w-3.5" /> İskonto İndirimi:
                  </span>
                  <span className="font-mono text-sm font-bold tabular-nums">-{fmt(data.discountAmt || 0, data.currencyCode)}</span>
                </div>
              )}

              <div className="pt-1">
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-mut2 text-center">ÖDENECEK TOPLAM TUTAR</div>
                <div className="mt-1 flex items-center justify-center rounded-xl border border-mint/30 bg-mint/5 py-3 shadow-[0_0_24px_rgba(47,214,165,0.12)]">
                  <span className="font-mono text-4xl sm:text-5xl font-black text-mint tabular-nums tracking-tight">
                    {fmt(data.total || 0, data.currencyCode)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Payment QR Code & Promo Area */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center rounded-2xl border border-line bg-panel2/60 p-4">
            <div className="text-center sm:text-left space-y-1">
              <span className="inline-flex items-center gap-1 rounded bg-blue/15 px-2 py-0.5 font-mono text-[10px] font-bold text-blue">
                <Ic n="card" c="h-3 w-3" /> Mobil Ödeme / QR
              </span>
              <h4 className="text-xs font-bold text-txt">Kare Kod ile Hızlı Ödeme</h4>
              <p className="text-[10px] text-mut2 leading-tight">
                Telefonunuzun kamerası veya banka uygulamasıyla kare kodu okutarak ödeme yapabilirsiniz.
              </p>
            </div>

            <div className="flex justify-center sm:justify-end">
              <div className="rounded-xl border border-line2 bg-white p-2.5 shadow-lg">
                <QRCodeSVG
                  value={data.qrData || `MOSBARKOD-PAY-${data.total}-${Date.now()}`}
                  size={100}
                  marginSize={1}
                />
              </div>
            </div>
          </div>

          {/* Sliding Promotion / Campaign Bar */}
          <div className="rounded-xl border border-amber/30 bg-gradient-to-r from-amber/10 via-amber/5 to-transparent p-3 flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber text-[#180c02]">
              <Ic n="sparkles" c="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-mono text-[9px] font-bold uppercase tracking-widest text-amber2">GÜNCEL DUYURU & KAMPANYA</div>
              <p className="truncate text-xs font-medium text-txt">{data.promoText || 'Afiyet Olsun / Bizi Tercih Ettiğiniz İçin Teşekkür Ederiz!'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
