import { useEffect, useState } from 'react';
import { cn } from '../utils/cn';
import { Ic } from '../icons';
import { useLocale } from '../locales/i18n';
import { LOCALES } from '../locales/i18n';
import Flag from './Flag';
import BrandLogo from './BrandLogo';
import {
  USERS,
  VIEWS_LOCKED_FOR_CASHIER,
  fmt,
  DEFAULT_CURRENCIES,
  setActiveCurrencyCode,
  type Settings,
  type ViewId,
} from '../data';

export const NAV: { id: ViewId; key: string; icon: string }[] = [
  { id: 'sales', key: 'nav.sales', icon: 'cart' },
  { id: 'delivery', key: 'nav.delivery', icon: 'bag' },
  { id: 'imkart', key: 'nav.imkart', icon: 'card' },
  { id: 'pos-integration', key: 'nav.posIntegration', icon: 'card' },
  { id: 'stock', key: 'nav.stock', icon: 'box' },
  { id: 'purchase', key: 'nav.purchase', icon: 'bag' },
  { id: 'credit', key: 'nav.credit', icon: 'scale' },
  { id: 'expense', key: 'nav.expense', icon: 'folder' },
  { id: 'staff', key: 'nav.staff', icon: 'users' },
  { id: 'cash', key: 'nav.cash', icon: 'monitor' },
  { id: 'settings', key: 'nav.settings', icon: 'gear' },
];

export function Logo({ small, icon = 'flame' }: { small?: boolean; icon?: string }) {
  return (
    <div className={cn('flex items-center gap-2.5', small ? '' : '')}>
      <BrandLogo fallbackIcon={icon} />
      {!small && (
        <div className="min-w-0">
          <div className="truncate font-mono text-[12.5px] font-bold tracking-[0.08em] text-txt">MOSBARKODYA…</div>
          <div className="font-mono text-[9px] tracking-[0.18em] text-mut2">MOSBARKOD V1.5</div>
        </div>
      )}
    </div>
  );
}

export function Sidebar({
  view,
  go,
  collapsed,
  setCollapsed,
  isCashier,
  logoIcon,
}: {
  view: ViewId;
  go: (v: ViewId) => void;
  collapsed: boolean;
  setCollapsed: (b: boolean) => void;
  isCashier: boolean;
  logoIcon: string;
}) {
  return (
    <aside
      className={cn(
        'hidden shrink-0 flex-col border-r border-line bg-panel transition-all duration-200 md:flex',
        collapsed ? 'w-[64px]' : 'w-[228px]'
      )}
    >
      <div className={cn('border-b border-line px-3 py-3.5', collapsed ? 'flex justify-center px-2' : '')}>
        <Logo small={collapsed} icon={logoIcon} />
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-2">
        {(() => {
          const { t } = useLocale();
          const labelOf = (id: string) => t(NAV.find((n) => n.id === id)?.key ?? 'nav.sales');
          return NAV.map((it) => {
            const active = view === it.id;
            const locked = isCashier && VIEWS_LOCKED_FOR_CASHIER.includes(it.id);
            const label = labelOf(it.id);
            return (
              <button
                key={it.id}
                onClick={() => go(it.id)}
                title={label}
                className={cn(
                  'group flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[13px] transition-colors',
                  collapsed && 'justify-center px-0',
                  active
                    ? 'bg-amber font-semibold text-[#1a1102] shadow-[0_0_16px_rgba(245,158,11,0.25)]'
                    : 'text-mut hover:bg-panel3 hover:text-txt'
                )}
              >
                <Ic n={it.icon} c="h-[18px] w-[18px] shrink-0" />
                {!collapsed && <span className="flex-1 truncate">{label}</span>}
                {!collapsed && locked && (
                  <Ic n="lock" c={cn('h-3.5 w-3.5', active ? 'text-[#1a1102]/60' : 'text-mut2')} />
                )}
              </button>
            );
          });
        })()}
      </nav>
      <div className="border-t border-line p-2">
        <button
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Genişlet' : 'Daralt'}
          className={cn(
            'flex w-full items-center justify-center rounded-lg border border-line2 bg-panel2/60 py-2 text-mut transition-colors hover:border-amber/50 hover:text-amber2',
            !collapsed && 'gap-2 px-3'
          )}
        >
          <Ic n={collapsed ? 'chevR' : 'chevL'} c="h-4 w-4" />
          {!collapsed && <span className="font-mono text-[10px] uppercase tracking-widest">Daralt</span>}
        </button>
      </div>
    </aside>
  );
}

export function MobileNav({ view, go }: { view: ViewId; go: (v: ViewId) => void }) {
  const { t } = useLocale();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex gap-1 overflow-x-auto border-t border-line bg-panel/95 px-2 pb-[env(safe-area-inset-bottom)] pt-1.5 backdrop-blur md:hidden"
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      {NAV.map((it) => {
        const active = view === it.id;
        const label = t(it.key);
        return (
          <button
            key={it.id}
            onClick={() => go(it.id)}
            title={label}
            className={cn(
              'flex min-w-[64px] flex-1 flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 transition-colors',
              active ? 'bg-amber/15 text-amber2' : 'text-mut active:bg-panel3'
            )}
          >
            <Ic n={it.icon} c="h-5 w-5" />
            <span className="w-full truncate text-center font-mono text-[8.5px] font-semibold uppercase tracking-wide">
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="hidden flex-col items-center rounded-lg border border-line2 bg-ink/50 px-2.5 py-1 leading-none lg:flex">
      <span className="font-mono text-[11px] font-bold tabular-nums text-txt">
        {now.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
      </span>
      <span className="mt-0.5 flex items-center gap-1 font-mono text-[10px] tabular-nums text-mut">
        <Ic n="clock" c="h-2.5 w-2.5" />
        {now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </span>
    </div>
  );
}

export function TopBar({
  settings,
  ciroToday,
  customerCount,
  criticalCount,
  negCount,
  imkartLimit,
  onImkartClick,
  register,
  setRegister,
  currentUser,
  setUser,
  go,
  syncConnected,
  syncCode,
}: {
  settings: Settings;
  ciroToday: number;
  customerCount: number;
  criticalCount: number;
  negCount: number;
  veresiyeTotal: number;
  imkartLimit: number;
  onImkartClick: () => void;
  register: number;
  setRegister: (n: number) => void;
  currentUser: string;
  setUser: (id: string) => void;
  go: (v: ViewId) => void;
  syncConnected?: boolean;
  syncCode?: string;
}) {
  return (
    <header className="flex h-[58px] shrink-0 items-center gap-3 border-b border-line bg-panel px-3">
      <div className="flex items-center gap-2.5">
        <BrandLogo fallbackIcon={settings.logoIcon || 'flame'} />
        <div className="hidden md:block">
          <div className="font-mono text-[13px] font-bold tracking-[0.14em]">{settings.brandTitle || 'MOSBARKODYAZILIM'}</div>
          <div className="font-mono text-[8.5px] tracking-[0.2em] text-mut2">
            YAPAY ZEKÂ DESTEKLİ BARKOD SATIŞ PROGRAMI
          </div>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={onImkartClick}
          title="Ulaşım Kartı dolum penceresini aç"
          className="hidden flex-col rounded-lg border border-blue/30 bg-blue/5 px-2.5 py-1 text-left transition-colors hover:border-blue/60 hover:bg-blue/10 xl:flex"
        >
          <span className="flex items-center gap-1 font-mono text-[8.5px] uppercase tracking-[0.14em] text-mut2">
            <Ic n="card" c="h-3 w-3" /> Ulaşım Kartı Limiti
          </span>
          <span className="font-mono text-[13px] font-bold leading-tight text-blue tabular-nums">
            {fmt(imkartLimit)}
          </span>
          <span className="font-mono text-[8.5px] text-blue/80">dolum için tıkla →</span>
        </button>
        <div className="hidden flex-col rounded-lg border border-mint/30 bg-mint/5 px-2.5 py-1 text-left xl:flex">
          <span className="flex items-center gap-1 font-mono text-[8.5px] uppercase tracking-[0.14em] text-mut2">
            <span className="blink-dot h-1.5 w-1.5 rounded-full bg-mint" /> Bugünkü Ciro
          </span>
          <span className="font-mono text-[13px] font-bold leading-tight text-mint tabular-nums">{fmt(ciroToday)}</span>
        </div>
        <div
          className="hidden flex-col items-center rounded-lg border border-line2 bg-ink/50 px-2 py-1 text-center lg:flex"
          title="Bugünkü müşteri sayısı"
        >
          <Ic n="users" c="h-3.5 w-3.5 text-mut" />
          <span className="font-mono text-[13px] font-bold leading-tight text-blue tabular-nums">{customerCount}</span>
        </div>

        {(criticalCount > 0 || negCount > 0) && (
          <button
            onClick={() => go('stock')}
            title="Stok uyarıları — Ürün & Stok'a git"
            className="hidden items-center gap-1.5 rounded-lg border border-amber/40 bg-amber/10 px-2.5 py-2 text-amber2 transition-colors hover:bg-amber/20 md:flex"
          >
            <Ic n="alert" c="h-4 w-4" />
            <span className="font-mono text-[12px] font-bold tabular-nums">{criticalCount + negCount}</span>
          </button>
        )}

        {syncConnected && (
          <span
            title="Mobil cihaz eşzamanlı bağlı"
            className="flex items-center gap-1.5 rounded-lg border border-mint/40 bg-mint/10 px-2.5 py-2 text-mint"
          >
            <span className="blink-dot h-2 w-2 rounded-full bg-mint" />
            <span className="font-mono text-[11px] font-bold">{syncCode}</span>
          </span>
        )}

        <div className="flex items-center gap-1 rounded-lg border border-line2 bg-ink/50 p-1">
          <span className="hidden font-mono text-[8.5px] uppercase tracking-widest text-mut2 md:block pl-1">Kasa</span>
          {[1, 2, 3].map((r) => (
            <button
              key={r}
              onClick={() => setRegister(r)}
              className={cn(
                'h-7 w-7 rounded-md font-mono text-[12px] font-bold transition-colors',
                register === r ? 'bg-amber text-[#1a1102]' : 'text-mut hover:bg-panel3 hover:text-txt'
              )}
            >
              {r}
            </button>
          ))}
        </div>

        <div className="hidden items-center gap-1 rounded-lg border border-line2 bg-ink/50 p-1 lg:flex">
          {USERS.map((u) => (
            <button
              key={u.id}
              onClick={() => setUser(u.id)}
              title={`${u.name} — ${u.sub}`}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-2 py-1 transition-colors',
                currentUser === u.id ? 'bg-amber/15 text-amber2' : 'text-mut hover:bg-panel3 hover:text-txt'
              )}
            >
              <span
                className="flex h-5 w-5 items-center justify-center rounded-full border font-mono text-[9px] font-bold"
                style={{ borderColor: u.color, color: u.color }}
              >
                {u.name[0]}
              </span>
              <span className="hidden text-[11px] font-medium xl:block">{u.name}</span>
            </button>
          ))}
        </div>

        {/* Para Birimi seçici — TopBar */}
        <CurrencySwitcher currentCurrency={settings.currency?.active || 'TRY'} onSelect={(code) => {
          setActiveCurrencyCode(code);
          settings.currency = { active: code, currencies: DEFAULT_CURRENCIES };
          try {
            const raw = localStorage.getItem('mosbarkod_v15_state');
            if (raw) {
              const parsed = JSON.parse(raw);
              if (parsed?.settings) {
                parsed.settings.currency = { active: code, currencies: DEFAULT_CURRENCIES };
                localStorage.setItem('mosbarkod_v15_state', JSON.stringify(parsed));
              }
            }
          } catch {
            /* ignore */
          }
        }} />

        {/* Dil seçici — TopBar */}
        <LanguageSwitcher />

        <Clock />
      </div>
    </header>
  );
}

function CurrencySwitcher({
  currentCurrency,
  onSelect,
}: {
  currentCurrency: string;
  onSelect: (code: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [activeCode, setActiveCode] = useState(currentCurrency || 'TRY');
  const cur = DEFAULT_CURRENCIES.find((c) => c.code === activeCode) ?? DEFAULT_CURRENCIES[0];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        title={`Para Birimi: ${cur.name}`}
        className="flex items-center gap-1.5 rounded-lg border border-line2 bg-ink/50 px-2 py-1.5 text-txt transition-colors hover:border-amber/50 hover:text-amber2"
      >
        <span className="font-mono text-xs font-black text-amber2">{cur.symbol}</span>
        <span className="font-mono text-[11px] font-bold uppercase text-mut2 hidden sm:inline">{cur.code}</span>
      </button>

      {open && (
        <div className="anim-pop absolute right-0 top-full z-50 mt-2 max-h-[320px] w-[200px] overflow-y-auto rounded-xl border border-line2 bg-panel p-1 shadow-2xl shadow-black/80">
          <div className="px-2.5 py-1.5 font-mono text-[9.5px] font-bold text-mut2 uppercase border-b border-line">
            Para Birimi Seçin
          </div>
          {DEFAULT_CURRENCIES.map((c) => (
            <button
              key={c.code}
              onClick={() => {
                setActiveCode(c.code);
                onSelect(c.code);
                setOpen(false);
              }}
              className={cn(
                'flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs transition-colors hover:bg-panel3 rounded-lg',
                activeCode === c.code ? 'bg-amber/10 text-amber2 font-bold' : 'text-txt'
              )}
            >
              <span className="font-mono font-black text-amber2 w-5 text-center">{c.symbol}</span>
              <span className="flex-1 truncate">{c.code} — {c.name.split('(')[0].trim()}</span>
              {activeCode === c.code && <Ic n="check" c="h-3.5 w-3.5 text-amber2" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();
  const [open, setOpen] = useState(false);
  const current = LOCALES.find((l) => l.id === locale) ?? LOCALES[0];
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        title={`${current.label} (${current.native})`}
        className="flex items-center gap-1.5 rounded-lg border border-line2 bg-ink/50 px-2.5 py-1.5 text-txt transition-colors hover:border-amber/50 hover:text-amber2"
      >
        <span className="text-base leading-none"><Flag code={current.id} className="h-3.5 w-[18px]" /></span>
        <span className="font-mono text-[11px] font-bold uppercase text-amber2">{current.id}</span>
      </button>
      {open && (
        <div className="anim-pop absolute right-0 top-full z-50 mt-2 max-h-[380px] w-[220px] overflow-y-auto rounded-xl border border-line2 bg-panel p-1 shadow-2xl shadow-black/80">
          {LOCALES.map((l) => (
            <button
              key={l.id}
              onClick={() => {
                setLocale(l.id);
                setOpen(false);
              }}
              className={cn(
                'flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-[12.5px] transition-colors hover:bg-panel3',
                locale === l.id ? 'bg-amber/10 text-amber2' : 'text-txt'
              )}
            >
              <Flag code={l.id} className="h-4 w-[21px]" />
              <span className="flex-1 font-semibold">{l.native}</span>
              {locale === l.id && <Ic n="check" c="h-3.5 w-3.5 text-mint" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
