/* ==================================================================
   CANLI DÖVİZ KURLARI (baz para birimi: TRY)
   ------------------------------------------------------------------
   - Uygulamadaki TÜM tutarlar TL bazında saklanır.
   - Gösterim: fmt() tutarı aktif para birimine çevirir (tutar × kur).
   - Giriş: kullanıcının yazdığı tutar aktif birimdedir, kayıtta TL'ye
     çevrilir (tutar ÷ kur) — toTRY/fromTRY (data.ts) ile.
   - Kur anlamı: 1 TRY = rate birim X (örn. USD 0.024 → 1 ₺ ≈ $0.024).
   - Kaynak: ücretsiz, anahtarsız API'ler (cihaz internete çıkamazsa
     önbellekteki son kurlar, o da yoksa gömülü tahmini kurlar).
   - Bu modül data.ts'ye BAĞIMLI DEĞİLDİR (döngüsel import olmasın
     diye kod listesi burada tekrar tanımlıdır).
   ================================================================== */

export const FX_CODES = ['TRY', 'USD', 'EUR', 'GBP', 'BRL', 'SAR', 'RUB', 'CNY', 'PLN', 'RON'] as const;
export type FxCode = (typeof FX_CODES)[number];

/** Çevrimdışı + önbelleksiz ilk açılışta kullanılan gömülü tahmini kurlar. */
export const FX_FALLBACK_RATES: Record<string, number> = {
  TRY: 1,
  USD: 0.028,
  EUR: 0.026,
  GBP: 0.022,
  BRL: 0.16,
  SAR: 0.11,
  RUB: 2.6,
  CNY: 0.2,
  PLN: 0.11,
  RON: 0.13,
};

const FX_CACHE_KEY = 'mosbarkod_fx_v1';
export const FX_MAX_AGE_H = 24;
const FX_TIMEOUT_MS = 10000;

const FX_SOURCES = [
  'https://open.er-api.com/v6/latest/TRY',
  'https://api.frankfurter.app/v1/latest?base=TRY',
];

type FxCache = { rates: Record<string, number>; updatedAt: string };

let _rates: Record<string, number> = { ...FX_FALLBACK_RATES };
let _updatedAt = '';
let _inflight: Promise<'updated' | 'offline'> | null = null;
const _subs = new Set<() => void>();

function storage(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

/** 1 TRY = ? X. Geçersizse 1 döner (çevrimsiz güvenli mod). */
export function fxRate(code: string): number {
  const r = _rates[code];
  return typeof r === 'number' && isFinite(r) && r > 0 ? r : 1;
}

export function fxUpdatedAt(): string {
  return _updatedAt;
}

export function isFxStale(maxAgeH = FX_MAX_AGE_H): boolean {
  if (!_updatedAt) return true;
  const t = new Date(_updatedAt).getTime();
  if (!isFinite(t)) return true;
  return Date.now() - t > maxAgeH * 3600 * 1000;
}

export function subscribeFx(fn: () => void): () => void {
  _subs.add(fn);
  return () => {
    _subs.delete(fn);
  };
}

function emit() {
  _subs.forEach((fn) => {
    try {
      fn();
    } catch {
      /* dinleyici hatası akışı bozmasın */
    }
  });
}

export function setFxRates(rates: Record<string, number>, updatedAt: string) {
  const next = { ..._rates };
  for (const code of FX_CODES) {
    const r = rates[code];
    if (typeof r === 'number' && isFinite(r) && r > 0) next[code] = r;
  }
  next.TRY = 1;
  _rates = next;
  _updatedAt = updatedAt;
  emit();
}

/** Önbellekteki son kurları belleğe yükler (açılışta bir kez çağrılır). */
export function initFx() {
  const st = storage();
  if (!st) return;
  try {
    const raw = st.getItem(FX_CACHE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Partial<FxCache>;
    if (parsed && typeof parsed.rates === 'object' && parsed.rates) {
      setFxRates(parsed.rates, typeof parsed.updatedAt === 'string' ? parsed.updatedAt : '');
    }
  } catch {
    /* bozuk önbellek yok sayılır */
  }
}

function persistCache() {
  const st = storage();
  if (!st) return;
  try {
    st.setItem(FX_CACHE_KEY, JSON.stringify({ rates: _rates, updatedAt: _updatedAt } satisfies FxCache));
  } catch {
    /* yazılamazsa sessiz geç */
  }
}

/** API yanıtlarından kur tablosu çıkarır (er-api + frankfurter şekillerini kabul eder). */
export function parseFxPayload(json: unknown): Record<string, number> | null {
  if (!json || typeof json !== 'object') return null;
  const obj = json as Record<string, unknown>;
  const rates = obj.rates;
  if (!rates || typeof rates !== 'object') return null;
  const out: Record<string, number> = {};
  for (const code of FX_CODES) {
    if (code === 'TRY') continue;
    const r = (rates as Record<string, unknown>)[code];
    if (typeof r === 'number' && isFinite(r) && r > 0) out[code] = r;
  }
  return Object.keys(out).length > 0 ? out : null;
}

async function fetchOnce(url: string): Promise<Record<string, number> | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FX_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) return null;
    const json = (await res.json()) as unknown;
    return parseFxPayload(json);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function doRefresh(): Promise<'updated' | 'offline'> {
  try {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'offline';
  } catch {
    /* navigator yoksa devam et */
  }
  for (const url of FX_SOURCES) {
    const rates = await fetchOnce(url);
    if (rates) {
      setFxRates(rates, new Date().toISOString());
      persistCache();
      return 'updated';
    }
  }
  return 'offline';
}

/** Kurlar bayatsa günceller. Paralel çağrılar tek uçuşta birleşir. */
export function refreshFxIfStale(): Promise<'fresh' | 'updated' | 'offline'> {
  if (!isFxStale()) return Promise.resolve('fresh');
  return refreshFxForce().then((r) => r as 'updated' | 'offline');
}

export function refreshFxForce(): Promise<'updated' | 'offline'> {
  if (!_inflight) {
    _inflight = doRefresh().finally(() => {
      _inflight = null;
    });
  }
  return _inflight;
}

/** Testler için mağazayı sıfırlar. */
export function __resetFxForTest() {
  _rates = { ...FX_FALLBACK_RATES };
  _updatedAt = '';
}
