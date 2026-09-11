import { useState } from 'react';
import { cn } from '../utils/cn';
import { Ic } from '../icons';

const LICENSE_KEY_STORAGE = 'mosbarkod_license_key';
const VALID_LICENSE = 'MOS-1234-ABCD-9999';

declare global {
  interface Window {
    mosStore?: {
      get: (key: string) => Promise<unknown>;
      set: (key: string, value: unknown) => Promise<{ ok: boolean }>;
      del: (key: string) => Promise<{ ok: boolean }>;
    };
  }
}

/** Kayıtlı lisans anahtarını döndürür — Electron'da userData dosyasından, tarayıcıda localStorage'dan. */
export const getStoredLicense = (): string | null => {
  try {
    const v = localStorage.getItem(LICENSE_KEY_STORAGE);
    if (!v || v.trim().toUpperCase() !== VALID_LICENSE) {
      if (v) localStorage.removeItem(LICENSE_KEY_STORAGE);
      return null;
    }
    return v;
  } catch {
    return null;
  }
};

/** Asenkron lisans kontrolü — Electron'da dosyadan da kurtarabilir. */
export const getStoredLicenseAsync = async (): Promise<string | null> => {
  const local = getStoredLicense();
  if (local) return local;
  try {
    if (window.mosStore) {
      const v = await window.mosStore.get(LICENSE_KEY_STORAGE);
      if (typeof v === 'string' && v.trim().toUpperCase() === VALID_LICENSE) {
        localStorage.setItem(LICENSE_KEY_STORAGE, v);
        return v;
      }
    }
  } catch {
    /* yoksay */
  }
  return null;
};

const saveLicense = (key: string) => {
  try {
    localStorage.setItem(LICENSE_KEY_STORAGE, key);
    if (window.mosStore) void window.mosStore.set(LICENSE_KEY_STORAGE, key);
  } catch {
    /* yoksay */
  }
};

/** Girişi MOS-XXXX-XXXX-XXXX biçimine getirir. (İlk 3 hane MOS, sonraki 3 blok 4'er hane) */
const formatKey = (raw: string) => {
  const clean = raw
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 15);
  
  if (clean.length <= 3) return clean;
  const p1 = clean.slice(0, 3);
  const rest = clean.slice(3);
  const blocks = rest.match(/.{1,4}/g) ?? [];
  return [p1, ...blocks].join('-');
};



export default function LicenseGate({ onActivated }: { onActivated: (key: string) => void }) {
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
    setTimeout(() => {
      if (key.toUpperCase() !== VALID_LICENSE) {
        setBusy(false);
        setError('Geçersiz lisans anahtarı. Lütfen doğru anahtarı girin.');
        return;
      }
      saveLicense(key);
      setBusy(false);
      onActivated(key);
    }, 550);
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
          <div className="mt-4 font-mono text-[9px] tracking-[0.24em] text-white/60">LİSANSLI YAZILIM</div>
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
            <span className="font-bold text-txt">v1.5.0-PRO</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-mut2">Lisans Tipi:</span>
            <span className="font-bold text-mint">✓ ÖMÜR BOYU</span>
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

        {/* Lisans anahtarı girişi */}
        <div className="mt-4 text-left">
          <label className="mb-1.5 block font-mono text-[9.5px] uppercase tracking-widest text-mut">
            Lisans Anahtarı
          </label>
          <input
            value={key}
            onChange={(e) => {
              setKey(formatKey(e.target.value));
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
