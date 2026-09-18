import { Component, useEffect, useRef, useState } from 'react';
import { cn } from './utils/cn';
import { Ic } from './icons';
import { Btn } from './components/ui';
import { MobileNav, Sidebar, TopBar } from './components/Shell';
import { PaymentModal, ReceiptModal, type PayPayload } from './components/PaymentModal';
import ImkartModal from './components/ImkartModal';
import Pos, { type ScanFx } from './screens/Pos';
import DeliveryScreen from './screens/Delivery';
import ImkartScreen from './screens/ImkartScreen';
import PosIntegrationScreen from './screens/PosIntegration';
import PosAuthModal from './components/PosAuthModal';
import Products from './screens/Products';
import { CreditScreen, ExpenseScreen, PurchaseScreen } from './screens/Finance';
import StaffScreen from './screens/Staff';
import AnalyticsScreen from './screens/Analytics';
import SettingsScreen from './screens/Settings';
import { applyTheme } from './lib/themes';
import { playBeep } from './lib/sounds';
import { buildReport, waLink } from './lib/report';
import {
  broadcast,
  joinHost,
  startHost,
  stopSync,
  type SyncStatus,
} from './lib/sync';
import LicenseGate, { getStoredLicense, getStoredLicenseAsync } from './components/LicenseGate';
import { IS_DEMO, IS_PLAY, DEMO_MAX_SALES, FREE_MAX_PRODUCTS } from './lib/buildMode';
import { initPlayBilling, isPlayBillingAvailable, isProActive } from './lib/playBilling';
import ProUpsellModal from './components/ProUpsellModal';
import LoginGate from './components/LoginGate';
import { CustomerDisplay } from './components/CustomerDisplay';
import {
  LocaleContext,
  loadLocale,
  saveLocale,
  setI18n,
  isRtl,
  type Locale,
} from './locales/i18n';
import { translations } from './locales';
import { applyAutoTranslate } from './locales/autoTranslate';
import { createSnapshot } from './lib/backup';
import { cloudUpload } from './lib/cloudBackup';
import { applyDiscount } from './lib/pricing';
import { addCredit, collectPayment, needsPosAuth, reduceStock, restock } from './lib/sale';
import { applyCountToProducts, buildCountEntries } from './lib/stockCount';
import {
  ADMIN_ID,
  USERS,
  VIEWS_LOCKED_FOR_CASHIER,
  clearState,
  defaultState,
  fmt,
  fmtN,
  isToday,
  lineNet,
  loadState,
  moduleEnabled,
  priceOf,
  round2,
  saveState,
  setActiveCurrencyCode,
  todayKey,
  uid,
  type AppState,
  type CartLine,
  type Expense,
  type ImkartTxn,
  type Invoice,
  type PriceMode,
  type Product,
  type Sale,
  type SaleItem,
  type Settings,
  type Staff,
  type StockCountSession,
  type ViewId,
} from './data';
import { fxUpdatedAt, refreshFxIfStale, subscribeFx } from './lib/fx';

interface ToastItem {
  id: string;
  msg: string;
  type: 'ok' | 'err';
}

class ErrorBoundary extends Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error) {
    console.error('Render hatası:', error);
  }
  render() {
    if (this.state.error) {
      const message = String(this.state.error.stack || this.state.error.message || this.state.error);
      return (
        <div className="flex h-full items-center justify-center p-6">
          <div className="max-w-xl rounded-xl border border-red/40 bg-panel p-6">
            <h2 className="mb-2 font-mono text-[15px] font-bold text-red">Ekran Hatası</h2>
            <p className="mb-3 text-[12px] leading-relaxed text-mut">
              Bu bölümde beklenmeyen bir hata oluştu. Aşağıdaki hatayı bize iletirseniz dakika içinde düzeltirim:
            </p>
            <pre className="max-h-[300px] overflow-auto rounded-lg border border-line bg-ink/60 p-3 font-mono text-[10.5px] leading-relaxed text-red/90">
              {message}
            </pre>
            <button
              onClick={() => this.setState({ error: null })}
              className="mt-4 rounded-lg border border-line2 px-3.5 py-2 text-[12.5px] text-mut transition-colors hover:text-txt"
            >
              Ekrana Geri Dön
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function LockScreen({ onAdmin }: { onAdmin: () => void }) {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="anim-pop w-full max-w-sm rounded-xl border border-line bg-panel p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl border border-red/30 bg-red/10 text-red">
          <Ic n="lock" c="h-7 w-7" />
        </div>
        <h3 className="mt-4 font-mono text-[15px] font-bold">Yönetici Yetkisi Gerekli</h3>
        <p className="mt-2 text-[12.5px] leading-relaxed text-mut">
          Bu bölüm yalnızca yönetici (Admin) hesabına açıktır. Kasiyer hesabınızla bu ekrana erişemezsiniz.
        </p>
        <Btn v="primary" className="mt-5 w-full" onClick={onAdmin}>
          <Ic n="user" c="h-4 w-4" /> Admin Olarak Devam Et
        </Btn>
      </div>
    </div>
  );
}

export default function App() {
  const [state, setState] = useState<AppState>(loadState);
  const [view, setView] = useState<ViewId>('sales');
  const [register, setRegister] = useState(1);
  const [user, setUser] = useState(ADMIN_ID);
  const [loggedIn, setLoggedIn] = useState(false);
  const [switchUser, setSwitchUser] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [priceMode, setPriceMode] = useState<PriceMode>('f1');
  const [carts, setCarts] = useState<Record<number, CartLine[]>>({ 1: [], 2: [], 3: [] });
  const [discounts, setDiscounts] = useState<Record<number, number>>({ 1: 0, 2: 0, 3: 0 });
  const [allowNegMap, setAllowNegMap] = useState<Record<number, boolean>>({ 1: false, 2: false, 3: false });
  const [payOpen, setPayOpen] = useState(false);
  const [receipt, setReceipt] = useState<{ sale: Sale; opt: string } | null>(null);
  const [scanFx, setScanFx] = useState<ScanFx | null>(null);
  const [imkartOpen, setImkartOpen] = useState(false);
  const [posAuthPending, setPosAuthPending] = useState<PayPayload | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setBooted(true), 400);
    return () => clearTimeout(t);
  }, []);
  const [sync, setSync] = useState<SyncStatus>({ role: 'off', code: '', connected: false });
  const [joinCode, setJoinCode] = useState('');
  const [licensed, setLicensed] = useState(() => IS_DEMO || Boolean(getStoredLicense()));
  const [pro, setPro] = useState(false);
  const [proOpen, setProOpen] = useState(false);
  const [proBannerOff, setProBannerOff] = useState(() => {
    try { return localStorage.getItem('mos_pro_banner_off') === '1'; } catch { return false; }
  });
  // Play ücretsiz katman kilidi: yalnızca Play derlemesinde, lisanssız ve PRO'suzken true.
  const proLocked = IS_PLAY && !licensed && !pro;
  const requirePro = () => setProOpen(true);
  const [demo, setDemo] = useState(IS_DEMO);
  const [demoBaseline, setDemoBaseline] = useState(0);
  const [demoExpired, setDemoExpired] = useState(false);
  const [locale, setLocaleState] = useState<Locale>(() => loadLocale());

  const DOC_TITLES: Record<Locale, string> = {
    tr: 'MOSBARKODYAZILIM — Yapay Zekâ Destekli Barkod Satış Programı',
    en: 'MOSBARKODYAZILIM — AI-Powered Barcode Sales Program',
    es: 'MOSBARKODYAZILIM — Programa de Ventas con Código de Barras con IA',
    de: 'MOSBARKODYAZILIM — KI-gestütztes Barcode-Verkaufsprogramm',
    fr: 'MOSBARKODYAZILIM — Programme de Vente par Code-Barres avec IA',
    it: 'MOSBARKODYAZILIM — Programma di Vendita con Codice a Barre AI',
    pt: 'MOSBARKODYAZILIM — Programa de Vendas por Código de Barras com IA',
    zh: 'MOSBARKODYAZILIM — AI 智能条码销售系统',
    pl: 'MOSBARKODYAZILIM — System sprzedaży kodów kreskowych z AI',
    ro: 'MOSBARKODYAZILIM — Program de vânzări cu coduri de bare și AI',
    el: 'MOSBARKODYAZILIM — Σύστημα πωλήσεων barcode με AI',
    nl: 'MOSBARKODYAZILIM — AI-gestuurd barcodeverkoopprogramma',
    ar: 'MOSBARKODYAZILIM — برنامج بيع بالباركود مدعوم بالذكاء الاصطناعي',
    ru: 'MOSBARKODYAZILIM — Программа продаж по штрих-коду с ИИ',
  };

  const setLocale = (l: Locale) => {
    if (l === locale) return;
    const wasTr = locale === 'tr';
    setLocaleState(l);
    saveLocale(l);
    setI18n(translations[l], l);
    document.documentElement.dir = isRtl(l) ? 'rtl' : 'ltr';
    document.documentElement.lang = l;
    document.title = DOC_TITLES[l];
    if (!wasTr) {
      // Çevrilmiş metinden başka dile geçişte orijinali geri getirmek için tazele
      window.location.reload();
      return;
    }
    applyAutoTranslate(l);
  };

  useEffect(() => {
    setI18n(translations[locale], locale);
    document.documentElement.dir = isRtl(locale) ? 'rtl' : 'ltr';
    document.documentElement.lang = locale;
    document.title = DOC_TITLES[locale];
    applyAutoTranslate(locale);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Electron'da lisansı userData dosyasından da doğrula (her açılışta tekrarlamasın)
  useEffect(() => {
    if (!licensed) {
      void getStoredLicenseAsync().then((v) => {
        if (v) setLicensed(true);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Döviz kurları: açılışta bayatsa arka planda güncelle, değişince ekranı tazele.
  const [, setFxTick] = useState(0);
  useEffect(() => {
    void refreshFxIfStale().then((r) => {
      if (r === 'updated') {
        setFxTick((t) => t + 1);
        toast('Günlük döviz kurları güncellendi');
      } else if (r === 'offline' && !fxUpdatedAt()) {
        toast('Kurlar alınamadı (çevrimdışı) — tahmini kurlar kullanılıyor', 'err');
      }
    });
    const unsub = subscribeFx(() => setFxTick((t) => t + 1));
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Play Store (freemium) sürümü: PRO aboneliği başlat ve sahiplik değişimini dinle.
  // CdvPurchase native köprü kurulana kadar kısa süre beklenir (plugin WebView'e sonradan yüklenebilir).
  useEffect(() => {
    if (!IS_PLAY) return;
    let tries = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const attempt = () => {
      if (isPlayBillingAvailable()) {
        void initPlayBilling((p) => setPro(p));
        setPro(isProActive());
        return;
      }
      if (tries++ < 20) timer = setTimeout(attempt, 250);
    };
    attempt();
    return () => {
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Demo sürüm: ilk açılıştaki satış sayısı başlangıç alınır;
  // bundan sonra DEMO_MAX_SALES kadar yeni satış yapılabilir (kapanıp açılsa da sürer).
  useEffect(() => {
    if (!demo || demoExpired) return;
    let baseline = Number.NaN;
    try {
      baseline = Number(localStorage.getItem('mosbarkod_demo_baseline') ?? 'NaN');
    } catch {
      baseline = Number.NaN;
    }
    if (!Number.isFinite(baseline) || baseline > state.sales.length) {
      baseline = state.sales.length;
      try {
        localStorage.setItem('mosbarkod_demo_baseline', String(baseline));
      } catch {
        /* yoksay */
      }
    }
    setDemoBaseline(baseline);
    if (state.sales.length - baseline >= DEMO_MAX_SALES) {
      setDemoExpired(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demo, demoExpired, state.sales.length]);
  const remoteFlag = useRef(false);
  const autoJoinRef = useRef(false);

  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    saveState(state);
    if (remoteFlag.current) {
      remoteFlag.current = false;
      return;
    }
    broadcast(state);
  }, [state]);

  /* ---------- eşzamanlı senkronizasyon ---------- */

  const handleRemoteState = (s: unknown) => {
    const obj = s as Partial<AppState>;
    if (!obj || !Array.isArray(obj.products) || !obj.settings) return;
    remoteFlag.current = true;
    setState({ ...defaultState(), ...obj });
  };

  const handleSyncStatus = (st: SyncStatus) => {
    setSync((prev) => {
      if (prev.connected && !st.connected && prev.role === st.role) {
        toast('Mobil bağlantı kesildi', 'err');
      } else if (!prev.connected && st.connected) {
        toast(
          st.role === 'host' ? `Mobil cihaz bağlandı (kod: ${st.code})` : `Bağlantı kuruldu (kod: ${st.code})`
        );
      }
      return st;
    });
  };

  const startHostSync = () => {
    const fixed = stateRef.current.settings.mobileSyncCode;
    const code = startHost(handleRemoteState, () => stateRef.current, handleSyncStatus, fixed);
    toast(`WebRTC bağlantısı hazır — kod: ${code}. Telefonlar QR veya kod ile bağlanabilir.`);
  };

  const joinHostSync = (deviceRole: 'admin' | 'order' = 'order', codeOverride?: string) => {
    const code = (codeOverride ?? joinCode).trim().toUpperCase();
    if (!code) {
      toast('Lütfen masaüstündeki 4 haneli kodu girin', 'err');
      return;
    }
    const effectiveRole = code === '1588' || deviceRole === 'admin' ? 'admin' : 'order';
    if (effectiveRole === 'admin') {
      setUser(ADMIN_ID);
      setLoggedIn(true);
      goView('sales');
    } else {
      setUser('u2');
      setLoggedIn(true);
      goView('delivery');
    }

    joinHost(code, handleRemoteState, () => stateRef.current, handleSyncStatus, effectiveRole);
    setJoinCode('');
  };

  const stopSyncNow = () => {
    stopSync(handleSyncStatus);
    toast('Mobil bağlantı kapatıldı');
  };

  // QR ile açılan telefonlar otomatik WebRTC bağlantısı kurar.
  useEffect(() => {
    if (autoJoinRef.current) return;
    const params = new URLSearchParams(window.location.search);
    const code = params.get('sync');
    const device = params.get('device') === 'admin' ? 'admin' : params.get('device') === 'order' ? 'order' : null;
    if (!code || !device) return;

    autoJoinRef.current = true;
    if (device === 'admin') {
      setUser(ADMIN_ID);
      setLoggedIn(true);
      goView('sales');
    } else {
      setUser('u2');
      setLoggedIn(true);
      goView('delivery');
    }
    joinHost(code, handleRemoteState, () => stateRef.current, handleSyncStatus, device);
    window.history.replaceState(null, '', window.location.pathname + window.location.hash);
    toast(device === 'admin' ? 'Admin telefonu bağlanıyor...' : 'Sipariş telefonu bağlanıyor...');
    // İlk açılış parametreleri bir kez okunur.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    applyTheme(state.settings.theme);
  }, [state.settings.theme]);

  // Uluslararası yardımcı — aktif dilde çeviri
  const computedTr = (k: string, params?: Record<string, string | number>) => {
    const str = translations[locale][k] ?? translations.tr[k] ?? k;
    return params
      ? str.replace(/\{(\w+)\}/g, (_m, name) => String(params[name] ?? _m))
      : str;
  };

  // Gelişmiş toast: anlık dilde çevir (basit anahtar desteği — uluslararası metod)
  const toast = (msg: string, type: 'ok' | 'err' = 'ok') => {
    const id = uid();
    setToasts((items) => [...items.slice(-3), { id, msg, type }]);
    setTimeout(() => setToasts((items) => items.filter((x) => x.id !== id)), 3000);
  };

  // Ana bilgisayar tarafında mobil bağlantı her açılışta QR'a hazır olsun.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isMobileJoin = params.has('sync') && params.has('device');
    if (!licensed || isMobileJoin || sync.role !== 'off') return;
    const code = startHost(handleRemoteState, () => stateRef.current, handleSyncStatus, stateRef.current.settings.mobileSyncCode);
    setSync((prev) => ({ ...prev, role: 'host', code, connected: false, clients: 0 }));
    // Bilerek toast göstermiyoruz; ilk giriş ekranını bozmasın.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [licensed]);

  /* ---------- otomatik gün sonu raporu zamanlayıcısı (çoklu saat) ---------- */

  useEffect(() => {
    const t = setInterval(() => {
      const s = stateRef.current;
      const now = new Date();
      const hm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const today = todayKey();
      const cfg = s.settings.report;
      const emailCfg = s.settings.email;

      // WhatsApp zamanlaması — sendTime veya times içinden yaklaşmış olan herhangi biri
      if (cfg.enabled) {
        const waTimes = cfg.times?.length ? cfg.times : [cfg.sendTime];
        for (const time of waTimes) {
          const slot = `${today}|${time}`;
          if (hm >= time && !cfg.lastSlots?.[slot]) {
            const text = buildReport(s, cfg.items);
            setState((prev) => ({
              ...prev,
              settings: {
                ...prev.settings,
                report: {
                  ...prev.settings.report,
                  lastSent: now.toISOString(),
                  lastSlots: { ...prev.settings.report.lastSlots, [slot]: now.toISOString() },
                },
              },
            }));
            if (cfg.provider === 'meta' && cfg.apiKey) {
              toast(`WhatsApp Cloud API gönderim isteği oluşturuldu (${time}) (simülasyon)`);
            } else if (cfg.ownerPhone.replace(/\D/g, '')) {
              window.open(waLink(cfg.ownerPhone, text), '_blank');
              toast(`WhatsApp raporu ${time}'de açıldı`);
            } else {
              toast('WhatsApp gönderimi için alıcı numara tanımlı değil', 'err');
            }
          }
        }
      }

      // E-posta zamanlaması — kendi time listesi
      if (emailCfg.enabled && emailCfg.serviceId && emailCfg.templateId && emailCfg.publicKey && emailCfg.toEmail) {
        const emTimes = emailCfg.times?.length ? emailCfg.times : ['22:10'];
        for (const time of emTimes) {
          const slot = `${today}|${time}`;
          if (hm >= time && !emailCfg.lastSlots?.[slot]) {
            const subj = `Gün Sonu Raporu — ${s.settings.storeName} (${new Date().toLocaleDateString('tr-TR')})`;
            const text = buildReport(s, s.settings.report.items);
            import('./lib/email').then(({ sendEmail }) =>
              sendEmail({
                provider: emailCfg.provider,
                serviceId: emailCfg.serviceId,
                templateId: emailCfg.templateId,
                publicKey: emailCfg.publicKey,
                privateKey: emailCfg.privateKey,
                subject: subj,
                message: text,
                fromName: emailCfg.fromName,
                toEmail: emailCfg.toEmail,
                domain: emailCfg.domain,
                fromEmail: emailCfg.fromEmail,
                smtpHost: emailCfg.smtpHost,
                smtpPort: emailCfg.smtpPort,
                smtpStarttls: emailCfg.smtpStarttls,
                smtpUser: emailCfg.smtpUser,
                smtpPass: emailCfg.smtpPass,
                smtpFrom: emailCfg.smtpFrom,
              }).then((res) => {
                setState((prev) => ({
                  ...prev,
                  settings: {
                    ...prev.settings,
                    email: {
                      ...prev.settings.email,
                      lastSent: now.toISOString(),
                      lastSlots: { ...prev.settings.email.lastSlots, [slot]: now.toISOString() },
                    },
                  },
                }));
                if (res.ok) {
                  toast(`Gün sonu raporu ${time}'de e-posta olarak gönderildi: ${emailCfg.toEmail}`);
                } else {
                  toast(`E-posta gönderim başarısız (${time}): ${res.error}`, 'err');
                }
              })
            );
          }
        }
      }
    }, 20000);
    return () => clearInterval(t);
  }, []);

  /* ---------- otomatik tam yedekleme ---------- */

  useEffect(() => {
    const { enabled, interval, keepDays } = state.settings.autobackup;
    if (!enabled) return;
    const t = setInterval(() => {
      const nowIso = new Date().toISOString();
      try {
        createSnapshot(stateRef.current, 'auto', keepDays);
      } catch {
        /* depolama dolu */
      }
      const cloud = stateRef.current.settings.cloud;
      if (cloud && cloud.provider !== 'none' && cloud.enabled) {
        cloudUpload(cloud, stateRef.current)
          .then((r) => {
            setState((s) => ({
              ...s,
              settings: {
                ...s.settings,
                cloud: {
                  ...s.settings.cloud,
                  lastUpload: r.ok ? new Date().toISOString() : s.settings.cloud.lastUpload,
                  lastError: r.ok ? '' : r.error || '',
                },
              },
            }));
          })
          .catch(() => {
            /* ağ hatası — sessizce geç */
          });
      }
      setState((s) => ({
        ...s,
        settings: { ...s.settings, autobackup: { ...s.settings.autobackup, lastRun: nowIso } },
      }));
    }, Math.max(1, interval) * 60000);
    return () => clearInterval(t);
  }, [state.settings.autobackup.enabled, state.settings.autobackup.interval, state.settings.autobackup.keepDays]);

  /* ---------- derived ---------- */

  const cart = carts[register];
  const subtotal = round2(cart.reduce((s, l) => s + lineNet(l), 0));
  const { discAmt, total } = applyDiscount(subtotal, discounts[register]);
  const isAdmin = user === ADMIN_ID;
  const locked = !isAdmin && VIEWS_LOCKED_FOR_CASHIER.includes(view);

  // Kapatılan bir modülün sekmesine gidilmeye çalışılırsa Satış'a düş.
  const viewAllowed = (v: ViewId) =>
    (v === 'imkart' ? moduleEnabled(state.settings, 'imkart') : true) &&
    (v === 'delivery' ? moduleEnabled(state.settings, 'delivery') : true) &&
    (v === 'pos-integration' ? moduleEnabled(state.settings, 'posint') : true);
  const goView = (v: ViewId) => setView(viewAllowed(v) ? v : 'sales');

  // Görünüm dışarıdan kapatılmış bir modüle set edilirse (ör. geri yükleme/uzak eşleme) Satış'a çevir.
  useEffect(() => {
    if (!viewAllowed(view)) setView('sales');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, state.settings.modules?.imkart, state.settings.modules?.delivery, state.settings.modules?.posint]);

  const ciroToday = round2(state.sales.filter((s) => isToday(s.date)).reduce((a, s) => a + s.total, 0));
  const todaySaleCount = state.sales.filter((s) => isToday(s.date)).length;
  const criticalCount = state.products.filter((p) => p.stock >= 0 && p.stock <= p.critical).length;
  const negCount = state.products.filter((p) => p.stock < 0).length;
  const veresiyeTotal = round2(state.customers.reduce((a, c) => a + c.balance, 0));

  /* ---------- cart ops ---------- */

  const beep = () => {
    const c = stateRef.current.settings.sound;
    if (c.enabled) playBeep(c.preset, c.volume);
  };

  const addToCart = (p: Product) => {
    const line = cart.find((l) => l.productId === p.id);
    if (p.stock >= 0 && !allowNegMap[register] && (line?.qty ?? 0) + 1 > p.stock) {
      toast(computedTr('t.stockShort', { name: p.name, stock: fmtN(p.stock), unit: p.unit }), 'err');
      return;
    }
    const price = priceOf(p, priceMode, state.settings);
    const level = priceMode === 'f2' ? 'f2' : priceMode === 'f3' ? 'f3' : 'f1';
    setCarts((c) => {
      const list = [...c[register]];
      const idx = list.findIndex((l) => l.productId === p.id);
      if (idx >= 0) list[idx] = { ...list[idx], qty: list[idx].qty + 1 };
      else
        list.push({
          id: uid(),
          productId: p.id,
          name: p.name,
          unit: p.unit,
          unitPrice: price,
          qty: 1,
          level,
          mode: priceMode,
          p1: p.p1,
          p2: p.p2,
          p3: p.p3,
          lineDiscount: 0,
        });
      return { ...c, [register]: list };
    });
    beep();
  };

  const setLineLevel = (id: string, level: 'f1' | 'f2' | 'f3') =>
    setCarts((c) => ({
      ...c,
      [register]: c[register].map((l) =>
        l.id === id ? { ...l, level, unitPrice: level === 'f2' ? l.p2 : level === 'f3' ? l.p3 : l.p1 } : l
      ),
    }));

  const setLineDiscount = (id: string, pct: number) =>
    setCarts((c) => ({
      ...c,
      [register]: c[register].map((l) => (l.id === id ? { ...l, lineDiscount: Math.min(100, Math.max(0, pct)) } : l)),
    }));

  const setLinePrice = (id: string, price: number) => {
    if (!isAdmin) {
      toast('Fiyat elle değiştirme yetkisi yalnızca yöneticiye (Admin) aittir', 'err');
      return;
    }
    const line = cart.find((l) => l.id === id);
    const prod = line?.productId ? state.products.find((p) => p.id === line.productId) : undefined;
    const minCost = prod?.cost ?? 0;
    if (minCost > 0 && price < minCost) {
      toast(`Maliyet altında satış yapılamaz — minimum ${fmt(minCost)} olmalı`, 'err');
      return;
    }
    setCarts((c) => ({
      ...c,
      [register]: c[register].map((l) => (l.id === id ? { ...l, unitPrice: Math.round(price * 100) / 100, lineDiscount: 0 } : l)),
    }));
  };

  const isWeight = (p?: Product) => Boolean(p && (p.unit === 'kg' || p.unit === 'lt' || p.weighed));
  const round3 = (n: number) => Math.round(n * 1000) / 1000;

  const incLine = (id: string) => {
    const line = cart.find((l) => l.id === id);
    if (!line) return;
    const p = state.products.find((x) => x.id === line.productId);
    const w = isWeight(p);
    const step = w ? 0.1 : 1;
    if (p && p.stock >= 0 && !allowNegMap[register] && line.qty + step > p.stock + 1e-9) {
      toast('Stok yetersiz', 'err');
      return;
    }
    setCarts((c) => ({
      ...c,
      [register]: c[register].map((l) => (l.id === id ? { ...l, qty: w ? round3(l.qty + step) : l.qty + 1 } : l)),
    }));
  };

  const decLine = (id: string) =>
    setCarts((c) => ({
      ...c,
      [register]: c[register].flatMap((l) => {
        if (l.id !== id) return [l];
        const p = state.products.find((x) => x.id === l.productId);
        const q = isWeight(p) ? round3(l.qty - 0.1) : l.qty - 1;
        return q > 0 ? [{ ...l, qty: q }] : [];
      }),
    }));

  const addWeighted = (p: Product, weight: number) => {
    const price = priceOf(p, priceMode, state.settings);
    const line = cart.find((l) => l.productId === p.id);
    if (p.stock >= 0 && !allowNegMap[register] && (line?.qty ?? 0) + weight > p.stock + 1e-9) {
      toast(`Stok yetersiz: ${p.name} (${fmtN(p.stock)} ${p.unit})`, 'err');
      return;
    }
    const level = priceMode === 'f2' ? 'f2' : priceMode === 'f3' ? 'f3' : 'f1';
    setCarts((c) => {
      const list = [...c[register]];
      const idx = list.findIndex((l) => l.productId === p.id);
      if (idx >= 0) list[idx] = { ...list[idx], qty: round3(list[idx].qty + weight) };
      else
        list.push({
          id: uid(),
          productId: p.id,
          name: p.name,
          unit: p.unit,
          unitPrice: price,
          qty: round3(weight),
          level,
          mode: priceMode,
          p1: p.p1,
          p2: p.p2,
          p3: p.p3,
          lineDiscount: 0,
        });
      return { ...c, [register]: list };
    });
    beep();
    toast(`Tartım sepete eklendi: ${round3(weight)} ${p.unit}`);
  };

  const removeLine = (id: string) =>
    setCarts((c) => ({ ...c, [register]: c[register].filter((l) => l.id !== id) }));

  const clearCart = () => {
    if (cart.length === 0) return;
    setCarts((c) => ({ ...c, [register]: [] }));
    setDiscounts((d) => ({ ...d, [register]: 0 }));
    toast(computedTr('t.cartCleared'), 'err');
  };

  const submitBarcode = (code: string) => {
    const p = state.products.find((x) => x.barcode === code.trim());
    if (!p) {
      toast(computedTr('t.barcodeNotFound', { code: code.trim() }), 'err');
      return false;
    }
    addToCart(p);
    return true;
  };

  const fireScan = (p: Product) => {
    setScanFx({ code: p.barcode, k: Date.now() });
    addToCart(p);
  };

  const addCustom = (name: string, price: number) => {
    setCarts((c) => ({
      ...c,
      [register]: [
        ...c[register],
        {
          id: uid(),
          name,
          unit: 'adet',
          unitPrice: price,
          qty: 1,
          level: 'f1',
          mode: 'f1',
          p1: price,
          p2: price,
          p3: price,
          lineDiscount: 0,
        },
      ],
    }));
    beep();
    toast(`Mühtelif ürün eklendi: ${name}`);
  };

  /* ---------- Ulaşım Kartı ---------- */

  const addImkartDolum = (amount: number, via: 'nakit' | 'pos', cardNo = '') => {
    const s = stateRef.current;
    if (!moduleEnabled(s.settings, 'imkart')) {
      toast('Ulaşım Kartı modülü kapalı', 'err');
      return;
    }
    if (amount > s.imkart.limit) {
      toast(`Yetersiz dolum limiti (mevcut: ${fmt(s.imkart.limit)})`, 'err');
      return;
    }
    const txn: ImkartTxn = {
      id: uid(),
      date: new Date().toISOString(),
      type: 'dolum',
      amount,
      via,
      note: `Kasa ${register} dolum${cardNo ? ` · Kart ${cardNo}` : ''}`,
    };
    setState((st) => ({
      ...st,
      imkart: { limit: round2(st.imkart.limit - amount), txns: [txn, ...st.imkart.txns] },
    }));
    toast(`Ulaşım Kartı dolum: ${fmt(amount)} (${via})`);
  };

  const addImkartDeposit = (amount: number) => {
    const txn: ImkartTxn = {
      id: uid(),
      date: new Date().toISOString(),
      type: 'depozito',
      amount,
      note: 'Banka depozitosu — limit satın alma',
    };
    setState((st) => ({
      ...st,
      imkart: { limit: round2(st.imkart.limit + amount), txns: [txn, ...st.imkart.txns] },
    }));
  };

  /* ---------- payment ---------- */

  const openPay = () => {
    if (cart.length === 0) {
      toast('Sepet boş', 'err');
      return;
    }
    setPayOpen(true);
  };

  const confirmPayment = (p: PayPayload) => {
    // TAM ENTEGRE MOD: kart/POS tutarı varsa provizyon onayı beklenir.
    if (needsPosAuth(state.settings.pos.enabled, p.pos)) {
      setPayOpen(false);
      setPosAuthPending(p);
      return;
    }
    finalizeSale(p);
  };

  const finalizeSale = (p: PayPayload, posAuth?: string) => {
    const cashier = USERS.find((u) => u.id === user)!;
    const now = new Date().toISOString();
    const customerName =
      p.newCustomerName ?? (p.customerId ? state.customers.find((c) => c.id === p.customerId)?.name : undefined);
    const sale: Sale = {
      id: uid(),
      no: `F-${new Date().getFullYear()}-${String(state.sales.length + 1).padStart(4, '0')}`,
      date: now,
      register,
      cashier: cashier.name,
      mode: priceMode,
      items: cart.map((l) => ({ productId: l.productId, name: l.name, qty: l.qty, unit: l.unit, unitPrice: l.unitPrice })),
      subtotal,
      discountPct: discounts[register],
      discountAmt: discAmt,
      total,
      method: p.method,
      received: p.received,
      change: p.change,
      cash: p.cash,
      pos: p.pos,
      customer: customerName,
      posAuth,
    };
    setState((s) => {
      let customers = s.customers;
      if (p.method === 'veresiye') {
        customers = addCredit(customers, {
          amount: total,
          date: now,
          note: `Satış ${sale.no}`,
          customerId: p.customerId,
          newCustomerId: p.newCustomerName ? uid() : undefined,
          newCustomerName: p.newCustomerName,
        });
      }
      return {
        ...s,
        products: reduceStock(s.products, cart),
        customers,
        sales: [sale, ...s.sales],
      };
    });
    setPayOpen(false);
    if (state.settings.autoShowReceipt) setReceipt({ sale, opt: p.receiptOpt });
    setCarts((c) => ({ ...c, [register]: [] }));
    setDiscounts((d) => ({ ...d, [register]: 0 }));
    toast(computedTr('t.saleDone', { no: sale.no }));
  };

  /* ---------- screen mutators ---------- */

  const saveProduct = (p: Product) => {
    const exists = state.products.some((x) => x.id === p.id);
    if (!exists && IS_PLAY && !licensed && !pro && state.products.length >= FREE_MAX_PRODUCTS) {
      toast(`Ücretsiz sürümde en fazla ${FREE_MAX_PRODUCTS} ürün — PRO'ya yükseltin`, 'err');
      setProOpen(true);
      return;
    }
    setState((s) => ({
      ...s,
      products: exists ? s.products.map((x) => (x.id === p.id ? p : x)) : [...s.products, p],
    }));
  };

  const removeProduct = (id: string) =>
    setState((s) => ({ ...s, products: s.products.filter((x) => x.id !== id) }));

  const bulkUpdateProducts = (list: Product[]) => {
    if (IS_PLAY && !licensed && !pro && list.length > FREE_MAX_PRODUCTS) {
      toast(`Ücretsiz sürümde en fazla ${FREE_MAX_PRODUCTS} ürün — PRO'ya yükseltin`, 'err');
      setProOpen(true);
      return;
    }
    setState((s) => ({ ...s, products: list }));
  };

  const applyStockCount = (counts: Record<string, string>) => {
    const entries = buildCountEntries(state.products, counts);
    if (entries.length === 0) return;
    const by = USERS.find((u) => u.id === user)?.name ?? 'Kullanıcı';
    const session: StockCountSession = {
      id: uid(),
      date: new Date().toISOString(),
      by,
      entries,
    };
    setState((s) => ({
      ...s,
      products: applyCountToProducts(s.products, counts),
      stockCounts: [session, ...s.stockCounts],
    }));
  };

  const addCashMove = (dir: 'in' | 'out', amount: number, label: string) => {
    if (!amount || amount <= 0) return;
    setState((s) => ({
      ...s,
      cashMoves: [
        { id: uid(), date: new Date().toISOString(), dir, amount, label, by: USERS.find((u) => u.id === user)!.name },
        ...s.cashMoves,
      ],
    }));
    toast(dir === 'in' ? `Kasaya giriş: ${fmt(amount)}` : `Kasadan çıkış: ${fmt(amount)}`);
  };

  const addPosClose = (device: 1 | 2, amount: number) => {
    if (!amount || amount <= 0) return;
    setState((s) => ({
      ...s,
      posCloses: [
        { id: uid(), date: new Date().toISOString(), device, amount, by: USERS.find((u) => u.id === user)!.name },
        ...s.posCloses,
      ],
    }));
    toast(`POS ${device} gün sonu kapatıldı — ${fmt(amount)} POS bakiyesine eklendi`);
  };

  /* İade işlemi — kısmi veya tam iade */
  const applyRefund = (
    saleId: string,
    itemsToRefund: Record<string, number>,
    reason: string,
    method: 'nakit' | 'kart' | 'veresiye'
  ) => {
    const sale = stateRef.current.sales.find((s) => s.id === saleId);
    if (!sale) return toast('Satış bulunamadı', 'err');
    if (sale.isRefund) return toast('Bu bir iade fişi — iade edilemez', 'err');

    const already = sale.refundedItems ?? {};
    const refundItems: SaleItem[] = [];
    let refundTotal = 0;
    const newRefunded = { ...already };

    for (const item of sale.items) {
      const key = item.name;
      const requested = itemsToRefund[key] ?? 0;
      if (requested <= 0) continue;
      const already_ = already[key] ?? 0;
      const available = item.qty - already_;
      const qty = Math.min(requested, available);
      if (qty <= 0) continue;
      refundItems.push({ name: item.name, qty, unit: item.unit, unitPrice: item.unitPrice });
      refundTotal += qty * item.unitPrice;
      newRefunded[key] = already_ + qty;
    }

    if (refundItems.length === 0) return toast('İade edilecek ürün seçilmedi', 'err');
    refundTotal = round2(refundTotal);

    const cashier = USERS.find((u) => u.id === user)!;
    const now = new Date().toISOString();
    const refundSale: Sale = {
      id: uid(),
      no: `İ-${new Date().getFullYear()}-${String(stateRef.current.sales.length + 1).padStart(4, '0')}`,
      date: now,
      register,
      cashier: `${cashier.name} / İADE`,
      mode: sale.mode,
      items: refundItems,
      subtotal: refundTotal,
      discountPct: 0,
      discountAmt: 0,
      total: -refundTotal,
      method: method === 'kart' ? 'kart' : method === 'veresiye' ? 'veresiye' : 'nakit',
      received: -refundTotal,
      change: 0,
      cash: method === 'nakit' ? -refundTotal : 0,
      pos: method === 'kart' ? -refundTotal : 0,
      customer: sale.customer,
      parentSaleId: sale.id,
      isRefund: true,
      refundReason: reason,
    };

    setState((s) => {
      let customers = s.customers;
      if (method === 'veresiye' && sale.customer) {
        customers = s.customers.map((c) =>
          c.name === sale.customer
            ? {
                ...c,
                balance: round2(c.balance - refundTotal),
                entries: [
                  ...c.entries,
                  { date: now, type: 'tahsilat' as const, amount: refundTotal, note: `İade — ${refundSale.no}` },
                ],
              }
            : c
        );
      }
      return {
        ...s,
        products: restock(s.products, refundItems),
        sales: [
          refundSale,
          ...s.sales.map((x) =>
            x.id === sale.id
              ? {
                  ...x,
                  refundedItems: newRefunded,
                  refundedTotal: round2((x.refundedTotal ?? 0) + refundTotal),
                }
              : x
          ),
        ],
        customers,
      };
    });
    toast(`İade tamamlandı — ${fmt(refundTotal)} (${method})`);
  };

  const addInvoice = (inv: Invoice, toStock: boolean) =>
    setState((s) => ({
      ...s,
      invoices: [inv, ...s.invoices],
      products: toStock
        ? s.products.map((pr) => {
            const hit = inv.lines.find(
              (l) =>
                l.name.toLowerCase() === pr.name.toLowerCase() ||
                pr.name.toLowerCase().includes(l.name.toLowerCase()) ||
                l.name.toLowerCase().includes(pr.name.toLowerCase())
            );
          if (hit) {
            return {
              ...pr,
              stock: round2(pr.stock + hit.qty),
              cost: hit.cost || pr.cost, // ALIŞ FİYATI STOK KARTINA YANSIR
              p1: hit.sale || pr.p1,     // SATIŞ FİYATI STOK KARTINA YANSIR
            };
          }
            return pr;
          })
        : s.products,
    }));

  const updateInvoice = (id: string, patch: Partial<Invoice>) =>
    setState((s) => ({
      ...s,
      invoices: s.invoices.map((inv) => (inv.id === id ? { ...inv, ...patch } : inv)),
    }));

  // Veresiye borcu biten müşterileri defterden sil
  const removeClosedCustomers = (): number => {
    const closed = stateRef.current.customers.filter((c) => round2(c.balance) <= 0);
    if (closed.length === 0) {
      toast('Borcu biten veresiye kaydı bulunmuyor', 'err');
      return 0;
    }
    setState((s) => ({ ...s, customers: s.customers.filter((c) => round2(c.balance) > 0) }));
    return closed.length;
  };

  const removeInvoice = (id: string) =>
    setState((s) => ({ ...s, invoices: s.invoices.filter((x) => x.id !== id) }));

  const addCustomer = (name: string, phone: string): string => {
    const id = uid();
    setState((s) => ({
      ...s,
      customers: [...s.customers, { id, name, phone, balance: 0, entries: [] }],
    }));
    return id;
  };

  const createDelivery = (o: AppState['deliveries'][number]) =>
    setState((s) => ({ ...s, deliveries: [o, ...s.deliveries] }));

  const updateDelivery = (id: string, patch: Partial<AppState['deliveries'][number]>) =>
    setState((s) => ({
      ...s,
      deliveries: s.deliveries.map((d) => (d.id === id ? { ...d, ...patch } : d)),
    }));

  const finalizeDelivery = (id: string) => {
    const now = new Date().toISOString();
    const cashier = USERS.find((u) => u.id === user)!;
    setState((s) => {
      const order = s.deliveries.find((d) => d.id === id);
      if (!order || order.saleId || order.status === 'iptal') return s;
      const sale: Sale = {
        id: uid(),
        no: `F-${new Date().getFullYear()}-${String(s.sales.length + 1).padStart(4, '0')}`,
        date: now,
        register,
        cashier: `${cashier.name} / Paket`,
        mode: 'f1',
        items: order.items.map((i) => ({ name: i.name, qty: i.qty, unit: i.unit, unitPrice: i.unitPrice })),
        subtotal: order.subtotal,
        discountPct: order.discountPct,
        discountAmt: order.discountAmt,
        total: order.total,
        method: order.payMethod === 'kart' ? 'kart' : order.payMethod === 'nakit' ? 'nakit' : 'nakit+pos',
        received: order.total,
        change: 0,
        cash: order.cashPart,
        pos: order.posPart,
        customer: order.customerName,
      };
      return {
        ...s,
        products: s.products.map((pr) => {
          const line = order.items.find((l) => l.productId === pr.id);
          return line ? { ...pr, stock: round2(pr.stock - line.qty) } : pr;
        }),
        sales: [sale, ...s.sales],
        deliveries: s.deliveries.map((d) =>
          d.id === id ? { ...d, status: 'teslim-edildi', deliveredAt: now, paid: true, saleId: sale.id } : d
        ),
      };
    });
    toast('Paket siparişi teslim edildi ve satışa işlendi');
  };

  const addPayment = (id: string, amount: number, note: string) =>
    setState((s) => ({
      ...s,
      customers: collectPayment(s.customers, id, amount, new Date().toISOString(), note),
    }));

  const addExpense = (e: Expense) => setState((s) => ({ ...s, expenses: [e, ...s.expenses] }));
  const removeExpense = (id: string) =>
    setState((s) => ({ ...s, expenses: s.expenses.filter((x) => x.id !== id) }));

  const saveStaff = (st: Staff) =>
    setState((s) => {
      const exists = s.staff.some((x) => x.id === st.id);
      return { ...s, staff: exists ? s.staff.map((x) => (x.id === st.id ? st : x)) : [...s.staff, st] };
    });

  const payStaff = (st: Staff, amount: number, type: 'maas' | 'avans', note: string) => {
    const now = new Date().toISOString();
    const mk = now.slice(0, 7);
    const pays = [...(st.pays ?? []), { id: uid(), date: now, amount, type, note: note || undefined }];
    const maasMonth = pays.filter((p) => p.type === 'maas' && p.date.slice(0, 7) === mk).reduce((a, p) => a + p.amount, 0);
    saveStaff({ ...st, pays, paidMonth: maasMonth >= st.salary - 1e-9 ? mk : st.paidMonth });
    addExpense({
      id: uid(),
      date: now,
      category: 'Personel',
      amount,
      note: `${st.name} — ${type === 'maas' ? 'maaş ödemesi' : 'avans'}`,
    });
  };

  const removeStaff = (id: string) =>
    setState((s) => ({ ...s, staff: s.staff.filter((x) => x.id !== id) }));

  const patchSettings = (p: Partial<Settings>) =>
    setState((s) => ({ ...s, settings: { ...s.settings, ...p } }));

  const resetKasa = () => {
    setState((s) => ({
      ...s,
      // İlk kurulum temizliği: kart tanımları ve şirket ayarları kalır, tüm işletme hareketleri sıfırlanır.
      sales: [],
      deliveries: [],
      customers: s.customers.map((c) => ({ ...c, balance: 0, entries: [] })),
      expenses: [],
      invoices: [],
      cashMoves: [],
      posCloses: [],
      imkart: { limit: 0, txns: [] },
      products: s.products.map((p) => ({ ...p, stock: 0 })),
      staff: s.staff.map((st) => ({ ...st, paidMonth: null, pays: [] })),
      settings: {
        ...s.settings,
        openingCash: 0,
        report: { ...s.settings.report, lastSent: null },
        autobackup: { ...s.settings.autobackup, lastRun: null },
      },
    }));
    setCarts({ 1: [], 2: [], 3: [] });
    setDiscounts({ 1: 0, 2: 0, 3: 0 });
    setAllowNegMap({ 1: false, 2: false, 3: false });
    toast('İlk kurulum temizliği tamamlandı — tüm bakiyeler ve hareketler sıfırlandı', 'err');
  };

  const applyRestore = (data: AppState) => {
    setState(data);
    if (data.settings?.currency?.active) setActiveCurrencyCode(data.settings.currency.active);
    toast('Yedek başarıyla geri yüklendi');
  };

  void clearState;

  /* ---------- render ---------- */

  // Standalone 2nd Screen / CFD Mode
  const isCfdWindow = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('mode') === 'cfd';
  if (isCfdWindow) {
    return <CustomerDisplay />;
  }

  // İlk açılışta ana ekranın 1 saniye flash yapmasını önlemek için boot gate
  if (!booted) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-ink">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-amber/50 bg-ink/90">
            <Ic n="flame" c="h-7 w-7 text-amber2" />
          </div>
          <p className="font-mono text-[10.5px] tracking-[0.25em] text-mut2">MOSBARKODYAZILIM</p>
        </div>
      </div>
    );
  }

  if ((!licensed && !pro && !IS_PLAY) || (demo && demoExpired)) {
    return (
      <LicenseGate
        demo={demo}
        demoExpired={demoExpired}
        onActivated={() => {
          setLicensed(true);
          setDemo(false);
          setDemoExpired(false);
          toast('Lisans etkinleştirildi — MOSBARKODYAZILIM kullanıma hazır');
        }}
      />
    );
  }

  if (!loggedIn) {
    return (
      <LoginGate
        pins={state.settings.pins}
        brandTitle={state.settings.brandTitle || 'MOSBARKODYAZILIM'}
        onSuccess={(id) => {
          setUser(id);
          setLoggedIn(true);
          toast(`${USERS.find((u) => u.id === id)?.name} olarak giriş yapıldı`);
        }}
      />
    );
  }

  return (
    <LocaleContext.Provider
      value={{
        locale,
        setLocale,
        t: (k, p) => {
          const str = translations[locale][k] ?? translations.tr[k] ?? k;
          return p
            ? str.replace(/\{(\w+)\}/g, (_m, name) => String((p as Record<string, string | number>)[name as string] ?? _m))
            : str;
        },
        isRtl: isRtl(locale),
        dir: isRtl(locale) ? 'rtl' : 'ltr',
      }}
    >
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-ink font-sans text-txt">
      <TopBar
        settings={state.settings}
        ciroToday={ciroToday}
        saleCount={todaySaleCount}
        customerCount={state.customers.length}
        criticalCount={criticalCount}
        negCount={negCount}
        veresiyeTotal={veresiyeTotal}
        imkartLimit={state.imkart.limit}
        onImkartClick={() => setImkartOpen(true)}
        syncConnected={sync.connected}
        syncCode={sync.code}
        register={register}
        setRegister={setRegister}
        proLocked={proLocked}
        onRequirePro={requirePro}
        currentUser={user}
        setUser={(id) => {
          if (id === user) return;
          setSwitchUser(id);
        }}
        go={goView}
      />

      {switchUser && (
        <LoginGate
          mode="switch"
          presetUser={switchUser}
          pins={state.settings.pins}
          brandTitle={state.settings.brandTitle || 'MOSBARKODYAZILIM'}
          onCancel={() => setSwitchUser(null)}
          onSuccess={(id) => {
            setUser(id);
            setSwitchUser(null);
            toast(`${USERS.find((u) => u.id === id)?.name} olarak oturum açıldı`);
          }}
        />
      )}
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <Sidebar
          view={view}
          go={goView}
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          isCashier={!isAdmin}
          settings={state.settings}
        />
        <main className="min-w-0 flex-1 overflow-hidden p-3 pb-20 md:pb-3">
          <ErrorBoundary>
          {locked ? (
            <LockScreen onAdmin={() => setUser(ADMIN_ID)} />
          ) : view === 'sales' ? (
            <Pos
              register={register}
              cart={cart}
              products={state.products}
              priceMode={priceMode}
              setPriceMode={setPriceMode}
              settings={state.settings}
              isAdmin={isAdmin}
              toast={toast}
              discount={discounts[register]}
              setDiscount={(n) => setDiscounts((d) => ({ ...d, [register]: n }))}
              allowNeg={allowNegMap[register]}
              setAllowNeg={(b) => setAllowNegMap((m) => ({ ...m, [register]: b }))}
              onPay={openPay}
              clearCart={clearCart}
              addToCart={addToCart}
              addCustom={addCustom}
              incLine={incLine}
              decLine={decLine}
              removeLine={removeLine}
              setLineLevel={setLineLevel}
              setLineDiscount={setLineDiscount}
              setLinePrice={setLinePrice}
              addWeight={addWeighted}
              submitBarcode={submitBarcode}
              scanFx={scanFx}
              fireScan={fireScan}
              sales={state.sales}
              proLocked={proLocked}
              onRequirePro={requirePro}
            />
          ) : view === 'delivery' ? (
            <DeliveryScreen
              products={state.products}
              deliveries={state.deliveries}
              staff={state.staff}
              settings={state.settings}
              createOrder={createDelivery}
              updateOrder={updateDelivery}
              finalizeOrder={finalizeDelivery}
              toast={toast}
            />
          ) : view === 'imkart' ? (
            <ImkartScreen
              imkart={state.imkart}
              onDolum={addImkartDolum}
              onDeposit={addImkartDeposit}
              toast={toast}
            />
          ) : view === 'pos-integration' ? (
            <PosIntegrationScreen
              settings={state.settings}
              onPatch={patchSettings}
              sales={state.sales}
              toast={toast}
            />
          ) : view === 'stock' ? (
            <Products
              products={state.products}
              sales={state.sales}
              settings={state.settings}
              isAdmin={isAdmin}
              save={saveProduct}
              remove={removeProduct}
              bulkUpdate={bulkUpdateProducts}
              stockCounts={state.stockCounts}
              onApplyCount={applyStockCount}
              toast={toast}
              proLocked={proLocked}
              onRequirePro={requirePro}
            />
          ) : view === 'purchase' ? (
            <PurchaseScreen
              invoices={state.invoices}
              products={state.products}
              state={state}
              add={addInvoice}
              update={updateInvoice}
              remove={removeInvoice}
              toast={toast}
            />
          ) : view === 'credit' ? (
            <CreditScreen
              customers={state.customers}
              settings={state.settings}
              addCustomer={addCustomer}
              addPayment={addPayment}
              removeClosed={removeClosedCustomers}
              toast={toast}
            />
          ) : view === 'expense' ? (
            <ExpenseScreen expenses={state.expenses} add={addExpense} remove={removeExpense} toast={toast} />
          ) : view === 'staff' ? (
            <StaffScreen
              staff={state.staff}
              save={saveStaff}
              pay={payStaff}
              remove={removeStaff}
              pins={state.settings.pins}
              onPinsChange={(pins) => patchSettings({ pins })}
              isAdmin={isAdmin}
              toast={toast}
              proLocked={proLocked}
              onRequirePro={requirePro}
            />
          ) : view === 'cash' ? (
            <AnalyticsScreen
              state={state}
              onCashMove={addCashMove}
              onPosClose={addPosClose}
              onImkartBulk={(amount, via) => addImkartDolum(amount, via, '')}
              onPatch={patchSettings}
              onRefund={applyRefund}
              isAdmin={isAdmin}
              toast={toast}
              proLocked={proLocked}
              onRequirePro={requirePro}
            />
          ) : (
            <SettingsScreen
              state={state}
              onPatch={patchSettings}
              onRestore={applyRestore}
              onResetKasa={resetKasa}
              sync={sync}
              joinCode={joinCode}
              setJoinCode={setJoinCode}
              onStartHostSync={startHostSync}
              onJoinHostSync={joinHostSync}
              onStopSync={stopSyncNow}
              toast={toast}
              proLocked={proLocked}
              onRequirePro={requirePro}
            />
          )}
          </ErrorBoundary>
        </main>
        <MobileNav view={view} go={goView} settings={state.settings} />
      </div>

      {imkartOpen && (
        <ImkartModal
          limit={state.imkart.limit}
          onClose={() => setImkartOpen(false)}
          onConfirm={(amount, via, cardNo) => {
            addImkartDolum(amount, via, cardNo);
            setImkartOpen(false);
          }}
        />
      )}
      {payOpen && (
        <PaymentModal
          total={total}
          customers={state.customers}
          onClose={() => setPayOpen(false)}
          onConfirm={confirmPayment}
        />
      )}
      {posAuthPending && (
        <PosAuthModal
          total={posAuthPending.pos}
          settings={state.settings}
          onApproved={(prov) => {
            finalizeSale(posAuthPending, prov);
            setPosAuthPending(null);
          }}
          onCancel={() => {
            setPosAuthPending(null);
            toast('POS provizyonu iptal edildi — satış tamamlanmadı', 'err');
          }}
        />
      )}
      {receipt && (
        <ReceiptModal
          sale={receipt.sale}
          opt={receipt.opt}
          settings={state.settings}
          onDone={() => setReceipt(null)}
        />
      )}
      {proOpen && (
        <ProUpsellModal
          onClose={() => setProOpen(false)}
          onActivated={() => {
            setPro(true);
            setProOpen(false);
          }}
          toast={toast}
        />
      )}

      <div className="pointer-events-none fixed bottom-4 right-4 z-[70] flex w-[340px] flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'anim-toast pointer-events-auto flex items-start gap-2 rounded-lg border px-3.5 py-2.5 font-mono text-[12px] font-semibold shadow-xl shadow-black/40',
              t.type === 'ok' ? 'border-mint/40 bg-[#0c1f19] text-mint' : 'border-red/40 bg-[#231114] text-red'
            )}
          >
            <Ic n={t.type === 'ok' ? 'check' : 'alert'} c="mt-0.5 h-4 w-4 shrink-0" />
            <span>{t.msg}</span>
          </div>
        ))}
      </div>

      {demo && !demoExpired && (
        <div className="pointer-events-none fixed left-1/2 top-[70px] z-[80] -translate-x-1/2 rounded-full border border-amber/50 bg-amber/90 px-3 py-1 font-mono text-[10px] font-black tracking-[0.2em] text-black shadow-lg">
          DEMO SÜRÜM · {Math.max(0, DEMO_MAX_SALES - Math.max(0, state.sales.length - demoBaseline))} SATIŞ KALDI
        </div>
      )}
      {IS_PLAY && !licensed && !pro && !proBannerOff && (
        <div className="fixed bottom-[76px] left-1/2 z-[80] flex max-w-[94vw] -translate-x-1/2 items-center gap-1 rounded-full border border-mint/70 bg-mint py-1 pl-3 pr-1 shadow-lg">
          <button
            onClick={() => setProOpen(true)}
            className="whitespace-nowrap font-mono text-[10px] font-black tracking-[0.15em] text-[#04211a]"
          >
            ★ ÜCRETSİZ SÜRÜM — PRO'YA YÜKSELT
          </button>
          <button
            onClick={() => { setProBannerOff(true); try { localStorage.setItem('mos_pro_banner_off', '1'); } catch { /* ignore */ } }}
            aria-label="PRO şeridini kapat"
            title="Kapat"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[14px] font-black leading-none text-[#04211a]/70 transition-colors hover:bg-black/10 hover:text-[#04211a]"
          >
            ×
          </button>
        </div>
      )}
    </div>
    </LocaleContext.Provider>
  );
}
