/**
 * Cihaz kimliği — testçi lisansını TEK TELEFONA bağlamak için kullanılır.
 *
 * Parmak izi şu sinyallerin birleşiminden üretilir:
 *  1. ANDROID_ID / identifierForVendor  (Capacitor Device eklentisi)
 *  2. Uygulamanın kendi ürettiği kalıcı rastgele kimlik (localStorage)
 *  3. Donanım/ortam sinyalleri: ekran çözünürlüğü, kullanıcı aracısı,
 *     çekirdek sayısı, saat dilimi, dil
 *
 * Neden birden fazla sinyal? Telefon klonlama araçları (Smart Switch, Mi Mover)
 * uygulama verisini olduğu gibi kopyalar; donanım sinyalleri sayesinde kopya
 * BAŞKA bir modele taşınırsa parmak izi değişir ve lisans geçersiz olur.
 */

import { sha256hex } from './licenseCore';

const UUID_KEY = 'mosbarkod_device_uuid';

/** Görünen cihaz kodunda kullanılan hex uzunluğu (12 hex = 48 bit). */
export const DEVICE_HEX_LEN = 12;

const store = (): Storage | null => {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
};

function randomHex(len: number): string {
  let out = '';
  try {
    const c: Crypto | undefined = globalThis.crypto;
    if (c?.getRandomValues) {
      const buf = new Uint8Array(Math.ceil(len / 2));
      c.getRandomValues(buf);
      out = [...buf].map((b) => b.toString(16).padStart(2, '0')).join('');
    }
  } catch {
    /* yoksay */
  }
  while (out.length < len) out += Math.floor(Math.random() * 16).toString(16);
  return out.slice(0, len);
}

/** Uygulama içinde kalıcı, kendimiz ürettiğimiz kimlik. */
function localUuid(): string {
  const ls = store();
  try {
    const cur = ls?.getItem(UUID_KEY);
    if (cur && cur.length >= 8) return cur;
    const id = randomHex(32);
    ls?.setItem(UUID_KEY, id);
    return id;
  } catch {
    return randomHex(32);
  }
}

/** Android'de ANDROID_ID, iOS'ta identifierForVendor; web/masaüstünde boş döner. */
async function nativeDeviceId(): Promise<string> {
  try {
    const mod = (await import('@capacitor/device')) as {
      Device?: { getId: () => Promise<{ identifier?: string } | string> };
    };
    const res = await mod.Device?.getId();
    const id = typeof res === 'string' ? res : res?.identifier;
    if (id && !/^(web|browser|unknown)$/i.test(id)) return String(id);
  } catch {
    /* Capacitor yok (masaüstü / düz web): sessizce geç */
  }
  return '';
}

function screenSig(): string {
  try {
    if (typeof screen === 'undefined') return '';
    const dpr = typeof window === 'undefined' ? 0 : Math.round((window.devicePixelRatio || 1) * 100);
    return `${screen.width}x${screen.height}x${dpr}`;
  } catch {
    return '';
  }
}

function envSig(): string {
  try {
    const nav = typeof navigator === 'undefined' ? undefined : navigator;
    let tz = '';
    try {
      tz = Intl?.DateTimeFormat?.().resolvedOptions?.().timeZone || '';
    } catch {
      /* yoksay */
    }
    return [nav?.userAgent ?? '', String(nav?.hardwareConcurrency ?? ''), nav?.language ?? '', tz].join('|');
  } catch {
    return '';
  }
}

let cached: string | null = null;

/** Cihazın parmak izi (hex, 64 karakter). Aynı cihazda aynı değeri verir. */
export async function getDeviceFingerprint(): Promise<string> {
  if (cached) return cached;
  const parts = [await nativeDeviceId(), localUuid(), screenSig(), envSig()].filter(Boolean).join('||');
  cached = sha256hex(parts);
  return cached;
}

/** Parmak izi önbelleğini boşaltır (testler ve cihaz değişimi senaryoları için). */
export function resetDeviceFingerprintCache(): void {
  cached = null;
}

/** Kullanıcıya gösterilen kısa cihaz kodu — örn. MOS-3F2A-9C11-7B04. */
export async function getDeviceCode(): Promise<string> {
  const hex = (await getDeviceFingerprint()).slice(0, DEVICE_HEX_LEN).toUpperCase();
  return `MOS-${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}`;
}

/** "MOS-3F2A-9C11-7B04" ya da bozuk yazım → "3F2A9C117B04". */
export function normalizeDeviceCode(raw: string): string {
  return (raw || '')
    .toUpperCase()
    .replace(/[^A-F0-9]/g, '')
    .slice(0, DEVICE_HEX_LEN);
}
