/**
 * TESTÇİ LİSANSI — tek cihaza bağlı, sunucu gerektirmeyen etkinleştirme.
 *
 * Nasıl çalışır?
 *  1. Uygulama cihazın parmak izinden kısa bir CİHAZ KODU üretir (MOS-XXXX-XXXX-XXXX).
 *  2. Testçi bu kodu geliştiriciye gönderir (WhatsApp / e-posta).
 *  3. Geliştirici `tools/tester-license.mjs` ile, KENDİSİNDE duran gizli anahtarla
 *     imzalanmış bir ETKİNLEŞTİRME KODU üretir.
 *  4. Uygulama kodu, içindeki GENEL anahtarla doğrular:
 *       • imza geçerli mi?
 *       • kod bu cihaza mı kesilmiş?      → başka telefonda geçersiz
 *       • süresi dolmuş mu?               → 1 yıl
 *
 * Güvenlik: gizli (özel) anahtar yalnızca geliştiricide durur ve depoya
 * YAZILMAZ (.gitignore). Uygulamanın içinde sadece GENEL anahtar vardır;
 * onunla kod DOĞRULANIR ama ÜRETİLEMEZ. Yani uygulamayı kurcalayan biri
 * kendine kod üretemez. Bu yüzden sunucuya da ihtiyaç yoktur.
 */

import { getDeviceFingerprint } from './deviceId';

/* ------------------------------------------------------------------ */
/*  Uygulamaya gömülü GENEL anahtar (doğrular, üretemez)               */
/* ------------------------------------------------------------------ */

const TESTER_PUBKEY_JWK: JsonWebKey = {
  crv: 'P-256',
  kty: 'EC',
  x: '4R3aH1z9xRodC9uCXvzlC7JK2-RLO3P1mzNl4RLR3V4',
  y: 'wmUtqHCapemjlO1e67FjYP_7cX20STjcbrfU5qcr-vk',
};

export const TESTER_PREFIX = 'MTEST1';

/* LicenseGate.tsx içindeki işaretle AYNI olmalı (PRO kilidini açan bayrak). */
const LICENSE_MARKER = 'mosbarkod_licensed';
const CODE_KEY = 'mosbarkod_tester_code';
const REASON_KEY = 'mosbarkod_tester_reason';

export type TesterStatus =
  | 'yok' // hiç testçi kodu girilmemiş (klasik lisans ya da ücretsiz sürüm)
  | 'gecerli'
  | 'baska-cihaz' // kod başka bir telefona kesilmiş
  | 'sure-bitti'
  | 'bozuk' // imza/format geçersiz
  | 'destek-yok'; // cihaz WebCrypto desteklemiyor

export interface TesterInfo {
  /** Kodun kesildiği cihazın 12 haneli hex kodu. */
  device: string;
  /** Veriliş tarihi (YYMMDD). */
  issue: string;
  /** Bitiş tarihi (YYMMDD). */
  exp: string;
}

/* ------------------------------------------------------------------ */
/*  Yardımcılar                                                        */
/* ------------------------------------------------------------------ */

const subtle = (): SubtleCrypto | null => {
  try {
    return globalThis.crypto?.subtle ?? null;
  } catch {
    return null;
  }
};

const enc = (s: string): Uint8Array<ArrayBuffer> => {
  const bytes = new TextEncoder().encode(s);
  const out = new Uint8Array(new ArrayBuffer(bytes.length));
  out.set(bytes);
  return out;
};

function b64urlToBytes(s: string): Uint8Array<ArrayBuffer> {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + pad;
  const bin = typeof atob === 'function' ? atob(b64) : Buffer.from(b64, 'base64').toString('binary');
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

const ymdNumber = (d: Date): number =>
  d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();

/** YYMMDD → 20YYMMDD sayısı (karşılaştırma için). */
const expNumber = (yymmdd: string): number => 20000000 + Number(yymmdd);

/** YYMMDD → "19.09.2027" */
export function formatTesterDate(yymmdd: string): string {
  const m = /^(\d{2})(\d{2})(\d{2})$/.exec(yymmdd || '');
  if (!m) return '—';
  return `${m[3]}.${m[2]}.20${m[1]}`;
}

/* ------------------------------------------------------------------ */
/*  Kod çözümleme ve doğrulama                                        */
/* ------------------------------------------------------------------ */

export function parseTesterCode(
  raw: string,
): { payload: string; sig: string; info: TesterInfo } | null {
  const code = (raw || '').trim();
  const parts = code.split('.');
  if (parts.length !== 5) return null;
  const [prefix, device, issue, exp, sig] = parts;
  if (prefix.toUpperCase() !== TESTER_PREFIX) return null;
  if (!/^[0-9A-F]{12}$/.test(device)) return null;
  if (!/^\d{6}$/.test(issue) || !/^\d{6}$/.test(exp)) return null;
  if (!/^[A-Za-z0-9_-]{20,}$/.test(sig)) return null;
  return {
    payload: parts.slice(0, 4).join('.'),
    sig,
    info: { device, issue, exp },
  };
}

/**
 * Kodu doğrular. `fingerprint` cihazın parmak izidir; farklı bir telefon
 * farklı parmak izi üreteceği için kod orada geçersiz olur.
 */
export async function verifyTesterCode(
  raw: string,
  fingerprint: string,
  pubJwk: JsonWebKey = TESTER_PUBKEY_JWK,
): Promise<{ status: TesterStatus; info?: TesterInfo }> {
  const parsed = parseTesterCode(raw);
  if (!parsed) return { status: 'bozuk' };

  const sub = subtle();
  if (!sub) return { status: 'destek-yok', info: parsed.info };

  try {
    const key = await sub.importKey(
      'jwk',
      pubJwk,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['verify'],
    );
    const ok = await sub.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      key,
      b64urlToBytes(parsed.sig),
      enc(parsed.payload),
    );
    if (!ok) return { status: 'bozuk', info: parsed.info };
  } catch {
    return { status: 'bozuk', info: parsed.info };
  }

  const here = fingerprint.slice(0, 12).toUpperCase();
  if (here !== parsed.info.device) return { status: 'baska-cihaz', info: parsed.info };

  if (ymdNumber(new Date()) > expNumber(parsed.info.exp)) {
    return { status: 'sure-bitti', info: parsed.info };
  }

  return { status: 'gecerli', info: parsed.info };
}

/* ------------------------------------------------------------------ */
/*  Kayıt / etkinleştirme / açılış kontrolü                           */
/* ------------------------------------------------------------------ */

const ls = (): Storage | null => {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
};

export const getStoredTesterCode = (): string | null => {
  try {
    return ls()?.getItem(CODE_KEY) ?? null;
  } catch {
    return null;
  }
};

export const getLastTesterReason = (): TesterStatus | null => {
  try {
    return (ls()?.getItem(REASON_KEY) as TesterStatus | null) ?? null;
  } catch {
    return null;
  }
};

/**
 * Kodu bu cihaz için etkinleştirir. Yalnızca imza + cihaz + süre kontrolünden
 * geçerse PRO kilidi açılır.
 */
export async function activateTesterCode(
  raw: string,
  pubJwk: JsonWebKey = TESTER_PUBKEY_JWK,
): Promise<{ status: TesterStatus; info?: TesterInfo }> {
  const fp = await getDeviceFingerprint();
  const res = await verifyTesterCode(raw, fp, pubJwk);
  if (res.status === 'gecerli') {
    try {
      const s = ls();
      s?.setItem(CODE_KEY, raw.trim());
      s?.setItem(LICENSE_MARKER, '1');
      s?.removeItem(REASON_KEY);
    } catch {
      /* yoksay */
    }
  }
  return res;
}

/**
 * Açılışta (ve ayarlar ekranında) çağrılır: kayıtlı kod hâlâ bu cihaz için
 * geçerli mi? Değilse PRO kilidi KAPATILIR — yani lisans 2. telefonda çalışmaz.
 *
 * Not: hiç kod girilmemişse ('yok') klasik lisanslı kullanıcılara dokunulmaz.
 */
export async function checkTesterLicense(
  pubJwk: JsonWebKey = TESTER_PUBKEY_JWK,
): Promise<{ status: TesterStatus; info?: TesterInfo }> {
  const raw = getStoredTesterCode();
  if (!raw) return { status: 'yok' };

  const fp = await getDeviceFingerprint();
  const res = await verifyTesterCode(raw, fp, pubJwk);

  try {
    const s = ls();
    if (res.status === 'gecerli') {
      s?.setItem(LICENSE_MARKER, '1');
      s?.removeItem(REASON_KEY);
    } else {
      /* Kod bu cihazda geçersiz → lisansı düşür, PRO kilitlenir. */
      s?.removeItem(LICENSE_MARKER);
      s?.setItem(REASON_KEY, res.status);
    }
  } catch {
    /* yoksay */
  }

  return res;
}

/** Lisansı bu cihazdan siler (test amaçlı / sıfırlama). */
export function clearTesterLicense(): void {
  try {
    const s = ls();
    s?.removeItem(CODE_KEY);
    s?.removeItem(LICENSE_MARKER);
    s?.removeItem(REASON_KEY);
  } catch {
    /* yoksay */
  }
}
