import { useEffect, useRef, useState } from 'react';
import { cn } from '../utils/cn';
import { Ic } from '../icons';
import { USERS, USER_THEMES } from '../data';

/**
 * Kullanıcı seçimi + 4 haneli PIN girişi.
 * - `mode="login"`: program açılışındaki tam ekran giriş
 * - `mode="switch"`: çalışırken kullanıcı değiştirme (iptal edilebilir)
 */
export default function LoginGate({
  pins,
  onSuccess,
  onCancel,
  mode = 'login',
  presetUser,
  brandTitle = 'MOSBARKODYAZILIM',
}: {
  pins: Record<string, string>;
  onSuccess: (userId: string) => void;
  onCancel?: () => void;
  mode?: 'login' | 'switch';
  presetUser?: string;
  brandTitle?: string;
}) {
  const [sel, setSel] = useState<string | null>(presetUser ?? null);
  const [pin, setPin] = useState('');
  const [err, setErr] = useState(false);
  const [ok, setOk] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (sel) setTimeout(() => inputRef.current?.focus(), 60);
  }, [sel]);

  const user = USERS.find((u) => u.id === sel);
  const theme = sel ? USER_THEMES[sel] : null;

  const submit = (value: string) => {
    if (!sel) return;
    const expected = pins[sel] ?? '';
    if (value === expected) {
      setOk(true);
      setTimeout(() => onSuccess(sel), 380);
    } else {
      setErr(true);
      setTimeout(() => {
        setErr(false);
        setPin('');
        inputRef.current?.focus();
      }, 520);
    }
  };

  const press = (d: string) => {
    if (ok || err || pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    if (next.length === 4) setTimeout(() => submit(next), 140);
  };

  const back = () => setPin((p) => p.slice(0, -1));

  return (
    <div
      className={cn(
        'fixed inset-0 z-[95] flex items-center justify-center overflow-y-auto p-4 font-sans',
        mode === 'login' ? 'bg-ink' : 'bg-black/85 backdrop-blur-sm'
      )}
    >
      {/* arka plan ışıkları */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-amber/10 blur-[120px]" />
        <div className="absolute -right-32 bottom-1/4 h-96 w-96 rounded-full bg-mint/10 blur-[120px]" />
        <div className="absolute left-1/2 top-0 h-64 w-[520px] -translate-x-1/2 rounded-full bg-amber/5 blur-[100px]" />
      </div>

      <div className="relative w-full max-w-3xl">
        {/* başlık */}
        <div className="mb-7 text-center">
          <div className="amber-license-glow mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-amber/50 bg-ink/90">
            <Ic n="flame" c="h-7 w-7 text-amber2" />
          </div>
          <h1 className="mt-4 font-mono text-[19px] font-bold tracking-[0.16em] text-amber2">{brandTitle}</h1>
          <p className="mt-1 font-mono text-[10.5px] tracking-[0.2em] text-mut2">
            {sel ? 'PIN KODUNUZU GİRİN' : mode === 'login' ? 'KULLANICI SEÇİN' : 'KULLANICI DEĞİŞTİR'}
          </p>
        </div>

        {!sel ? (
          /* ---------- kullanıcı kartları ---------- */
          <div className="grid gap-4 sm:grid-cols-3">
            {USERS.map((u) => {
              const t = USER_THEMES[u.id];
              return (
                <button
                  key={u.id}
                  onClick={() => {
                    setSel(u.id);
                    setPin('');
                  }}
                  className="user-card group relative overflow-hidden rounded-2xl border-2 p-6 text-center transition-transform hover:-translate-y-1"
                  style={{ background: t.bg, borderColor: `${t.border}66`, ['--glow' as string]: '#f59e0b' }}
                >
                  <span className="pointer-events-none absolute inset-0 rounded-2xl border-2 border-amber/40 opacity-0 transition-opacity group-hover:opacity-100" />
                  <div
                    className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border-2 bg-black/35"
                    style={{ borderColor: t.border }}
                  >
                    <Ic n="user" c="h-8 w-8" />
                  </div>
                  <div className="mt-4 font-mono text-[15px] font-bold tracking-wider" style={{ color: t.text }}>
                    {u.name}
                  </div>
                  <div className="mt-1 font-mono text-[9px] tracking-[0.22em] text-white/55">{t.label}</div>
                  <div className="mt-4 flex items-center justify-center gap-1.5">
                    {[0, 1, 2, 3].map((i) => (
                      <span key={i} className="h-2 w-2 rounded-full border" style={{ borderColor: `${t.border}88` }} />
                    ))}
                  </div>
                  <div className="mt-3 font-mono text-[9.5px] font-bold uppercase tracking-widest text-amber2/80">
                    PIN ile giriş →
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          /* ---------- PIN girişi ---------- */
          <div className="mx-auto max-w-[340px]">
            <div
              className={cn('rounded-2xl border-2 p-5', err && 'animate-[shake_0.4s]')}
              style={{
                background: theme!.bg,
                borderColor: err ? '#ef5350' : ok ? '#2fd6a5' : `${theme!.border}66`,
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-xl border-2 bg-black/35"
                  style={{ borderColor: theme!.border }}
                >
                  <Ic n="user" c="h-5 w-5" />
                </div>
                <div className="text-left">
                  <div className="font-mono text-[14px] font-bold" style={{ color: theme!.text }}>
                    {user!.name}
                  </div>
                  <div className="font-mono text-[9px] tracking-[0.2em] text-white/50">{theme!.label}</div>
                </div>
                <button
                  onClick={() => {
                    setSel(null);
                    setPin('');
                  }}
                  className="ml-auto rounded-lg border border-white/20 bg-black/30 p-2 text-white/70 transition-colors hover:text-white"
                  title="Kullanıcı değiştir"
                >
                  <Ic n="chevL" c="h-4 w-4" />
                </button>
              </div>

              {/* PIN noktaları */}
              <div className="mt-5 flex items-center justify-center gap-2.5">
                {Array.from({ length: Math.min(8, Math.max(4, pin.length)) }).map((_, i) => (
                  <span
                    key={i}
                    className={cn('h-3.5 w-3.5 rounded-full border-2 transition-all', pin.length > i && 'scale-110')}
                    style={{
                      borderColor: err ? '#ef5350' : ok ? '#2fd6a5' : theme!.border,
                      background: pin.length > i ? (err ? '#ef5350' : ok ? '#2fd6a5' : theme!.border) : 'transparent',
                    }}
                  />
                ))}
              </div>

              <div className="mt-2 h-4 text-center font-mono text-[10px] font-bold">
                {err && <span className="text-red">HATALI PIN</span>}
                {ok && <span className="text-mint">GİRİŞ BAŞARILI</span>}
              </div>

              {/* gizli input — fiziksel klavye desteği */}
              <input
                ref={inputRef}
                value={pin}
                inputMode="numeric"
                autoComplete="off"
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, '').slice(0, 4);
                  setPin(v);
                  if (v.length === 4) setTimeout(() => submit(v), 140);
                }}
                className="pointer-events-none absolute h-0 w-0 opacity-0"
              />

              {/* tuş takımı */}
              <div className="mt-3 grid grid-cols-3 gap-2">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
                  <button
                    key={d}
                    onClick={() => press(d)}
                    className="rounded-xl border border-white/15 bg-black/30 py-3.5 font-mono text-[19px] font-bold text-white transition-colors active:bg-amber/25"
                  >
                    {d}
                  </button>
                ))}
                <button
                  onClick={() => setPin('')}
                  className="rounded-xl border border-white/15 bg-black/20 py-3.5 font-mono text-[11px] font-bold text-white/70 transition-colors active:bg-red/25"
                >
                  TEMİZLE
                </button>
                <button
                  onClick={() => press('0')}
                  className="rounded-xl border border-white/15 bg-black/30 py-3.5 font-mono text-[19px] font-bold text-white transition-colors active:bg-amber/25"
                >
                  0
                </button>
                <button
                  onClick={back}
                  className="rounded-xl border border-white/15 bg-black/20 py-3.5 font-mono text-[15px] font-bold text-white/70 transition-colors active:bg-red/25"
                >
                  ⌫
                </button>
              </div>
            </div>

            {mode === 'switch' && onCancel && (
              <button
                onClick={onCancel}
                className="mt-3 w-full rounded-xl border border-line2 bg-panel/70 py-2.5 font-mono text-[12px] font-semibold text-mut transition-colors hover:text-txt"
              >
                Vazgeç
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
