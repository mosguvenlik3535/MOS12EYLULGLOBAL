import { useState } from 'react';
import { cn } from '../utils/cn';
import { Ic } from '../icons';
import { isValidLicenseKey, normalizeLicenseKey } from '../lib/licenseCore';

/** Anahtarın kendisi değil, yalnızca "etkin" işareti saklanır. */
const LICENSE_MARKER = 'mosbarkod_licensed';
/** Eski sürümlerden kalan ham anahtar (geçiş için okunur, doğrulanıp işarete çevrilir). */
const LEGACY_KEY_STORAGE = 'mosbarkod_license_key';

declare global {
  interface Window {
    mosStore?: {
      get: (key: string) => Promise<unknown>;
      set: (key: string, value: unknown) => Promise<{ ok: boolean }>;
      del: (key: string) => Promise<{ ok: boolean }>;
    };
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

/** Kayıtlı etkinleştirme durumu — Electron'da doğrulama ana süreçte yapılır. */
export const getStoredLicense = (): string | null => {
  try {
    if (localStorage.getItem(LICENSE_MARKER) === '1') return 'activated';
    const legacy = localStorage.getItem(LEGACY_KEY_STORAGE);
    if (legacy) {
      if (isValidLicenseKey(legacy)) {
        localStorage.setItem(LICENSE_MARKER, '1');
        return 'activated';
      }
      localStorage.removeItem(LEGACY_KEY_STORAGE);
    }
    return null;
  } catch {
    return null;
  }
};

/** Asenkron lisans kontrolü — Electron'da ana süreçten de doğrulanır. */
export const getStoredLicenseAsync = async (): Promise<string | null> => {
  const local = getStoredLicense();
  if (local) return local;
  try {
    if (window.mosLicense?.status) {
      const st = await window.mosLicense.status();
      if (st?.main) {
        localStorage.setItem(LICENSE_MARKER, '1');
        return 'activated';
      }
    } else if (window.mosStore) {
      const v = await window.mosStore.get(LEGACY_KEY_STORAGE);
      if (typeof v === 'string' && isValidLicenseKey(v)) {
        localStorage.setItem(LICENSE_MARKER, '1');
        return 'activated';
      }
    }
  } catch {
    /* yoksay */
  }
  return null;
};

const saveLicense = async (key: string) => {
  try {
    localStorage.setItem(LICENSE_MARKER, '1');
    if (window.mosLicense?.activate) await window.mosLicense.activate(key);
  } catch {
    /* yoksay */
  }
};

export default function LicenseGate({
  onActivated,
  demo = false,
  demoExpired = false,
}: {
  onActivated: (key: string) => void;
  demo?: boolean;
  demoExpired?: boolean;
}) {
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const digits = key.replace(/-/g, '');
  const valid = digits.length === 15 && key.toUpperCase().startsWith('MOS-');

  const activate = () => {
    if (!valid) {
      setError('Lisans anahtarı MOS-XXXX-XXXX-XXXX formatında ve 15 haneli olmalıdır.');
      return;
    }
    setBusy(true);
    setError('');
    void (async () => {
      let ok = false;
      // Elektron'da doğrulama ANA SÜREÇTE yapılır (anahtar renderer'a girmez)
      if (window.mosLicense?.verify) {
        try {
          ok = Boolean((await window.mosLicense.verify(key))?.ok);
        } catch {
          ok = false;
        }
      }
      // Web/APK yedeği: çekirdek doğrulama (hash + sağlama)
      if (!ok) ok = isValidLicenseKey(key);

      if (!ok) {
        setBusy(false);
        setError('Geçersiz lisans anahtarı. Lütfen doğru anahtarı girin.');
        return;
      }
      await saveLicense(key);
      setBusy(false);
      onActivated(key);
    })();
  };

  return (
    <div className="flex h-[100dvh] items-center justify-center overflow-y-auto bg-ink p-4 font-sans text-txt">
      <section className="w-full max-w-[360px] rounded-2xl border border-amber/30 bg-gradient-to-b from-[#161511] via-[#0d1424] to-[#090d1b] p-5 text-center shadow-2xl">
        {/* Logo */}
        <div className="amber-license-glow mx-auto flex h-36 w-40 flex-col items-center justify-center rounded-2xl border border-amber/40 bg-ink/90">
          <div className="w-[112px] rounded-b-[34px] border-2 border-amber/80 px-2 pb-4 pt-3">
            <div className="font-mono text-[17px] font-extrabold tracking-[0.12em] text-amber2">MEHMET</div>
            <div className="mt-1 font-mono text-[6px] tracking-[0.35em] text-white/65">ORTAYAYLA</div>
          </div>
          <div className="mt-4 font-mono text-[9px] tracking-[0.24em] text-white/60">
            {demo ? 'DEMO SÜRÜM' : 'LİSANSLI YAZILIM'}
          </div>
        </div>

        <div className="mt-5 font-mono text-[15px] font-bold tracking-[0.14em] text-amber2">MOSBARKODYAZILIM</div>
        <div className="mt-1 text-[10px] text-mut2">Profesyonel Barkodlu Satış Çözümleri</div>

        {/* Bilgi kutusu */}
        <div className="mt-5 space-y-2 rounded-xl border border-white/20 bg-black/25 p-3 font-mono text-[9.5px]">
          <div className="flex justify-between gap-3">
            <span className="text-mut2">Yazılım Sahibi:</span>
            <span className="font-bold text-txt">MOSBARKODYAZILIM</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-mut2">Sürüm:</span>
            <span className="font-bold text-txt">{demo ? 'v1.5-DEMO' : 'v1.5.0-PRO'}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-mut2">Lisans Tipi:</span>
            <span className={cn('font-bold', demo ? 'text-amber2' : 'text-mint')}>
              {demo ? '★ DENEME' : '✓ ÖMÜR BOYU'}
            </span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-mut2">Destek Hattı:</span>
            <a href="tel:+905554066143" className="font-bold text-amber2 hover:underline">
              00 90 555 406 61 43
            </a>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-mut2">Destek E-Posta:</span>
            <a href="mailto:m.ortayayla@gmail.com" className="font-bold text-amber2 hover:underline">
              m.ortayayla@gmail.com
            </a>
          </div>
        </div>

        {demoExpired && (
          <div className="mt-3 rounded-lg border border-amber/40 bg-amber/10 px-3 py-2 font-mono text-[10px] leading-relaxed text-amber2">
            Demo sürüm satış limitine ulaştı. Tüm özellikleri kullanmaya devam etmek için lisans anahtarınızı girin.
          </div>
        )}

        {/* Lisans anahtarı girişi */}
        <div className="mt-4 text-left">
          <label className="mb-1.5 block font-mono text-[9.5px] uppercase tracking-widest text-mut">
            Lisans Anahtarı
          </label>
          <input
            value={key}
            onChange={(e) => {
              setKey(normalizeLicenseKey(e.target.value));
              setError('');
            }}
            onKeyDown={(e) => e.key === 'Enter' && activate()}
            placeholder="MOS-XXXX-XXXX-XXXX"
            autoFocus
            spellCheck={false}
            autoComplete="off"
            className={cn(
              'w-full rounded-lg border bg-ink/80 px-3 py-3 text-center font-mono text-[15px] font-bold tracking-[0.18em] text-amber2 outline-none transition-colors placeholder:tracking-[0.16em] placeholder:text-mut2/60',
              error ? 'border-red/70' : 'border-amber/40 focus:border-amber'
            )}
          />
          <div className="mt-1.5 flex items-center justify-between">
            <span className="font-mono text-[9px] text-mut2">{digits.length} / 15 karakter</span>
            {error && <span className="font-mono text-[9px] font-bold text-red">{error}</span>}
          </div>
        </div>

        <button
          onClick={activate}
          disabled={!valid || busy}
          className={cn(
            'mt-3 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-[13px] font-bold transition-all',
            valid && !busy
              ? 'bg-amber text-[#1a1102] hover:brightness-110'
              : 'cursor-not-allowed bg-panel3 text-mut2'
          )}
        >
          {busy ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Doğrulanıyor…
            </>
          ) : (
            <>
              <Ic n="check" c="h-4 w-4" /> LİSANSI ETKİNLEŞTİR
            </>
          )}
        </button>

        <p className="mt-4 text-[9px] italic leading-relaxed text-mut2">
          "Bu yazılım MOSBARKODYAZILIM tarafından tescillenmiş olup tüm hakları saklıdır."
        </p>
      </section>
    </div>
  );
}
