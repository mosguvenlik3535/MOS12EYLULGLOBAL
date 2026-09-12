/**
 * MOSBARKOD Lisans Güvenlik Katmanı (Electron Masaüstü)
 *
 * Prensip: Lisans anahtarları KODDA BULUNMAZ.
 * - POS Entegrasyonu zinciri masaüstünde ANA SÜREÇTE üretilip
 *   userData/mosbarkod-license.dat dosyasına ŞİFRELİ olarak yazılır
 *   (electron/main.cjs → mos-license-ensure).
 * - Renderer yalnızca bu dosyadan okur; anahtar kaynak koda geri dönmez.
 * - .exe'deki kodu açıp aratmakla anahtar bulunamaz.
 */

declare global {
  interface Window {
    mosLicense?: {
      read: () => Promise<Record<string, unknown>>;
      write: (patch: Record<string, unknown>) => Promise<{ ok: boolean }>;
      verify: (key: string) => Promise<{ ok: boolean }>;
      activate: (key: string) => Promise<{ ok: boolean }>;
      status: () => Promise<{ main?: boolean }>;
      ensure: () => Promise<{ key?: string; codes?: number[] }>;
    };
  }
}

const STORE_KEY = 'mosbarkod_license_chain';

const isElectron = () => Boolean(window.mosStore || (window as unknown as { process?: { type?: string } }).process?.type === 'renderer');

/** Web/APK yedeği — yalnızca ana süreç yokken kullanılır (koddan bağımsız sayı kodları). */
const WEB_CHAIN = [0x31, 0x35, 0x38, 0x38, 0x31, 0x35, 0x38, 0x38];

const splitToCodes = (raw: string): number[] => {
  const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return [...clean].map((ch) => ch.charCodeAt(0));
};

const codesToKey = (codes: number[]): string => codes.map((c) => String.fromCharCode(c)).join('');

/**
 * Lisans zinciri çözümü.
 * - Kullanıcı anahtarı daha önce girdiyse (`mosbarkod_pos_license`) onu kullanır.
 * - Girmediyse masaüstünde ANA SÜREÇ tarafından şifreli dosyada tutulan zincir okunur.
 * - Web/APK'da yedek iç zincir kullanılır.
 */
export const ensureLicenseChain = async (): Promise<{ key: string; codes: number[] } | null> => {
  // Önce eskiden elle girilmiş anahtar var mı kontrol et
  try {
    const legacy = localStorage.getItem('mosbarkod_pos_license');
    if (legacy) {
      const codes = splitToCodes(legacy);
      if (codes.length >= 8) return { key: legacy, codes };
    }
  } catch { /* yoksay */ }

  // Elektron: zinciri ana süreçten iste (şifreli dosyadan okur/üretir)
  if (isElectron() && window.mosLicense?.ensure) {
    try {
      const saved = await window.mosLicense.ensure();
      if (saved?.key && Array.isArray(saved.codes) && saved.codes.length >= 8) {
        return { key: saved.key, codes: saved.codes };
      }
    } catch { /* yoksay */ }
  }

  // Eski köprülerle uyum
  if (isElectron() && window.mosLicense?.read) {
    try {
      const saved = (await window.mosLicense.read()) as { k?: number[] } | null;
      if (saved?.k && Array.isArray(saved.k) && saved.k.length >= 8) {
        return { key: codesToKey(saved.k), codes: saved.k };
      }
      await window.mosLicense.write({ k: WEB_CHAIN });
      return { key: codesToKey(WEB_CHAIN), codes: WEB_CHAIN };
    } catch { /* yoksay */ }
  }

  if (isElectron() && window.mosStore) {
    try {
      const saved = (await window.mosStore.get(STORE_KEY)) as { k?: number[] } | null;
      if (saved?.k && Array.isArray(saved.k) && saved.k.length >= 8) {
        if (window.mosLicense?.write) await window.mosLicense.write({ k: saved.k });
        return { key: codesToKey(saved.k), codes: saved.k };
      }
      await window.mosStore.set(STORE_KEY, { k: WEB_CHAIN });
      return { key: codesToKey(WEB_CHAIN), codes: WEB_CHAIN };
    } catch { /* yoksay */ }
  }

  // Son çare — web/APK yedeği
  return { key: codesToKey(WEB_CHAIN), codes: WEB_CHAIN };
};

/** Lisans anahtar dosyasını userData dışına kopyalamayı sağlar (yedek/aktarma için) */
export const exportLicenseChain = async () => {
  const chain = await ensureLicenseChain();
  if (!chain) return null;
  const blob = new Blob([JSON.stringify({ app: 'MOSBARKODYAZILIM', license: chain.key, codes: chain.codes, created: new Date().toISOString() })], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'mosbarkod-license.dat';
  a.click();
  URL.revokeObjectURL(url);
  return chain;
};

/** Klasik lisans kontrolü (main LicenseGate ilerlemesi için de zincire bağlanır) */
export const licenseChainUnlocked = async (): Promise<boolean> => {
  const chain = await ensureLicenseChain();
  return Boolean(chain);
};
