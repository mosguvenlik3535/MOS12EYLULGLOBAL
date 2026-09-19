import { useEffect, useState } from 'react';
import { Ic } from '../icons';
import { cn } from '../utils/cn';
import { getDeviceCode } from '../lib/deviceId';
import {
  activateTesterCode,
  checkTesterLicense,
  formatTesterDate,
  getStoredTesterCode,
  type TesterInfo,
  type TesterStatus,
} from '../lib/testerLicense';

/* Ayarlar → Lisans kartının içinde görünen testçi lisansı kutusu.
   Cihaz kodunu gösterir, geliştiriciden gelen etkinleştirme kodunu kabul eder. */

const MESAJ: Partial<Record<TesterStatus, { text: string; tone: 'ok' | 'warn' | 'err' }>> = {
  gecerli: { text: 'Kod doğrulandı — PRO özellikler bu cihazda açık.', tone: 'ok' },
  'baska-cihaz': {
    text: 'Bu kod BAŞKA BİR TELEFONA kesilmiş; bu cihazda çalışmaz. Telefonunuzu değiştirdiyseniz yeni cihaz kodunuzu gönderip yeni kod alın.',
    tone: 'err',
  },
  'sure-bitti': { text: 'Lisans süresi doldu. Yeni kod almak için geliştiriciye yazın.', tone: 'warn' },
  bozuk: { text: 'Kod geçersiz veya eksik kopyalanmış. Lütfen kodu olduğu gibi yapıştırın.', tone: 'err' },
  'destek-yok': { text: 'Bu cihaz lisans doğrulamayı desteklemiyor.', tone: 'err' },
};

export default function TesterLicenseBox() {
  const [device, setDevice] = useState('…');
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<TesterStatus>('yok');
  const [info, setInfo] = useState<TesterInfo | null>(null);
  const [msg, setMsg] = useState<{ text: string; tone: 'ok' | 'warn' | 'err' } | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const refresh = async () => {
    try {
      const [d, st] = await Promise.all([getDeviceCode(), checkTesterLicense()]);
      setDevice(d);
      setStatus(st.status);
      setInfo(st.info ?? null);
      if (!code) setCode(getStoredTesterCode() ?? '');
    } catch {
      setDevice('—');
    }
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const copyDevice = async () => {
    try {
      await navigator.clipboard.writeText(device);
    } catch {
      try {
        const ta = document.createElement('textarea');
        ta.value = device;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      } catch {
        /* yoksay */
      }
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const activate = async () => {
    if (!code.trim()) return;
    setBusy(true);
    setMsg(null);
    const res = await activateTesterCode(code);
    setStatus(res.status);
    setInfo(res.info ?? null);
    setMsg(MESAJ[res.status] ?? { text: 'Kod doğrulanamadı.', tone: 'err' });
    setBusy(false);
    if (res.status === 'gecerli') {
      try {
        window.dispatchEvent(new Event('mos-license-changed'));
      } catch {
        /* yoksay */
      }
    }
  };

  const active = status === 'gecerli';

  return (
    <div className="mt-4 rounded-xl border border-white/20 bg-black/25 p-3 text-left">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[9.5px] uppercase tracking-widest text-mut">Cihaz Kimliği</span>
        <button
          onClick={copyDevice}
          title="Cihaz kodunu kopyala"
          className="inline-flex items-center gap-1 rounded-md border border-amber/40 px-2 py-1 font-mono text-[9px] font-bold text-amber2 transition-colors hover:bg-amber/15"
        >
          <Ic n="file" c="h-3 w-3" />
          {copied ? 'KOPYALANDI' : 'KOPYALA'}
        </button>
      </div>
      <div className="mt-1 select-all break-all font-mono text-[13px] font-bold tracking-[0.14em] text-amber2">
        {device}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/10 pt-2">
        <span className="font-mono text-[9.5px] uppercase tracking-widest text-mut">Lisans Durumu</span>
        <span className={cn('font-mono text-[10px] font-bold', active ? 'text-mint' : 'text-amber2')}>
          {active ? `✓ TESTÇİ LİSANSI · ${formatTesterDate(info?.exp ?? '')}` : '★ ÜCRETSİZ SÜRÜM'}
        </span>
      </div>

      {!active && (
        <div className="mt-3">
          <label className="mb-1.5 block font-mono text-[9.5px] uppercase tracking-widest text-mut">
            Etkinleştirme Kodu
          </label>
          <input
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setMsg(null);
            }}
            onKeyDown={(e) => e.key === 'Enter' && void activate()}
            placeholder="MTEST1.…"
            spellCheck={false}
            autoComplete="off"
            title="Etkinleştirme kodunu yapıştırın — yalnızca bu telefonda çalışır"
            className="w-full rounded-lg border border-amber/40 bg-ink/80 px-2.5 py-2 font-mono text-[10.5px] text-amber2 outline-none transition-colors placeholder:text-mut2/60 focus:border-amber"
          />
          <button
            onClick={() => void activate()}
            disabled={busy || !code.trim()}
            className={cn(
              'mt-2 w-full rounded-lg border px-3 py-2 font-mono text-[10.5px] font-bold transition-colors',
              busy || !code.trim()
                ? 'cursor-not-allowed border-white/10 text-mut2'
                : 'border-amber/50 bg-amber/10 text-amber2 hover:bg-amber/20',
            )}
          >
            {busy ? 'DOĞRULANIYOR…' : 'ETKİNLEŞTİR'}
          </button>
        </div>
      )}

      {msg && (
        <div
          className={cn(
            'mt-2 rounded-lg border px-2.5 py-2 font-mono text-[9.5px] leading-relaxed',
            msg.tone === 'ok' && 'border-mint/40 bg-mint/10 text-mint',
            msg.tone === 'warn' && 'border-amber/40 bg-amber/10 text-amber2',
            msg.tone === 'err' && 'border-red/40 bg-red/10 text-red',
          )}
        >
          {msg.text}
          {status === 'baska-cihaz' && (
            <a href="mailto:m.ortayayla@gmail.com" className="ml-1 underline">
              m.ortayayla@gmail.com
            </a>
          )}
        </div>
      )}

      <p className="mt-2.5 font-mono text-[9px] leading-relaxed text-mut2">
        Cihaz kimliğinizi geliştiriciye gönderin; size bu telefona özel bir etkinleştirme kodu
        verilir. Kod <b className="text-mut">yalnızca bu telefonda</b> çalışır, başka telefonda
        geçersiz olur.
      </p>
    </div>
  );
}
