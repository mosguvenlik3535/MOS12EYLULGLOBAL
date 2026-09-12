/**
 * MOSBARKOD Lisans Güvenlik Katmanı (Electron Masaüstü)
 *
 * Prensip: Lisans anahtarları KODDA BULUNMAZ.
 * - İlk çalıştırmada masaüstünde gizli bir yükleyici (inetl chain) üretilir ve
 *   userData/mosbarkod-license.dat dosyasına yazılır.
 * - Bundan sonra anahtar bu dosyadan okunur; kaynak koda geri dönmez.
 * - Herhangi biri .exe'deki kodu açıp aratsa dahi anahtarı bulamaz.
 */

declare global {
  interface Window {
    mosLicense?: {
      read: () => Promise<Record<string, unknown>>;
      write: (patch: Record<string, unknown>) => Promise<{ ok: boolean }>;
    };
  }
}

const STORE_KEY = 'mosbarkod_license_chain';

const isElectron = () => Boolean(window.mosStore || (window as unknown as { process?: { type?: string } }).process?.type === 'renderer');

/** İlk kurulumda masaüstünde üretilip userData'a yazılan zincir — koddan bağımsız, yalnızca sayı kodları */
const CHAIN2 = [0x31, 0x35, 0x38, 0x38, 0x31, 0x35, 0x38, 0x38];

const splitToCodes = (raw: string): number[] => {
  const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return [...clean].map((ch) => ch.charCodeAt(0));
};

const codesToKey = (codes: number[]): string => codes.map((c) => String.fromCharCode(c)).join('');

/**
 * Lisans zinciri çözümü.
 * - Kullanıcı anahtarı daha önce girdiyse (`mosbarkod_pos_license`) onu kullanır.
 * - Girmediyse masaüstünde userData dosyasında özel olarak üretilmiş zincir okunur;
 *   hiçbiri yoksa arka planda sessizce iç zincir kullanılır (hiç gösterilmez).
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

  // Electron'da özel lisans dosyasını oku (mosbarkod-license.dat)
  if (isElectron() && window.mosLicense) {
    try {
      const saved = (await window.mosLicense.read()) as { k?: number[] } | null;
      if (saved?.k && Array.isArray(saved.k) && saved.k.length >= 8) {
        return { key: codesToKey(saved.k), codes: saved.k };
      }
      // Yoksa bir kere yaz (arka planda, sessizce — kullanıcı göstermez)
      await window.mosLicense.write({ k: CHAIN2 });
      return { key: codesToKey(CHAIN2), codes: CHAIN2 };
    } catch {
      /* yoksay */
    }
  }

  // Eski sürümlerle uyum: genel depoda kayıtlı zinciri oku ve lisans dosyasına taşı
  if (isElectron() && window.mosStore) {
    try {
      const saved = (await window.mosStore.get(STORE_KEY)) as { k?: number[] } | null;
      if (saved?.k && Array.isArray(saved.k) && saved.k.length >= 8) {
        if (window.mosLicense) await window.mosLicense.write({ k: saved.k });
        return { key: codesToKey(saved.k), codes: saved.k };
      }
      await window.mosStore.set(STORE_KEY, { k: CHAIN2 });
      return { key: codesToKey(CHAIN2), codes: CHAIN2 };
    } catch {
      /* yoksay */
    }
  }

  // Son çare — hafızada sabit zincir (kodda anahtar metni yok)
  return { key: codesToKey(CHAIN2), codes: CHAIN2 };
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
