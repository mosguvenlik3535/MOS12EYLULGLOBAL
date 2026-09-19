import { appVersionLabel } from './lib/buildMode';
import { fxRate as _fxRate, initFx } from './lib/fx';
import { SEED_IMAGES } from './lib/seedImages';

/* Gömülü görselin veri adresini kısa anahtara çeviren ters tablo
   ('seed:domates' gibi). Eski kayıtlara görsel işlerken kullanılır; böylece
   yerel depolama ve yedek dosyaları gereksiz yere şişmez. */
const GORSEL_ANAHTARI = new Map<string, string>(
  (Object.entries(SEED_IMAGES) as [string, string][]).map(([k, v]) => [v, 'seed:' + k]),
);

/**
 * Örnek ürün görsellerini envantere işler.
 * Yalnızca görseli BOŞ olan ya da eski bir internet adresi taşıyan ve barkodu
 * örnek ürünlerle eşleşen kayıtlar güncellenir. Kullanıcının kendi yüklediği
 * görseller (data:/blob: ile başlayanlar) asla değiştirilmez.
 * @returns görseli yenilenen ürün sayısı
 */
export function backfillSeedImages(list: Product[]): number {
  const gorsel = new Map(
    defaultProducts()
      .filter((p) => !!p.image)
      .map((p) => [p.barcode, p.image as string]),
  );
  let n = 0;
  for (const p of list) {
    const yeni = gorsel.get(p.barcode);
    if (!yeni) continue;
    const eski = (p.image || '').trim();
    const bosVeyaEskiAdres = !eski || eski.startsWith('http') || eski.includes('pexels.com');
    if (!bosVeyaEskiAdres) continue;
    p.image = GORSEL_ANAHTARI.get(yeni) ?? yeni;
    n += 1;
  }
  return n;
}

export type PriceMode = 'f1' | 'f2' | 'f3' | 'kkart' | 'taksit';
export type PayMethod = 'nakit' | 'kart' | 'nakit+pos' | 'veresiye';
export type ViewId =
  | 'sales'
  | 'delivery'
  | 'imkart'
  | 'pos-integration'
  | 'stock'
  | 'purchase'
  | 'credit'
  | 'expense'
  | 'staff'
  | 'cash'
  | 'settings';

/* Her dolum işleminde net kâra eklenecek marj oranı (%1) */
export const IMKART_MARGIN = 0.01;

export interface Product {
  id: string;
  name: string;
  barcode: string;
  category: string;
  stock: number;
  unit: string;
  p1: number;
  p2: number;
  p3: number;
  /** Taksitli satış fiyatı — ürün kartından elle girilir, F1'in üzerinde olmalıdır. */
  installment?: number;
  cost: number;
  critical: number;
  image?: string;
  brand?: string;
  gram?: string;
  expiry?: string;
  supplier?: string;
  quick?: boolean;
  weighed?: boolean;
  /** Satış KDV oranı — hesaplanan KDV için (varsayılan: kategoriye göre) */
  vatRate?: number;
}

export interface ImkartTxn {
  id: string;
  date: string;
  type: 'depozito' | 'dolum';
  amount: number;
  via?: 'nakit' | 'pos';
  note?: string;
}

export interface Imkart {
  limit: number;
  txns: ImkartTxn[];
}

export interface CartLine {
  id: string;
  productId?: string;
  name: string;
  unit: string;
  unitPrice: number;
  qty: number;
  level: 'f1' | 'f2' | 'f3';
  mode: PriceMode;
  p1: number;
  p2: number;
  p3: number;
  lineDiscount: number;
}

export const lineNet = (l: CartLine) =>
  round2(l.unitPrice * l.qty * (1 - (l.lineDiscount || 0) / 100));

export interface SaleItem {
  productId?: string;
  name: string;
  qty: number;
  unit: string;
  unitPrice: number;
}

export interface Sale {
  id: string;
  no: string;
  date: string;
  register: number;
  cashier: string;
  mode: PriceMode;
  items: SaleItem[];
  subtotal: number;
  discountPct: number;
  discountAmt: number;
  total: number;
  method: PayMethod;
  received: number;
  change: number;
  cash: number;
  pos: number;
  customer?: string;
  /** Tam entegre POS provizyon kodu (POS cihazından onaylandıysa) */
  posAuth?: string;
  refundedItems?: Record<string, number>;
  refundedTotal?: number;
  parentSaleId?: string;
  isRefund?: boolean;
  refundReason?: string;
}

export interface CustomerEntry {
  date: string;
  type: 'satış' | 'tahsilat';
  amount: number;
  note?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  balance: number;
  entries: CustomerEntry[];
}

export interface Expense {
  id: string;
  date: string;
  category: string;
  amount: number;
  note: string;
  /** Masraf faturası KDV oranı (elektrik, su, internet vb. → indirilecek KDV) */
  vatRate?: number;
  /** Girilen tutar KDV dahil mi? (varsayılan: dahil) */
  vatIncluded?: boolean;
  /** Belgeli mi? (belgesiz masrafın KDV'si indirilemez) */
  hasInvoice?: boolean;
}

export interface InvoicePayment {
  id: string;
  date: string;
  amount: number;
  method: 'nakit' | 'pos';
  note?: string;
}

import {
  getCountryVatProfile,
  resolveProductVatRate,
  type CountryVatProfile,
  type VatRateMeta,
} from './locales/countryVat';
import type { Locale } from './locales/i18n';

/** Varsayılan Türkiye KDV oranları (geriye dönük uyumluluk) */
export const VAT_RATES = [0, 1, 10, 18, 20] as const;
export type VatRate = (typeof VAT_RATES)[number];

export const VAT_META: Record<number, { label: string; desc: string; color: string }> = {
  0: { label: '%0', desc: 'İstisna / KDV yok', color: '#7d8ca0' },
  1: { label: '%1', desc: 'Temel gıda, ekmek, un', color: '#2fd6a5' },
  10: { label: '%10', desc: 'Gıda, içecek, temizlik', color: '#5aa2f0' },
  18: { label: '%18', desc: 'Eski genel oran (arşiv)', color: '#c084fc' },
  20: { label: '%20', desc: 'Genel oran — alkol, tütün', color: '#f59e0b' },
};

export type { CountryVatProfile, VatRateMeta };

export interface Invoice {
  id: string;
  no: string;
  date: string;
  supplier: string;
  payType: 'nakit' | 'pos' | 'veresiye';
  dueDate?: string;        // Veresiye için vade tarihi
  paidDate?: string;       // Ödeme tarihi
  /** Tedarikçi belgesindeki gerçek fatura numarası */
  supplierNo?: string;
  /** Belge tipi */
  docType?: 'e-fatura' | 'e-arsiv' | 'kagit' | 'irsaliye';
  /** Tedarikçi vergi kimlik / TC no */
  taxNo?: string;
  /** Kalem fiyatları KDV dahil mi girildi? */
  vatIncluded?: boolean;
  lines: { name: string; qty: number; cost: number; sale?: number; vatRate?: number }[];
  /** KDV hariç matrah toplamı */
  subtotal?: number;
  /** Toplam KDV tutarı */
  vatTotal?: number;
  /** Genel toplam (matrah + KDV) */
  total: number;
  status: 'odendi' | 'bekliyor';
  payments?: InvoicePayment[];  // Ödeme geçmişi
}

/** Satış tarafı — ürün/kategori ve seçili ülke bazlı KDV oranı bulma */
export function productVatRate(name: string, products: Product[], locale: Locale = 'tr'): number {
  return resolveProductVatRate(name, products, locale);
}

export interface VatDeclaration {
  period: string;
  vatName: string;
  countryName: string;
  /** Satışlardan tahsil edilen KDV */
  outputVat: number;
  outputBase: number;
  outputRows: { rate: number; base: number; vat: number }[];
  saleCount: number;
  /** Alış faturalarından indirilecek KDV */
  purchaseVat: number;
  purchaseBase: number;
  purchaseRows: { rate: number; base: number; vat: number }[];
  invoiceCount: number;
  /** Masraf faturalarından indirilecek KDV */
  expenseVat: number;
  expenseBase: number;
  expenseRows: { rate: number; base: number; vat: number }[];
  expenseCount: number;
  /** Toplam indirilecek KDV = alış + masraf */
  inputVat: number;
  /** Hesaplanan − İndirilecek (pozitif: ödenecek, negatif: devreden) */
  balance: number;
  payable: number;
  carryForward: number;
}

/**
 * KDV / VAT Beyannamesi hesabı — Vergi Dairesi mantığı (seçilen ülkenin vergi profiline göre):
 *   Hesaplanan KDV (satış) − İndirilecek KDV (alış + masraf) = Ödenecek KDV
 *   Sonuç negatifse "Devreden KDV" olarak sonraki döneme aktarılır.
 */
export function calcVatDeclaration(state: AppState, period: string, locale: Locale = 'tr'): VatDeclaration {
  const profile = getCountryVatProfile(locale);
  const agg = (rows: Map<number, { base: number; vat: number }>) =>
    [...rows.entries()].sort((a, b) => a[0] - b[0]).map(([rate, v]) => ({ rate, base: round2(v.base), vat: round2(v.vat) }));

  /* --- 1) HESAPLANAN KDV: satışlar (iadeler düşülür) --- */
  const outMap = new Map<number, { base: number; vat: number }>();
  let outputBase = 0;
  let outputVat = 0;
  const periodSales = state.sales.filter((s) => s.date.slice(0, 7) === period);
  for (const s of periodSales) {
    const sign = s.isRefund ? -1 : 1;
    // Satış fiyatları KDV DAHİL kabul edilir (perakende)
    const disc = s.subtotal > 0 ? s.total / s.subtotal : 1;
    for (const it of s.items) {
      const rate = productVatRate(it.name, state.products, locale);
      const gross = it.qty * it.unitPrice * disc * sign;
      const base = gross / (1 + rate / 100);
      const vat = gross - base;
      const e = outMap.get(rate) ?? { base: 0, vat: 0 };
      e.base += base;
      e.vat += vat;
      outMap.set(rate, e);
      outputBase += base;
      outputVat += vat;
    }
  }

  /* --- 2) İNDİRİLECEK KDV: alış faturaları --- */
  const purMap = new Map<number, { base: number; vat: number }>();
  let purchaseBase = 0;
  let purchaseVat = 0;
  const periodInvoices = state.invoices.filter((i) => i.date.slice(0, 7) === period);
  for (const inv of periodInvoices) {
    const sum = invoiceVatSummary(inv);
    for (const r of sum.rows) {
      const e = purMap.get(r.rate) ?? { base: 0, vat: 0 };
      e.base += r.base;
      e.vat += r.vat;
      purMap.set(r.rate, e);
    }
    purchaseBase += sum.base;
    purchaseVat += sum.vat;
  }

  /* --- 3) İNDİRİLECEK KDV: masraf faturaları (elektrik, su, internet…) --- */
  const expMap = new Map<number, { base: number; vat: number }>();
  let expenseBase = 0;
  let expenseVat = 0;
  const periodExpenses = state.expenses.filter((e) => e.date.slice(0, 7) === period && (e.hasInvoice ?? true) && (e.vatRate ?? 0) > 0);
  for (const ex of periodExpenses) {
    const rate = ex.vatRate ?? 0;
    const incl = ex.vatIncluded ?? true;
    const base = incl ? ex.amount / (1 + rate / 100) : ex.amount;
    const vat = incl ? ex.amount - base : ex.amount * (rate / 100);
    const e = expMap.get(rate) ?? { base: 0, vat: 0 };
    e.base += base;
    e.vat += vat;
    expMap.set(rate, e);
    expenseBase += base;
    expenseVat += vat;
  }

  const inputVat = round2(purchaseVat + expenseVat);
  const balance = round2(round2(outputVat) - inputVat);

  return {
    period,
    vatName: profile.vatName,
    countryName: profile.countryName,
    outputVat: round2(outputVat),
    outputBase: round2(outputBase),
    outputRows: agg(outMap),
    saleCount: periodSales.length,
    purchaseVat: round2(purchaseVat),
    purchaseBase: round2(purchaseBase),
    purchaseRows: agg(purMap),
    invoiceCount: periodInvoices.length,
    expenseVat: round2(expenseVat),
    expenseBase: round2(expenseBase),
    expenseRows: agg(expMap),
    expenseCount: periodExpenses.length,
    inputVat,
    balance,
    payable: balance > 0 ? balance : 0,
    carryForward: balance < 0 ? round2(-balance) : 0,
  };
}

/** Fatura KDV özeti — oran bazında matrah/KDV kırılımı */
export function invoiceVatSummary(inv: Invoice) {
  const incl = inv.vatIncluded ?? false;
  const byRate = new Map<number, { base: number; vat: number; gross: number }>();
  let base = 0;
  let vat = 0;
  let gross = 0;
  for (const l of inv.lines) {
    const rate = l.vatRate ?? 0;
    const line = l.qty * l.cost;
    const lineBase = incl ? line / (1 + rate / 100) : line;
    const lineVat = incl ? line - lineBase : line * (rate / 100);
    const lineGross = lineBase + lineVat;
    const e = byRate.get(rate) ?? { base: 0, vat: 0, gross: 0 };
    e.base += lineBase;
    e.vat += lineVat;
    e.gross += lineGross;
    byRate.set(rate, e);
  }
  for (const e of byRate.values()) {
    e.base = round2(e.base);
    e.vat = round2(e.vat);
    e.gross = round2(e.gross);
    base += e.base;
    vat += e.vat;
    gross += e.gross;
  }
  return {
    rows: [...byRate.entries()].sort((a, b) => a[0] - b[0]).map(([rate, v]) => ({ rate, ...v })),
    base: round2(base),
    vat: round2(vat),
    gross: round2(gross),
  };
}

export interface StaffPay {
  id: string;
  date: string;
  amount: number;
  type: 'maas' | 'avans';
  note?: string;
}

export interface Staff {
  id: string;
  name: string;
  role: string;
  phone: string;
  salary: number;
  paidMonth: string | null;
  pays: StaffPay[];
}

export interface CurrencyConfig {
  code: string;
  symbol: string;
  name: string;
  rate: number;
  position: 'left' | 'right';
  decimals: number;
}

export const DEFAULT_CURRENCIES: CurrencyConfig[] = [
  { code: 'TRY', symbol: '₺', name: 'Türk Lirası (TRY)', rate: 1, position: 'right', decimals: 2 },
  { code: 'USD', symbol: '$', name: 'US Dollar (USD)', rate: 0.028, position: 'left', decimals: 2 },
  { code: 'EUR', symbol: '€', name: 'Euro (EUR)', rate: 0.026, position: 'right', decimals: 2 },
  { code: 'GBP', symbol: '£', name: 'British Pound (GBP)', rate: 0.022, position: 'left', decimals: 2 },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real (BRL)', rate: 0.16, position: 'left', decimals: 2 },
  { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal (SAR)', rate: 0.11, position: 'right', decimals: 2 },
  { code: 'RUB', symbol: '₽', name: 'Russian Ruble (RUB)', rate: 2.6, position: 'right', decimals: 2 },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan (CNY)', rate: 0.20, position: 'left', decimals: 2 },
  { code: 'PLN', symbol: 'zł', name: 'Polish Zloty (PLN)', rate: 0.11, position: 'right', decimals: 2 },
  { code: 'RON', symbol: 'lei', name: 'Romanian Leu (RON)', rate: 0.13, position: 'right', decimals: 2 },
];

export interface Settings {
  storeName: string;
  address: string;
  phone: string;
  taxOffice: string;
  taxNo: string;
  brandTitle: string;
  logoIcon: string;
  /** Bayinin kendi logosu — data URL (PNG). Boşsa logoIcon simgesi kullanılır. */
  customerLogo?: string;
  receiptHeader: string;
  receiptFooter: string;
  autoShowReceipt: boolean;
  waPhone: string;
  waDebtTemplate: string;
  openingCash: number;
  theme: string;
  currency: {
    active: string;
    currencies: CurrencyConfig[];
  };
  cfd: {
    enabled: boolean;
    promoText: string;
    showQr: boolean;
    qrData: string;
  };
  sound: { enabled: boolean; volume: number; preset: string };
  autobackup: {
    enabled: boolean;
    interval: number;
    folder: string;
    keepDays: number;
    lastRun: string | null;
  };
  /** İsteğe bağlı kapatılabilen ana modüller (sekmeler) — ülkeye/müşteriye göre. */
  modules: {
    imkart: boolean;   // Ulaşım Kartı sekmesi
    delivery: boolean; // Paket Sipariş sekmesi
    posint: boolean;   // POS Entegrasyonu sekmesi (varsayılan kapalı)
  };
  report: {
    enabled: boolean;
    ownerPhone: string;
    closeTime: string;
    sendTime: string;
    times: string[];
    provider: 'meta' | 'web' | 'webhook';
    phoneId: string;
    apiKey: string;
    template: string;
    webhook: string;
    items: string[];
    lastSent: string | null;
    lastSlots: Record<string, string>;
  };
  email: {
    enabled: boolean;
    provider: 'emailjs' | 'resend' | 'smtp' | 'sendgrid' | 'mailgun' | 'mailjet' | 'brevo' | 'smtp2go';
    serviceId: string;
    templateId: string;
    publicKey: string;
    /** EmailJS Private API Key, Resend/SendGrid/Brevo/SMTP2GO API Key veya Mailjet Secret Key */
    privateKey: string;
    /** Mailgun gönderim alan adı */
    domain?: string;
    /** API sağlayıcıları için gönderici adresi */
    fromEmail?: string;
    toEmail: string;
    fromName: string;
    /** SMTP doğrudan gönderim (Electron/.exe için — Nodemailer) */
    smtpHost: string;
    smtpPort: number;
    smtpStarttls: boolean; // true = STARTTLS (587), false = SSL (465)
    smtpUser: string;
    smtpPass: string;
    smtpFrom: string;
    times: string[];
    lastSent: string | null;
    lastSlots: Record<string, string>;
  };
  update: {
    currentVersion: string;
    lastPackageVersion: string | null;
    lastPackageDate: string | null;
    lastPackageName: string | null;
    lastCheckedAt: string | null;
    seedMigration?: string;
  };
  criticalDefault: number;
  kentkartLimit: number;
  kkartDiscount: number;
  /** WebRTC mobil bağlantı için sabit kod. Boşsa rastgele kod üretilir. */
  mobileSyncCode: string;
  /** Telefon davranışları — kullanıcı Ayarlar'dan açıp kapatabilir. */
  mobile: {
    /** Satış sırasında ekranın kapanmaması (Screen Wake Lock) */
    wakeLock: boolean;
    /** Sürekli barkod okutma: kamera açık kalır, okuttukça sepete ekler */
    continuousScan: boolean;
  };
  /** Kullanıcı PIN kodları — 4 haneli. Anahtar: kullanıcı id (u1/u2/u3) */
  pins: Record<string, string>;
  /** Donanım entegrasyonu — aktif ekipmanlar (reader, receipt, label, scale, drawer, display) */
  hardware: {
    enabledDevices: string[];
  };
  ui: {
    productImgH: number;
    productImgScale: number;
    productImgFit: 'cover' | 'contain';
    fullCardImage: boolean;
    /** Telefonda (genişlik < 768px) ürün kartlarının kolon sayısı: 2 / 3 / 4 */
    mobileCols: number;
    /** Telefonda ürün görsel kutusunun yüksekliği (px) */
    mobileImgH: number;
    showNameOnImage: boolean;
    showPriceOnImage: boolean;
    overlayEnabled: boolean;
    overlayText: string;
    overlaySize: number;
    overlayColor: string;
    overlayBg: string;
    overlayBgTransparent: boolean;
    overlayPos: 'left' | 'center' | 'right';
    nameSize: number;
    nameWeight: number;
    nameColor: string;
    priceColor: string;
    stockColor: string;
  };
  /** POS Entegrasyonu - Profesyonel Çoklu Bağlantı Desteği */
  pos: {
    enabled: boolean;
    brand: string;           // BEKO, ZIRAAT, GARANTI, YKB, AKBANK, ISBANK, VAKIF, DENIZ, QNB, ING, FINANS, vs.
    model: string;           // Model numarası
    country: string;         // Ülke kodu (tr, en, de, ...) — marka kataloğunu filtreler
    connectionType: 'tcp' | 'serial' | 'usb' | 'mobile' | 'http';
    // TCP/IP
    tcpIp?: string;
    tcpPort?: number;
    // Seri Port (RS232)
    serialPort?: string;
    serialBaudRate?: number;
    serialDataBits?: 7 | 8;
    serialParity?: 'none' | 'even' | 'odd';
    serialStopBits?: 1 | 2;
    // HTTP API
    httpEndpoint?: string;
    httpApiKey?: string;
    // Mobil POS (SIM kartlı)
    mobileIp?: string;
    mobilePort?: number;
    mobileApn?: string;
    // Ortak ayarlar
    encoding?: 'utf8' | 'cp857' | 'cp1254';
    cutPaper?: boolean;
    beepOnPrint?: boolean;
    openDrawer?: boolean;
    // Test
    lastTestAt?: string;
    lastTestResult?: 'success' | 'failed';
    lastTestError?: string;
  };
  /** Fiş yazıcı (ESC/POS termal — ağ TCP 9100 veya USB) */
  printer: {
    enabled: boolean;
    /** Bağlantı türü: ağ (TCP 9100) veya USB (işletim sistemine kurulu yazıcı) */
    connection: 'tcp' | 'usb';
    ip: string;
    port: number;
    paperWidth: 80 | 58;
    cutPaper: boolean;
    openDrawer: boolean;
    /** USB: sistem yazıcısının adı (Windows'da "EPSON TM-T20II" gibi) */
    usbName: string;
    lastTestAt?: string;
    lastTestResult?: 'success' | 'failed';
    lastTestError?: string;
  };
  /** Etiket yazıcı (ZPL/TSPL termal — Zebra/TSC/Argox, TCP 9100 veya USB) */
  label: {
    enabled: boolean;
    protocol: 'zpl' | 'tspl';
    connection: 'tcp' | 'usb';
    ip: string;
    port: number;
    /** Etiket ölçüsü (mm) */
    widthMm: number;
    heightMm: number;
    /** Baskı yoğunluğu (dpi) */
    density: 203 | 300;
    copies: number;
    showPrice: boolean;
    lastTestAt?: string;
    lastTestResult?: 'success' | 'failed';
    lastTestError?: string;
  };
  /** Bulut yedekleme — Google Drive / Dropbox */
  cloud: {
    enabled: boolean;           // otomatik yükleme (her yedeklemede buluta da gönder)
    provider: 'none' | 'gdrive' | 'dropbox';
    encrypt: boolean;
    encryptPass: string;
    folder: string;             // Drive: klasör adı · Dropbox: yol (örn /MOSBARKOD)
    gdriveClientId: string;
    gdriveClientSecret: string;
    gdriveRefreshToken: string;
    dropboxToken: string;
    lastUpload: string | null;
    lastError: string;
  };
}

export interface CashMove {
  id: string;
  date: string;
  dir: 'in' | 'out';
  amount: number;
  label: string;
  by: string;
}

export interface PosClose {
  id: string;
  date: string;
  device: 1 | 2;
  amount: number;
  by: string;
}

export type DeliverySource = 'telefon' | 'whatsapp';
export type DeliveryStatus = 'yeni' | 'hazirlaniyor' | 'hazir' | 'kurye-yolda' | 'teslim-edildi' | 'iptal';
export type DeliveryPayMethod = 'nakit' | 'kart' | 'nakit+pos';

export interface DeliveryOrder {
  id: string;
  no: string;
  date: string;
  source: DeliverySource;
  customerName: string;
  phone: string;
  address: string;
  note?: string;
  courier?: string;
  status: DeliveryStatus;
  payMethod: DeliveryPayMethod;
  cashPart: number;
  posPart: number;
  items: CartLine[];
  subtotal: number;
  discountPct: number;
  discountAmt: number;
  deliveryFee: number;
  total: number;
  preparedAt?: string;
  sentAt?: string;
  deliveredAt?: string;
  paid: boolean;
  saleId?: string;
}

/** Stok sayımı kaydı (denetim izi) */
export interface StockCountEntry {
  productId: string;
  name: string;
  unit: string;
  before: number;
  after: number;
  diff: number;
  value: number;
}

export interface StockCountSession {
  id: string;
  date: string;
  by: string;
  entries: StockCountEntry[];
}

export interface AppState {
  products: Product[];
  sales: Sale[];
  deliveries: DeliveryOrder[];
  customers: Customer[];
  expenses: Expense[];
  invoices: Invoice[];
  staff: Staff[];
  imkart: Imkart;
  cashMoves: CashMove[];
  posCloses: PosClose[];
  stockCounts: StockCountSession[];
  settings: Settings;
}

/* ---------------- helpers & dynamic currency ---------------- */

let _activeCurrencyCode = 'TRY';

export const setActiveCurrencyCode = (code: string) => {
  _activeCurrencyCode = code || 'TRY';
};

export const getActiveCurrencyCode = () => _activeCurrencyCode;

export const round2 = (n: number) => Math.round(n * 100) / 100;

export const fmt = (n: number, currencyCodeOverride?: string) => {
  const code = currencyCodeOverride || _activeCurrencyCode || 'TRY';
  const cur = DEFAULT_CURRENCIES.find((c) => c.code === code) ?? DEFAULT_CURRENCIES[0];
  // Tüm tutarlar TL bazında saklanır; gösterim aktif birime çevrilir (tutar × kur).
  const converted = n * _fxRate(code);
  const dec = cur.decimals ?? 2;
  const numStr = converted.toLocaleString('tr-TR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  return cur.position === 'left' ? `${cur.symbol} ${numStr}` : `${numStr} ${cur.symbol}`;
};

/** Kullanıcının yazdığı tutarı (aktif birim) kayıt birimine (TL) çevirir. */
export const toTRY = (n: number, code: string = _activeCurrencyCode) => {
  const r = _fxRate(code);
  return round2(r > 0 ? n / r : n);
};

/** Kayıtlı TL tutarı aktif birimde gösterir (girdi ön-doldurmaları için). */
export const fromTRY = (n: number, code: string = _activeCurrencyCode) => round2(n * _fxRate(code));

/** Aktif para biriminin sembolü (girdi yer tutucuları için). */
export const activeSymbol = (code: string = _activeCurrencyCode) =>
  DEFAULT_CURRENCIES.find((c) => c.code === code)?.symbol ?? '₺';

export const fmtN = (n: number) =>
  n.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 1 });
export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-3);
export const todayKey = (d = new Date()) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};
export const isToday = (iso: string) => {
  const d = new Date(iso);
  return todayKey(d) === todayKey();
};
export const dstr = (iso: string) =>
  new Date(iso).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: '2-digit' });
export const tstr = (iso: string) =>
  new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

const daysAgo = (n: number, h = 12, m = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};

/* ---------------- meta ---------------- */

export const CATEGORIES: { name: string; chip: string; dot: string }[] = [
  { name: 'Bira', chip: 'bg-[#6d4318] text-[#f0dcbd] border-[#8a5a2b]', dot: '#d08b3c' },
  { name: 'Raki', chip: 'bg-[#dcdad2] text-[#22252b] border-[#efede6]', dot: '#dcdad2' },
  { name: 'Viski', chip: 'bg-[#54201f] text-[#f0c8c6] border-[#6f2b2a]', dot: '#c05a5e' },
  { name: 'Sigara & Tütün', chip: 'bg-[#2b333d] text-[#c9d3de] border-[#3a4552]', dot: '#8fa0b2' },
  { name: 'Meşrubat', chip: 'bg-[#6e1c1c] text-[#f5caca] border-[#8c2929]', dot: '#e05252' },
  { name: 'Atıştırmalık', chip: 'bg-[#1c4a31] text-[#c4ecd6] border-[#2a6b46]', dot: '#3fae72' },
  { name: 'Kuru Yemiş', chip: 'bg-[#63501a] text-[#f4e6bd] border-[#7f6820]', dot: '#e3b341' },
  { name: 'Kahve & Çay', chip: 'bg-[#452f1e] text-[#e8d5c0] border-[#5f4630]', dot: '#c69a6d' },
];

export const PRICE_MODES: { id: PriceMode; label: string; calc: (p: Product, s: Settings) => number }[] = [
  { id: 'f1', label: 'Fiyat 1', calc: (p) => p.p1 },
  { id: 'f2', label: 'Fiyat 2', calc: (p) => p.p2 },
  { id: 'f3', label: 'Fiyat 3', calc: (p) => p.p3 },
  // Kredi kartı satışı F1 ile birebir aynı tutardır.
  { id: 'kkart', label: 'K.Kartı', calc: (p) => p.p1 },
  // Taksitli satış fiyatı ürün kartından elle girilir; boşsa F1 kullanılır.
  { id: 'taksit', label: 'Taksit', calc: (p) => (p.installment && p.installment > 0 ? round2(p.installment) : p.p1) },
];

export const priceOf = (p: Product, m: PriceMode, s: Settings) =>
  PRICE_MODES.find((x) => x.id === m)!.calc(p, s);

export const USERS = [
  { id: 'u1', name: 'Admin', sub: 'Yönetici', color: '#f59e0b' },
  { id: 'u2', name: 'Kasiyer 1', sub: 'Furkan', color: '#5aa2f0' },
  { id: 'u3', name: 'Kasiyer 2', sub: 'Deniz', color: '#2fd6a5' },
];

/** Giriş ekranı kart temaları */
export const USER_THEMES: Record<string, { bg: string; border: string; text: string; label: string }> = {
  u1: { bg: 'linear-gradient(160deg,#08090b 0%,#121317 60%,#0b0c0e 100%)', border: '#f59e0b', text: '#fbbf24', label: 'YÖNETİCİ' },
  u2: { bg: 'linear-gradient(160deg,#04211a 0%,#08352a 55%,#052b22 100%)', border: '#10b981', text: '#6ee7b7', label: 'KASİYER' },
  u3: { bg: 'linear-gradient(160deg,#2c3d08 0%,#456111 55%,#33470b 100%)', border: '#a3e635', text: '#d9f99d', label: 'KASİYER' },
};

export const ADMIN_ID = 'u1';

export const EXPENSE_CATS: { name: string; color: string }[] = [
  { name: 'Kira', color: '#e05252' },
  { name: 'Elektrik', color: '#e3b341' },
  { name: 'Su', color: '#5aa2f0' },
  { name: 'Personel', color: '#2fd6a5' },
  { name: 'Vergi & Resmi', color: '#b083f0' },
  { name: 'Muhasebe', color: '#38bdf8' },
  { name: 'Stopaj', color: '#fb7185' },
  { name: 'İnternet', color: '#60a5fa' },
  { name: 'Temizlik Malzemesi', color: '#34d399' },
  { name: 'Temizlik Hizmeti', color: '#14b8a6' },
  { name: 'Teknik Servis Hizmetleri', color: '#f97316' },
  { name: 'Tedarik', color: '#f59e0b' },
  { name: 'Diğer Harcamalar', color: '#7d8ca0' },
];

export const METHOD_META: Record<PayMethod, { label: string; color: string }> = {
  nakit: { label: 'Nakit', color: '#2fd6a5' },
  kart: { label: 'Kredi Kartı', color: '#5aa2f0' },
  'nakit+pos': { label: 'Nakit + POS', color: '#f59e0b' },
  veresiye: { label: 'Veresiye', color: '#e05252' },
};

export const VIEWS_LOCKED_FOR_CASHIER: ViewId[] = ['purchase', 'expense', 'staff', 'settings'];

/** Kapatılabilen ana modüller (sekmeler). */
export type ModuleId = 'imkart' | 'delivery' | 'posint';

/** Bir modülün açık olup olmadığını döndürür (tanımsızsa açık kabul edilir). */
export const moduleEnabled = (settings: Settings, mod: ModuleId): boolean => settings.modules?.[mod] !== false;

export const REPORT_ITEMS: { id: string; label: string; desc: string }[] = [
  { id: 'ciro', label: 'Toplam satış cirosu', desc: 'Günlük toplam satış tutarı' },
  { id: 'brutKar', label: 'Brüt kâr', desc: 'Satış cirosu eksi ürün maliyeti' },
  { id: 'netKar', label: 'Net kâr', desc: 'Brüt kâr eksi günlük masraflar' },
  { id: 'kasaNakit', label: 'Kasadaki nakit', desc: 'Nakit satış ve kasa hareketleri' },
  { id: 'posPara', label: "POS'lardaki para", desc: 'Günlük POS tahsilat toplamı' },
  { id: 'gunlukVeresiye', label: 'Günlük veresiye', desc: 'Veresiye kapatılan satışlar' },
  { id: 'veresiyeBakiye', label: 'Toplam veresiye bakiyesi', desc: 'Müşterilerden toplam alacak' },
  { id: 'imkartDolum', label: 'Ulaşım Kartı dolum miktarı', desc: 'Kartlara yapılan dolum' },
  { id: 'imkartSatis', label: 'Ulaşım Kartı satış miktarı', desc: 'Limit satın alma (depozito)' },
  { id: 'masrafToplam', label: 'Günlük masraf toplamı', desc: 'Masraf defterindeki günlük giderler' },
  { id: 'masrafKalemleri', label: 'Masraf kalemleri', desc: 'Kategori kategori döküm' },
  { id: 'alisFatura', label: 'Günlük alış fatura toplamı', desc: 'Gün içi tedarik alış tutarı' },
  { id: 'stokEkleme', label: 'Stoğa eklenen ürünler', desc: 'Alış faturalarından gelen adetler' },
  { id: 'kahveSatis', label: 'Kahve satışları', desc: 'Kahve & Çay kategorisi cirosu' },
  { id: 'fisAdedi', label: 'Fiş adedi', desc: 'Günlük tamamlanan satış sayısı' },
  { id: 'enCokSatilan', label: 'En çok satan ürünler', desc: 'Günün en çok satan ilk 5 ürünü' },
];

export const ALL_REPORT_IDS = REPORT_ITEMS.map((i) => i.id);

/* ---------------- seed data ---------------- */

/* Görseller uygulamanın içine gömülüdür (internet gerekmez) — bkz. lib/seedImages.ts */
const IMG = {
  tuborg: SEED_IMAGES.biraKutu,
  efes: SEED_IMAGES.biraSise,
  corona: SEED_IMAGES.biraAcik,
  cola: SEED_IMAGES.kola,
  raki1: SEED_IMAGES.rakiKucuk,
  raki2: SEED_IMAGES.rakiBuyuk,
  viski1: SEED_IMAGES.viski1,
  viski2: SEED_IMAGES.viski2,
  cips1: SEED_IMAGES.cips,
  cips2: SEED_IMAGES.fistik,
  snack1: SEED_IMAGES.misirCerez,
  nuts1: SEED_IMAGES.kuruyemisKarisik,
  nuts2: SEED_IMAGES.antepFistigi,
};

const mkP = (
  name: string,
  barcode: string,
  category: string,
  stock: number,
  unit: string,
  p1: number,
  p2: number,
  p3: number,
  critical: number,
  image?: string,
  vat?: number
): Product => ({
  id: 'p' + barcode.slice(-6),
  name,
  barcode,
  category,
  stock,
  unit,
  p1,
  p2,
  p3,
  cost: round2(p1 * 0.62),
  critical,
  image,
  ...(vat != null ? { vatRate: vat } : {}),
});

export const defaultProducts = (): Product[] => [
  mkP('Tuborg Gold Kütü 50cl', '8691041001111', 'Bira', 128, 'adet', 75, 70, 79.5, 24, IMG.tuborg),
  mkP('Efes Malt Şişe 50cl', '8691041002222', 'Bira', 95, 'adet', 72, 68, 76.5, 24, IMG.efes),
  mkP('Carlsberg Kütü 50cl', '8691041003333', 'Bira', 15, 'adet', 80, 74, 84, 20, SEED_IMAGES.biraKutu2),
  mkP('Corona Extra 33cl', '8691041004444', 'Bira', 47, 'adet', 110, 104, 116, 12, IMG.corona),
  mkP('Yeni Rakı 5cl', '8691041005555', 'Raki', 27, 'adet', 9.5, 8.5, 10.5, 12, IMG.raki1),
  mkP('Bozcaada 35% 70cl', '8691041006666', 'Raki', 18, 'adet', 985, 940, 1030, 6, IMG.raki2),
  mkP("Ballantine's 12 Yıl 1L", '8691041007777', 'Viski', 12, 'adet', 1450, 1380, 1520, 4, IMG.viski1),
  mkP('Chivas Regal 12 Yıl 1L', '8691041008888', 'Viski', 9, 'adet', 1520, 1450, 1590, 4, IMG.viski2),
  mkP('Marlboro Red (Kısa)', '8691041009999', 'Sigara & Tütün', 250, 'paket', 77, 74, 80, 40, SEED_IMAGES.sigaraKirmizi),
  mkP('Marlboro Gold', '8691041010101', 'Sigara & Tütün', 180, 'paket', 82, 79, 86, 40, SEED_IMAGES.sigaraAltin),
  mkP('Coca-Cola 33cl', '8691041011111', 'Meşrubat', 120, 'adet', 35, 32, 38, 24, IMG.cola),
  mkP('Ayran 1L', '8691041012121', 'Meşrubat', 64, 'adet', 22, 20, 24, 12, SEED_IMAGES.ayran),
  mkP('Cips Büyük Boy', '8691041013131', 'Atıştırmalık', 210, 'adet', 45, 42, 48, 30, IMG.cips1),
  mkP('Mısır Atıştırmalık 45g', '8691041014141', 'Atıştırmalık', 160, 'adet', 28, 26, 31, 30, IMG.snack1),
  mkP('Karışık Lüks Kuru Yemiş (Dökme)', '8691041015151', 'Kuru Yemiş', 15.5, 'kg', 380, 350, 400, 8, IMG.nuts1),
  mkP('Tuzlu Fıstık (Dökme)', '8691041016161', 'Kuru Yemiş', 25, 'kg', 220, 200, 235, 10, IMG.cips2),
  mkP('Kavrulmuş Antep Fıstığı (Dökme)', '8691041017171', 'Kuru Yemiş', 12.5, 'kg', 480, 450, 500, 8, IMG.nuts2),
  mkP('Filtre Kahve 250g', '8691041018181', 'Kahve & Çay', 40, 'adet', 320, 300, 340, 10, SEED_IMAGES.kahveFiltre),
  mkP('Kahve Telvesi 250g', '8691041019191', 'Kahve & Çay', 22, 'adet', 260, 240, 280, 10, SEED_IMAGES.kahveTelve),
  mkP('Siyah Çay 250g', '8691041020201', 'Kahve & Çay', 55, 'adet', 85, 78, 90, 12, SEED_IMAGES.cay),
  mkP('Sütlü Çikolata 60g', '8691041021211', 'Çikolata & Gofret', 90, 'adet', 45, 42, 48, 15, SEED_IMAGES.cikolataSutlu, 10),
  mkP('Bitter Çikolata 60g', '8691041022221', 'Çikolata & Gofret', 70, 'adet', 50, 47, 54, 12, SEED_IMAGES.cikolataBitter, 10),
  mkP('Fındıklı Gofret 45g', '8691041023231', 'Çikolata & Gofret', 110, 'adet', 30, 28, 33, 20, SEED_IMAGES.gofret, 10),
  mkP('Karamelli Çikolata Bar 50g', '8691041024241', 'Çikolata & Gofret', 95, 'adet', 35, 32, 38, 15, SEED_IMAGES.cikolataKaramelli, 10),
  mkP('Patates Cipsi Sade 130g', '8691041025251', 'Atıştırmalık', 85, 'adet', 65, 60, 70, 15, SEED_IMAGES.cipsPatates),
  mkP('Nacho Mısır Cipsi 120g', '8691041026261', 'Atıştırmalık', 75, 'adet', 60, 56, 65, 15, SEED_IMAGES.cipsNacho),
  mkP('Yoğurtlu Baharatlı Cips 120g', '8691041027271', 'Atıştırmalık', 70, 'adet', 60, 56, 65, 15, SEED_IMAGES.cipsBaharatli),
  mkP('Vanilyalı Dondurma 500ml', '8691041028281', 'Dondurma', 30, 'adet', 120, 112, 128, 8, SEED_IMAGES.dondurmaVanilya, 10),
  mkP('Kakaolu Dondurma 500ml', '8691041029291', 'Dondurma', 30, 'adet', 120, 112, 128, 8, SEED_IMAGES.dondurmaKakaolu, 10),
  mkP('Çilekli Dondurma 500ml', '8691041030301', 'Dondurma', 28, 'adet', 120, 112, 128, 8, SEED_IMAGES.dondurmaCilekli, 10),
  mkP('Çikolata Kaplı Vanilya Bar 90ml', '8691041031311', 'Dondurma', 60, 'adet', 55, 52, 58, 12, SEED_IMAGES.dondurmaBar, 10),
  mkP('Külah Dondurma Karışık 120ml', '8691041032321', 'Dondurma', 65, 'adet', 45, 42, 48, 12, SEED_IMAGES.dondurmaKulah, 10),
  mkP('Domates (Dökme)', '8691041033331', 'Manav', 30, 'kg', 40, 36, 44, 5, SEED_IMAGES.domates, 1),
  mkP('Salatalık (Dökme)', '8691041034341', 'Manav', 25, 'kg', 35, 32, 38, 5, SEED_IMAGES.salatalik, 1),
  mkP('Elma (Dökme)', '8691041035351', 'Manav', 28, 'kg', 50, 46, 54, 5, SEED_IMAGES.elma, 1),
  mkP('Muz (Dökme)', '8691041036361', 'Manav', 20, 'kg', 80, 74, 86, 4, SEED_IMAGES.muz, 1),
  mkP('Patates (Dökme)', '8691041037371', 'Manav', 50, 'kg', 20, 18, 22, 8, SEED_IMAGES.patates, 1),
  mkP('Kuru Soğan (Dökme)', '8691041038381', 'Manav', 45, 'kg', 22, 20, 24, 8, SEED_IMAGES.sogan, 1),
  mkP('Limon (Dökme)', '8691041039391', 'Manav', 15, 'kg', 45, 42, 48, 3, SEED_IMAGES.limon, 1),
  mkP('Maydanoz (Demet)', '8691041040401', 'Manav', 40, 'adet', 10, 9, 11, 8, SEED_IMAGES.maydanoz, 1),
];

/** v1.14.0 ile gelen 20 yeni örnek ürünün barkodları — göçte yalnızca eksik olanlar eklenir. */
const SEED_114_BARCODES = new Set([
  '8691041021211', '8691041022221', '8691041023231', '8691041024241', '8691041025251',
  '8691041026261', '8691041027271', '8691041028281', '8691041029291', '8691041030301',
  '8691041031311', '8691041032321', '8691041033331', '8691041034341', '8691041035351',
  '8691041036361', '8691041037371', '8691041038381', '8691041039391', '8691041040401',
]);

export const defaultCustomers = (): Customer[] => [
  {
    id: 'c1',
    name: 'Ahmet Yılmaz',
    phone: '0532 111 22 33',
    balance: 450,
    entries: [{ date: daysAgo(2, 19), type: 'satış', amount: 450, note: 'Yeni Rakı 5cl x20' }],
  },
  {
    id: 'c2',
    name: 'Çaycı Recep',
    phone: '0533 444 55 66',
    balance: 1200,
    entries: [
      { date: daysAgo(12, 10), type: 'satış', amount: 1600, note: 'Toplu içecek alımı' },
      { date: daysAgo(4, 15), type: 'tahsilat', amount: 400, note: 'Nakit tahsilat' },
    ],
  },
  {
    id: 'c3',
    name: 'Mehmet Demir',
    phone: '0535 777 88 99',
    balance: 0,
    entries: [
      { date: daysAgo(20, 18), type: 'satış', amount: 300, note: 'Kuru yemiş' },
      { date: daysAgo(6, 11), type: 'tahsilat', amount: 300, note: 'Tamamı tahsil edildi' },
    ],
  },
];

function seedSales(products: Product[], customers: Customer[]): Sale[] {
  const counts = [5, 7, 4, 6, 4, 5, 3]; // day0..day6
  const methods: PayMethod[] = ['nakit', 'kart', 'nakit', 'nakit+pos', 'nakit', 'kart', 'veresiye'];
  const regs = [1, 2, 3];
  const out: Sale[] = [];
  let n = 1;
  const year = new Date().getFullYear();
  for (let d = 6; d >= 0; d--) {
    const count = counts[d];
    for (let i = 0; i < count; i++) {
      const nItems = 1 + ((i + d) % 3);
      const items: SaleItem[] = [];
      const base = (d * 5 + i * 3) % products.length;
      for (let j = 0; j < nItems; j++) {
        const p = products[(base + j * 5) % products.length];
        const qty = 1 + ((i + j) % 3);
        items.push({ name: p.name, qty, unit: p.unit, unitPrice: p.p1 });
      }
      const subtotal = round2(items.reduce((s, x) => s + x.qty * x.unitPrice, 0));
      const method = methods[(i + d) % methods.length];
      const dt = new Date();
      dt.setDate(dt.getDate() - d);
      dt.setHours(9 + ((i * 2 + d) % 11), (i * 17 + d * 23) % 60, 0, 0);
      const customer =
        method === 'veresiye'
          ? customers[(i + d) % customers.length].name
          : undefined;
      out.push({
        id: 'seed' + d + '-' + i,
        no: `F-${year}-${String(n++).padStart(4, '0')}`,
        date: dt.toISOString(),
        register: regs[(i + d) % 3],
        cashier: USERS[1 + ((i + d) % 2)].name,
        mode: 'f1',
        items,
        subtotal,
        discountPct: 0,
        discountAmt: 0,
        total: subtotal,
        method,
        received: subtotal,
        change: 0,
        cash: method === 'nakit' || method === 'nakit+pos' ? subtotal : 0,
        pos: method === 'kart' || method === 'nakit+pos' ? subtotal : 0,
        customer,
      });
    }
  }
  return out.reverse();
}

export const defaultInvoices = (): Invoice[] => [
  {
    id: 'inv1',
    no: 'AF2608197063',
    supplierNo: 'TTB-2024-88190',
    docType: 'e-fatura',
    taxNo: '8790012345',
    date: daysAgo(3, 11),
    supplier: 'Türk Tuborg Bayii',
    payType: 'nakit',
    vatIncluded: false,
    lines: [
      { name: 'Efes Malt Şişe 50cl', qty: 48, cost: 42, sale: 72, vatRate: 20 },
      { name: 'Tuborg Gold Kütü 50cl', qty: 36, cost: 45, sale: 75, vatRate: 20 },
    ],
    subtotal: 3636,
    vatTotal: 727.2,
    total: 4363.2,
    status: 'odendi',
  },
  {
    id: 'inv2',
    no: 'AF2608193200',
    supplierNo: 'AKY-2024-1177',
    docType: 'e-arsiv',
    taxNo: '4560098765',
    date: daysAgo(1, 14),
    supplier: 'Anadolu Kuru Yemiş',
    payType: 'veresiye',
    vatIncluded: false,
    lines: [
      { name: 'Antep Fıstığı (Dökme)', qty: 10, cost: 380, sale: 480, vatRate: 1 },
      { name: 'Tuzlu Fıstık (Dökme)', qty: 15, cost: 180, sale: 220, vatRate: 1 },
    ],
    subtotal: 6500,
    vatTotal: 65,
    total: 6565,
    status: 'bekliyor',
  },
];

export const defaultExpenses = (): Expense[] => [
  { id: 'ex1', date: daysAgo(1, 9), category: 'Elektrik', amount: 850, note: 'Aylık elektrik faturası', vatRate: 20, vatIncluded: true, hasInvoice: true },
  { id: 'ex2', date: daysAgo(3, 10), category: 'Kira', amount: 8500, note: 'Dükkan kirası', vatRate: 0, vatIncluded: true, hasInvoice: false },
  { id: 'ex3', date: daysAgo(5, 16), category: 'Vergi & Resmi', amount: 1240, note: 'Damga vergisi', vatRate: 0, vatIncluded: true, hasInvoice: false },
  { id: 'ex4', date: daysAgo(0, 11), category: 'Diğer', amount: 130, note: 'Temizlik malzemesi', vatRate: 20, vatIncluded: true, hasInvoice: true },
];

export const defaultStaff = (): Staff[] => [
  { id: 's1', name: 'Furkan A.', role: 'Kasiyer', phone: '0532 111 22 33', salary: 24000, paidMonth: null, pays: [] },
  { id: 's2', name: 'Deniz K.', role: 'Kasiyer', phone: '0533 999 00 11', salary: 23500, paidMonth: null, pays: [] },
  {
    id: 's3',
    name: 'Ali V.',
    role: 'Depo Sorumlusu',
    phone: '0535 222 33 44',
    salary: 26000,
    paidMonth: new Date().toISOString().slice(0, 7),
    pays: [{ id: 'sp3', date: daysAgo(5, 10), amount: 26000, type: 'maas', note: 'Maaş ödemesi' }],
  },
];

export const defaultUI = () => ({
  productImgH: 92,
  productImgScale: 100,
  productImgFit: 'cover' as const,
  fullCardImage: true,
  mobileCols: 3,
  mobileImgH: 40,
  showNameOnImage: true,
  showPriceOnImage: true,
  overlayEnabled: false,
  overlayText: 'İNDİRİM -%20',
  overlaySize: 12,
  overlayColor: '#ffffff',
  overlayBg: '#d92d20',
  overlayBgTransparent: false,
  overlayPos: 'left' as const,
  nameSize: 12,
  nameWeight: 600,
  nameColor: '#dbe4ee',
  priceColor: '#2fd6a5',
  stockColor: '#7d8ca0',
});

export const defaultSettings = (): Settings => ({
  /* Taze kurulumda kişisel/örnek bilgi yer almaz — işletme Ayarlar'dan kendi bilgilerini girer. */
  storeName: 'MOSBARKODYAZILIM',
  address: '',
  phone: '',
  taxOffice: '',
  taxNo: '',
  brandTitle: 'MOSBARKODYAZILIM',
  logoIcon: 'flame',
  customerLogo: '',
  receiptHeader: 'MOSBARKODYAZILIM - HOŞGELDİNİZ',
  receiptFooter: 'Bizi Tercih Ettiğiniz İçin Teşekkür Ederiz!',
  autoShowReceipt: true,
  waPhone: '',
  waDebtTemplate:
    'Merhaba [MUSTERI_ADI], MOSBARKODYAZILIM veresiye defterindeki güncel borç bakiyeniz [BORC_TUTARI] dir. İyi çalışmalar dileriz.',
  openingCash: 0,
  theme: 'amber',
  currency: {
    active: 'TRY',
    currencies: DEFAULT_CURRENCIES,
  },
  cfd: {
    enabled: true,
    promoText: 'MOSBARKODYAZILIM POS — Hoş Geldiniz! / Günün Fırsatı: Tüm Atıştırmalıklarda %10 İndirim',
    showQr: true,
    qrData: '',
  },
  sound: { enabled: true, volume: 70, preset: 'posOnay' },
  autobackup: {
    enabled: true,
    interval: 5,
    folder: '',
    keepDays: 7,
    lastRun: null,
  },
  modules: { imkart: true, delivery: true, posint: false },
  report: {
    enabled: false,
    ownerPhone: '',
    closeTime: '22:00',
    sendTime: '22:10',
    provider: 'meta',
    phoneId: '',
    apiKey: '',
    template: 'gun_sonu_raporu',
    webhook: '',
    items: ALL_REPORT_IDS,
    lastSent: null,
    times: ['22:10'],
    lastSlots: {},
  },
  email: {
    enabled: false,
    provider: 'emailjs',
    serviceId: '',
    templateId: '',
    publicKey: '',
    privateKey: '',
    domain: '',
    fromEmail: '',
    toEmail: '',
    fromName: 'MOSBARKODYAZILIM',
    smtpHost: '',
    smtpPort: 587,
    smtpStarttls: true,
    smtpUser: '',
    smtpPass: '',
    smtpFrom: '',
    times: ['13:00', '16:00', '20:00', '22:10'],
    lastSent: null,
    lastSlots: {},
  },
  update: {
    currentVersion: appVersionLabel(),
    lastPackageVersion: null,
    lastPackageDate: null,
    lastPackageName: null,
    lastCheckedAt: null,
  },
  criticalDefault: 20,
  kentkartLimit: 3000,
  kkartDiscount: 8,
  mobileSyncCode: 'MOSB',
  mobile: { wakeLock: true, continuousScan: false },
  pins: { u1: '0000', u2: '1111', u3: '2222' },
  hardware: {
    enabledDevices: ['reader', 'receipt', 'scale'],
  },
  ui: defaultUI(),
  pos: {
    enabled: false,
    brand: '',
    model: '',
    country: '',
    connectionType: 'tcp',
    tcpIp: '',
    tcpPort: 2030,
    serialPort: '',
    serialBaudRate: 9600,
    serialDataBits: 8,
    serialParity: 'none',
    serialStopBits: 1,
    httpEndpoint: '',
    httpApiKey: '',
    mobileIp: '',
    mobilePort: 2030,
    mobileApn: '',
    encoding: 'cp857',
    cutPaper: true,
    beepOnPrint: true,
    openDrawer: false,
  },
  printer: {
    enabled: false,
    connection: 'tcp',
    ip: '',
    port: 9100,
    paperWidth: 80,
    cutPaper: true,
    openDrawer: false,
    usbName: '',
  },
  label: {
    enabled: false,
    protocol: 'zpl',
    connection: 'tcp',
    ip: '',
    port: 9100,
    widthMm: 40,
    heightMm: 25,
    density: 203,
    copies: 1,
    showPrice: true,
  },
  cloud: {
    enabled: false,
    provider: 'none',
    encrypt: true,
    encryptPass: '',
    folder: 'MOSBARKOD_Yedekler',
    gdriveClientId: '',
    gdriveClientSecret: '',
    gdriveRefreshToken: '',
    dropboxToken: '',
    lastUpload: null,
    lastError: '',
  },
});

export const defaultState = (): AppState => {
  const products = defaultProducts();
  const customers = defaultCustomers();
  return {
    products,
    sales: seedSales(products, customers),
    deliveries: [],
    customers,
    expenses: defaultExpenses(),
    invoices: defaultInvoices(),
    staff: defaultStaff(),
    imkart: { limit: 3000, txns: [] },
    cashMoves: [],
    posCloses: [],
    stockCounts: [],
    settings: defaultSettings(),
  };
};

/* ---------------- persistence ---------------- */

const KEY = 'mosbarkod_v15_state';

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s && Array.isArray(s.products) && s.settings) {
        const d = defaultSettings();
        const merged: AppState = {
          ...defaultState(),
          ...s,
          settings: {
            ...d,
            ...s.settings,
            sound: { ...d.sound, ...(s.settings.sound || {}) },
            autobackup: { ...d.autobackup, ...(s.settings.autobackup || {}) },
            modules: { ...d.modules, ...(s.settings.modules || {}) },
            report: { ...d.report, ...(s.settings.report || {}) },
            email: { ...d.email, ...(s.settings.email || {}) },
            update: { ...d.update, ...(s.settings.update || {}) },
            ui: { ...d.ui, ...(s.settings.ui || {}) },
            pins: { ...d.pins, ...(s.settings.pins || {}) },
            currency: { ...d.currency, ...(s.settings.currency || {}) },
            cfd: { ...d.cfd, ...(s.settings.cfd || {}) },
            hardware: { ...d.hardware, ...(s.settings.hardware || {}) },
            mobile: { ...d.mobile, ...(s.settings.mobile || {}) },
            printer: { ...d.printer, ...(s.settings.printer || {}) },
            label: { ...d.label, ...(s.settings.label || {}) },
            pos: { ...d.pos, ...(s.settings.pos || {}) },
            cloud: { ...d.cloud, ...(s.settings.cloud || {}) },
          },
        };
        if (merged.settings.currency?.active) {
          setActiveCurrencyCode(merged.settings.currency.active);
        }
        initFx();
        if (merged.settings.pins?.u1 === '1588') {
          merged.settings.pins.u1 = '0000';
        }
        /* v1.8.5 göçü: eski sürümlerin örnek/kişisel varsayılanlarıyla kaydolmuş
           ayarlar varsa temizlenir. Yalnızca birebir eski değere eşitse dokunulur;
           kullanıcının kendi girdiği bilgilere asla karışılmaz. */
        {
          const st = merged.settings;
          if (st.phone === '0312 555 07 07') st.phone = '';
          if (st.address === 'MOSB Sanayi Mah. 7502 Sk. No:41 Sincan / Ankara') st.address = '';
          if (st.taxOffice === 'Sincan Vergi Dairesi') st.taxOffice = '';
          if (st.taxNo === '3880456123') st.taxNo = '';
          if (st.waPhone === '00 90 555 406 61 43') st.waPhone = '';
          if (st.cfd && st.cfd.qrData === 'https://wa.me/905554066143') st.cfd.qrData = '';
          if (st.report && st.report.ownerPhone === '00 90 555 406 61 43') st.report.ownerPhone = '';
          if (st.autobackup && st.autobackup.folder && st.autobackup.folder.includes('mosgu')) st.autobackup.folder = '';
          if (st.update && st.update.currentVersion === 'v1.5.0-PRO') st.update.currentVersion = appVersionLabel();
        }
        /* v1.14.1 göçü (tek seferlik): v1.14.0 ile gelen 20 yeni örnek ürün
           (çikolata/cips/dondurma/manav) kayıtlı envanterde eksikse eklenir;
           POS Entegrasyonu modülü kapalı konuma alınır. Kullanıcının kendi
           ürünlerine ve diğer ayarlarına dokunulmaz. */
        {
          const st = merged.settings;
          if (
            st.update &&
            st.update.seedMigration !== '1.14.1' &&
            st.update.seedMigration !== '1.15.2'
          ) {
            const have = new Set(merged.products.map((p) => p.barcode));
            for (const p of defaultProducts()) {
              if (SEED_114_BARCODES.has(p.barcode) && !have.has(p.barcode)) {
                merged.products.push(p);
                have.add(p.barcode);
              }
            }
            st.modules = { ...st.modules, posint: false };
            st.update.seedMigration = '1.14.1';
          }
        }
        /* v1.15.2 göçü (tek seferlik): örnek ürünlerin gömülü görselleri,
           GÖRSEL YOKKEN kaydedilmiş eski envanterlere de işlenir. Yalnızca
           görseli boş olan ya da eski internet adresi (pexels) taşıyan örnek
           ürünlere dokunulur; kullanıcının kendi eklediği görseller
           (data:/blob: ile başlayanlar) asla değiştirilmez. */
        {
          const st = merged.settings;
          if (st.update && st.update.seedMigration !== '1.15.2') {
            backfillSeedImages(merged.products);
            st.update.seedMigration = '1.15.2';
          }
        }
        if (!merged.imkart) merged.imkart = { limit: 3000, txns: [] };
        if (!Array.isArray(merged.imkart.txns)) merged.imkart.txns = [];
        if (!Array.isArray(merged.cashMoves)) merged.cashMoves = [];
        if (!Array.isArray(merged.posCloses)) merged.posCloses = [];
        if (!Array.isArray(merged.stockCounts)) merged.stockCounts = [];
        if (!Array.isArray(merged.deliveries)) merged.deliveries = [];
        merged.staff = merged.staff.map((st) => ({ 
          ...st,
          pays:
            st.pays ??
            (st.paidMonth
              ? [{ id: 'm' + st.id, date: st.paidMonth + '-15T12:00:00', amount: st.salary, type: 'maas' as const, note: 'Önceki sürüm kaydı' }]
              : []),
        }));
        return merged;
      }
    }
  } catch {
    /* ignore */
  }
  return defaultState();
}

/** Depolama kotası dolduğunda (veya kayıt başarısız olduğunda) tetiklenir.
 *  App.tsx dinleyip kullanıcıya uyarı gösterir — aksi hâlde veri sessizce kaybolur. */
export const SAVE_ERROR_EVENT = 'mosbarkod:save-error';

export function saveState(s: AppState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
    return true;
  } catch (e) {
    /* Kota dolu / özel mod / WebView kısıtı — kullanıcıya haber verilmezse
       satışlar kaydedilmiş gibi görünür ama kaybolur. */
    try {
      const name = (e as { name?: string }).name || 'error';
      window.dispatchEvent(new CustomEvent(SAVE_ERROR_EVENT, { detail: name }));
    } catch {
      /* yoksay */
    }
    return false;
  }
}

export function clearState() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
