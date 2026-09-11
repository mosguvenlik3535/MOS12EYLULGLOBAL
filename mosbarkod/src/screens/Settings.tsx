import { useEffect, useRef, useState } from 'react';
import JSZip from 'jszip';
import { QRCodeSVG } from 'qrcode.react';
import { cn } from '../utils/cn';
import { Ic } from '../icons';
import { Badge, Btn, Field, Inp, Modal, ScreenHead, Sel } from '../components/ui';
import { HardwareCard, ReportCard, WhatsAppCard, EmailCard } from './SettingsIntegrations';
import { AutoBackupCard, HealthCheckCard, SoundCard, ThemesCard } from './SettingsSystem';
import { applyTheme } from '../lib/themes';
import { defaultUI, DEFAULT_CURRENCIES, setActiveCurrencyCode, type AppState, type Settings, type CurrencyConfig } from '../data';
import CameraScanner from '../components/CameraScanner';
import { CustomerDisplay } from '../components/CustomerDisplay';
import { useLocale } from '../locales/i18n';
import { LOCALES } from '../locales/i18n';

type Toast = (msg: string, type?: 'ok' | 'err') => void;

function Panel({
  icon,
  title,
  desc,
  color = 'text-amber',
  right,
  children,
}: {
  icon: string;
  title: string;
  desc?: string;
  color?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-line bg-panel p-4">
      <div className="mb-1 flex items-center gap-2.5">
        <span className={cn('rounded-lg border border-line2 bg-panel3 p-2', color)}>
          <Ic n={icon} c="h-4.5 w-4.5" />
        </span>
        <h3 className={cn('font-mono text-[12.5px] font-bold uppercase tracking-widest', color)}>{title}</h3>
        <div className="ml-auto">{right}</div>
      </div>
      {desc && <p className="mb-3 mt-0.5 text-[11px] leading-relaxed text-mut2">{desc}</p>}
      {children}
    </section>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (b: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={cn('relative h-6 w-11 rounded-full border transition-colors', on ? 'border-transparent bg-mint' : 'border-line2 bg-ink')}
    >
      <span className={cn('absolute top-0.5 h-[18px] w-[18px] rounded-full bg-white shadow transition-all', on ? 'left-[22px]' : 'left-0.5')} />
    </button>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const safe = /^#[0-9a-fA-F]{6}$/.test(value) ? value : '#ffffff';
  return (
    <div>
      <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-mut">{label}</span>
      <div className="flex items-center gap-2">
        <input type="color" value={safe} onChange={(e) => onChange(e.target.value)} className="h-9 w-11 rounded-md border border-line2 bg-ink p-0.5" />
        <Inp value={value} onChange={(e) => onChange(e.target.value)} className="font-mono text-[12px]" />
      </div>
    </div>
  );
}

function AppearanceCard({ ui, onPatch }: { ui: Settings['ui']; onPatch: (p: Partial<Settings>) => void }) {
  const set = (k: keyof Settings['ui'], v: number | string | boolean) => onPatch({ ui: { ...ui, [k]: v } });

  const preview = (
    <div className="w-full overflow-hidden rounded-xl border border-line bg-panel2/70">
      {ui.fullCardImage ? (
        <div className="relative overflow-hidden" style={{ height: ui.productImgH + 58 }}>
          <img
            src="https://images.pexels.com/photos/15875047/pexels-photo-15875047.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=400&w=640"
            alt=""
            className="h-full w-full"
            style={{ objectFit: ui.productImgFit, transform: `scale(${Math.max(50, Math.min(200, ui.productImgScale)) / 100})`, transformOrigin: 'center center' }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
          {ui.overlayEnabled && (
            <span
              className={cn('absolute top-1.5 max-w-[92%] truncate rounded-md px-1.5 py-0.5 font-bold leading-tight', ui.overlayPos === 'right' ? 'right-1.5' : ui.overlayPos === 'center' ? 'left-1/2 -translate-x-1/2' : 'left-1.5')}
              style={{ fontSize: ui.overlaySize, color: ui.overlayColor, background: ui.overlayBgTransparent ? 'rgba(0,0,0,0.5)' : ui.overlayBg, textShadow: ui.overlayBgTransparent ? '0 1px 2px rgba(0,0,0,0.9)' : undefined }}
            >
              {(ui.overlayText || 'ÖRNEK').replace('{AD}', 'Tuborg Gold').replace('{FIYAT}', '75,00 ₺')}
            </span>
          )}
          <span className="absolute right-1.5 top-1.5 rounded bg-[#1c4a31] px-1.5 py-0.5 font-mono text-[9px] font-bold text-[#c4ecd6]">KRİTİK: 10</span>
          <div className="absolute inset-x-0 bottom-0 p-2.5">
            <div className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-white/70">Bira</div>
            {ui.showNameOnImage && <div className="mt-0.5 truncate leading-tight drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]" style={{ fontSize: ui.nameSize, fontWeight: ui.nameWeight, color: ui.nameColor }}>Tuborg Gold Kütü 50cl</div>}
            <div className="mt-2 flex items-center justify-between gap-1 border-t border-white/15 pt-1.5">
              <span className="font-mono text-[10px] tabular-nums drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]" style={{ color: ui.stockColor }}>Stok: 128</span>
              {ui.showPriceOnImage && <span className="font-mono text-[12px] font-bold tabular-nums drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]" style={{ color: ui.priceColor }}>75,00 ₺</span>}
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="relative overflow-hidden bg-panel3" style={{ height: ui.productImgH }}>
            <img
              src="https://images.pexels.com/photos/15875047/pexels-photo-15875047.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=400&w=640"
              alt=""
              className="h-full w-full"
              style={{ objectFit: ui.productImgFit, transform: `scale(${Math.max(50, Math.min(200, ui.productImgScale)) / 100})`, transformOrigin: 'center center' }}
            />
            {ui.overlayEnabled && (
              <span
                className={cn('absolute bottom-1.5 max-w-[95%] truncate rounded-md px-1.5 py-0.5 font-bold leading-tight', ui.overlayPos === 'right' ? 'right-1.5' : ui.overlayPos === 'center' ? 'left-1/2 -translate-x-1/2' : 'left-1.5')}
                style={{ fontSize: ui.overlaySize, color: ui.overlayColor, background: ui.overlayBgTransparent ? 'rgba(0,0,0,0.5)' : ui.overlayBg, textShadow: ui.overlayBgTransparent ? '0 1px 2px rgba(0,0,0,0.9)' : undefined }}
              >
                {(ui.overlayText || 'ÖRNEK').replace('{AD}', 'Tuborg Gold').replace('{FIYAT}', '75,00 ₺')}
              </span>
            )}
            <span className="absolute right-1.5 top-1.5 rounded bg-[#1c4a31] px-1.5 py-0.5 font-mono text-[9px] font-bold text-[#c4ecd6]">KRİTİK: 10</span>
          </div>
          <div className="p-2.5">
            <div className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-mut2">Bira</div>
            <div className="mt-0.5 truncate leading-tight" style={{ fontSize: ui.nameSize, fontWeight: ui.nameWeight, color: ui.nameColor }}>Tuborg Gold Kütü 50cl</div>
            <div className="mt-2 flex items-center justify-between gap-1 border-t border-line pt-1.5">
              <span className="font-mono text-[10px] tabular-nums" style={{ color: ui.stockColor }}>Stok: 128</span>
              <span className="font-mono text-[12px] font-bold tabular-nums" style={{ color: ui.priceColor }}>75,00 ₺</span>
            </div>
          </div>
        </>
      )}
    </div>
  );

  return (
    <Panel icon="star" title="Görünüm Özelleştirme" desc="Ürün kartlarındaki görsel boyutu, tam kart kaplama modu ve yazı stillerini kendinize göre ayarlayın — değişiklikler anında tüm ekranda uygulanır.">
      <div className="grid gap-3 lg:grid-cols-[220px_1fr]">
        <div>
          <div className="mb-1.5 font-mono text-[10px] uppercase tracking-widest text-mut2">Canlı Önizleme</div>
          {preview}
        </div>
        <div className="space-y-3.5">
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-widest text-mut">Ürün Görsel Yüksekliği</span>
              <span className="font-mono text-[11px] font-bold text-amber2 tabular-nums">{ui.productImgH} px</span>
            </div>
            <input type="range" min={60} max={140} step={2} value={ui.productImgH} onChange={(e) => set('productImgH', Number(e.target.value))} className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-line2 accent-[var(--color-amber)]" />
            <p className="mt-1 text-[10px] text-mut2">Kart kutusunun yüksekliği</p>
          </div>

          <div className="rounded-lg border border-line bg-ink/40 px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-mut">Tam Kart Görsel Modu</span>
                <p className="mt-0.5 text-[10px] text-mut2">Resim kartın en alt kavisli köşelerine kadar tüm kartı kaplar.</p>
              </div>
              <Toggle on={ui.fullCardImage} onChange={(b) => set('fullCardImage', b)} />
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-widest text-mut">Görsel Ölçeği (Kutu İçi)</span>
              <span className="font-mono text-[11px] font-bold text-amber2 tabular-nums">%{ui.productImgScale}</span>
            </div>
            <input type="range" min={50} max={200} step={5} value={ui.productImgScale} onChange={(e) => set('productImgScale', Number(e.target.value))} className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-line2 accent-[var(--color-amber)]" />
            <p className="mt-1 text-[10px] text-mut2">Fotoğrafı kutu içinde yakınlaştır / uzaklaştır</p>
          </div>

          <div>
            <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-mut">Görsel Sığdırma</span>
            <div className="flex gap-1.5">
              {[{ id: 'cover' as const, label: 'Kutuyu Kapla' }, { id: 'contain' as const, label: 'Tamamı Görünsün' }].map((x) => (
                <button key={x.id} onClick={() => set('productImgFit', x.id)} className={cn('flex-1 rounded-lg border px-2 py-2 text-[12px] font-semibold transition-colors', ui.productImgFit === x.id ? 'border-amber bg-amber/15 text-amber2' : 'border-line2 bg-ink/40 text-mut hover:text-txt')}>
                  {x.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-line bg-ink/40 p-3">
            <div className="mb-3 grid gap-2 sm:grid-cols-2">
              <label className="flex cursor-pointer items-center gap-2 text-[11px] text-mut">
                <button role="checkbox" aria-checked={ui.showNameOnImage} onClick={() => set('showNameOnImage', !ui.showNameOnImage)} className={cn('flex h-4 w-4 items-center justify-center rounded border transition-colors', ui.showNameOnImage ? 'border-amber bg-amber text-[#1a1102]' : 'border-line2 bg-ink')}>
                  {ui.showNameOnImage && <Ic n="check" c="h-3 w-3" />}
                </button>
                Ürün adını resim üstüne yaz
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-[11px] text-mut">
                <button role="checkbox" aria-checked={ui.showPriceOnImage} onClick={() => set('showPriceOnImage', !ui.showPriceOnImage)} className={cn('flex h-4 w-4 items-center justify-center rounded border transition-colors', ui.showPriceOnImage ? 'border-amber bg-amber text-[#1a1102]' : 'border-line2 bg-ink')}>
                  {ui.showPriceOnImage && <Ic n="check" c="h-3 w-3" />}
                </button>
                Fiyatı resim üstüne yaz
              </label>
            </div>

            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-mut">Resim Üzeri Metin (Örtük Yazı)</span>
                <p className="mt-0.5 text-[10px] text-mut2">Ek kampanya etiketi, damga ya da özel yazı.</p>
              </div>
              <Toggle on={ui.overlayEnabled} onChange={(b) => set('overlayEnabled', b)} />
            </div>
            {ui.overlayEnabled && (
              <div className="space-y-3">
                <Field label="Yazı Metni — {'{AD}'} ürün adını, {'{FIYAT}'} fiyatı gösterir">
                  <Inp value={ui.overlayText} onChange={(e) => set('overlayText', e.target.value)} placeholder="Örn: İNDİRİM -%20" />
                </Field>
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-mut">Yazı Boyutu</span>
                    <span className="font-mono text-[11px] font-bold text-amber2 tabular-nums">{ui.overlaySize} px</span>
                  </div>
                  <input type="range" min={10} max={24} step={1} value={ui.overlaySize} onChange={(e) => set('overlaySize', Number(e.target.value))} className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-line2 accent-[var(--color-amber)]" />
                </div>
                <div>
                  <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-mut">Konum</span>
                  <div className="flex gap-1.5">
                    {[{ id: 'left' as const, label: 'Sol' }, { id: 'center' as const, label: 'Orta' }, { id: 'right' as const, label: 'Sağ' }].map((x) => (
                      <button key={x.id} onClick={() => set('overlayPos', x.id)} className={cn('flex-1 rounded-lg border px-2 py-2 text-[12px] font-semibold transition-colors', ui.overlayPos === x.id ? 'border-amber bg-amber/15 text-amber2' : 'border-line2 bg-ink/40 text-mut hover:text-txt')}>
                        {x.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <ColorField label="Yazı Rengi" value={ui.overlayColor} onChange={(v) => set('overlayColor', v)} />
                  <div>
                    <ColorField label="Arka Plan Rengi" value={ui.overlayBg} onChange={(v) => set('overlayBg', v)} />
                    <label className="mt-2 flex cursor-pointer items-center gap-2 text-[10.5px] text-mut">
                      <button role="checkbox" aria-checked={ui.overlayBgTransparent} onClick={() => set('overlayBgTransparent', !ui.overlayBgTransparent)} className={cn('flex h-4 w-4 items-center justify-center rounded border transition-colors', ui.overlayBgTransparent ? 'border-amber bg-amber text-[#1a1102]' : 'border-line2 bg-ink')}>
                        {ui.overlayBgTransparent && <Ic n="check" c="h-3 w-3" />}
                      </button>
                      Şeffaf arka plan (koyu gölge ile)
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-widest text-mut">Ürün Adı Boyutu</span>
              <span className="font-mono text-[11px] font-bold text-amber2 tabular-nums">{ui.nameSize} px</span>
            </div>
            <input type="range" min={11} max={16} step={1} value={ui.nameSize} onChange={(e) => set('nameSize', Number(e.target.value))} className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-line2 accent-[var(--color-amber)]" />
          </div>

          <div>
            <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-mut">Yazı Kalınlığı</span>
            <div className="flex gap-1.5">
              {([
                { w: 400, label: 'İnce' },
                { w: 500, label: 'Orta' },
                { w: 600, label: 'Yarı Kalın' },
                { w: 700, label: 'Kalın' },
              ] as const).map((x) => (
                <button
                  key={x.w}
                  onClick={() => set('nameWeight', x.w)}
                  className={cn('flex-1 rounded-lg border px-2 py-2 text-[12px] transition-colors', ui.nameWeight === x.w ? 'border-amber bg-amber/15 text-amber2' : 'border-line2 bg-ink/40 text-mut hover:text-txt')}
                  style={{ fontWeight: x.w }}
                >
                  {x.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <ColorField label="Ürün Adı Rengi" value={ui.nameColor} onChange={(v) => set('nameColor', v)} />
            <ColorField label="Fiyat Rengi" value={ui.priceColor} onChange={(v) => set('priceColor', v)} />
            <ColorField label="Stok Rengi" value={ui.stockColor} onChange={(v) => set('stockColor', v)} />
          </div>

          <div className="flex items-center justify-between">
            <p className="text-[10.5px] leading-relaxed text-mut2">Bu stiller ürün kartlarında, sepet satırlarında ve kısayol ürünlerinde kullanılır.</p>
            <button onClick={() => onPatch({ ui: defaultUI() })} className="shrink-0 rounded-md border border-line2 px-2.5 py-1.5 font-mono text-[10.5px] font-semibold text-mut transition-colors hover:border-amber/50 hover:text-amber2">
              <span className="inline-flex items-center gap-1"><Ic n="reset" c="h-3 w-3" /> Varsayılana Dön</span>
            </button>
          </div>
        </div>
      </div>
    </Panel>
  );
}

function LicenseCard() {
  return (
    <section className="rounded-2xl border border-amber/30 bg-gradient-to-b from-[#161511] via-[#0d1424] to-[#090d1b] p-5 text-center shadow-2xl">
      <div className="amber-license-glow mx-auto flex h-36 w-40 flex-col items-center justify-center rounded-2xl border border-amber/40 bg-ink/90">
        <div className="w-[112px] rounded-b-[34px] border-2 border-amber/80 px-2 pb-4 pt-3">
          <div className="font-mono text-[17px] font-extrabold tracking-[0.12em] text-amber2">MEHMET</div>
          <div className="mt-1 font-mono text-[6px] tracking-[0.35em] text-white/65">ORTAYAYLA</div>
        </div>
        <div className="mt-4 font-mono text-[9px] tracking-[0.24em] text-white/60">LİSANSLI YAZILIM</div>
      </div>

      <div className="mt-5 font-mono text-[15px] font-bold tracking-[0.14em] text-amber2">MOSBARKODYAZILIM</div>
      <div className="mt-1 text-[10px] text-mut2">Profesyonel Barkodlu Satış Çözümleri</div>

      <div className="mt-5 space-y-2 rounded-xl border border-white/70 bg-black/20 p-3 font-mono text-[9.5px]">
        <div className="flex justify-between gap-3"><span className="text-mut2">Yazılım Sahibi:</span><span className="font-bold text-txt">MOSBARKODYAZILIM</span></div>
        <div className="flex justify-between gap-3"><span className="text-mut2">Sürüm:</span><span className="font-bold text-txt">v1.5.0-PRO</span></div>
        <div className="flex justify-between gap-3"><span className="text-mut2">Lisans Tipi:</span><span className="font-bold text-mint">✓ ÖMÜR BOYU</span></div>
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

      <p className="mt-4 text-[9px] italic leading-relaxed text-mut2">
        “Bu yazılım MOSBARKODYAZILIM tarafından tescillenmiş olup tüm hakları saklıdır.”
      </p>
    </section>
  );
}

/* ---------------- Büyük kutu (tile) + içerik penceresi ---------------- */

type TileId =
  | 'language'
  | 'currency'
  | 'cfd'
  | 'mobile'
  | 'company'
  | 'appearance'
  | 'whatsapp'
  | 'email'
  | 'hardware'
  | 'backup'
  | 'update'
  | 'downloads'
  | 'mobileSetup'
  | 'reset'
  | 'profile';

function SettingsTile({
  icon,
  title,
  desc,
  color,
  badge,
  onOpen,
}: {
  icon: string;
  title: string;
  desc: string;
  color: string;
  badge?: React.ReactNode;
  onOpen: () => void;
}) {
  return (
    <button
      onClick={onOpen}
      className="group relative flex min-h-[112px] flex-col overflow-hidden rounded-xl border border-line bg-panel p-4 text-left transition-all hover:-translate-y-0.5 hover:border-amber/50 hover:shadow-[0_10px_28px_rgba(0,0,0,0.4)]"
    >
      <div className="flex items-start gap-3">
        <span className={cn('rounded-lg border border-line2 bg-panel3 p-2.5 transition-transform group-hover:scale-105', color)}>
          <Ic n={icon} c="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-[13.5px] font-bold leading-tight">{title}</span>
            {badge}
          </span>
          <span className="mt-1 block text-[11px] leading-relaxed text-mut2">{desc}</span>
        </span>
        <Ic n="chevR" c="h-4 w-4 shrink-0 text-mut2 transition-all group-hover:translate-x-0.5 group-hover:text-amber2" />
      </div>
    </button>
  );
}

function SettingsModal({
  title,
  icon,
  color = 'text-amber',
  wide = true,
  onClose,
  children,
}: {
  title: string;
  icon: string;
  color?: string;
  wide?: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Modal
      title={title}
      icon={<Ic n={icon} c={cn('h-4.5 w-4.5', color)} />}
      onClose={onClose}
      w={wide ? 'max-w-4xl' : 'max-w-2xl'}
    >
      <div className="space-y-3">{children}</div>
    </Modal>
  );
}

type UpdateManifest = {
  app?: string;
  type?: 'program' | 'data' | 'template' | string;
  version?: string;
  date?: string;
  title?: string;
  notes?: string[];
  instructions?: string[];
  minVersion?: string;
};

function UpdateCard({
  state,
  onPatch,
  toast,
}: {
  state: AppState;
  onPatch: (p: Partial<Settings>) => void;
  toast: Toast;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [manifest, setManifest] = useState<UpdateManifest | null>(null);
  const [files, setFiles] = useState<string[]>([]);
  const u = state.settings.update;

  const parseUpdate = async (file: File) => {
    setBusy(true);
    try {
      let parsed: UpdateManifest | null = null;
      let fileNames: string[] = [];

      if (file.name.toLowerCase().endsWith('.zip') || file.name.toLowerCase().endsWith('.mosbupdate')) {
        const zip = await JSZip.loadAsync(file);
        fileNames = Object.keys(zip.files).filter((x) => !zip.files[x].dir);
        const mfName = fileNames.find((x) => /(^|\/)(mosbarkod-update|update)\.json$/i.test(x));
        if (!mfName) throw new Error('manifest-yok');
        parsed = JSON.parse(await zip.files[mfName].async('text')) as UpdateManifest;
      } else if (file.name.toLowerCase().endsWith('.json')) {
        parsed = JSON.parse(await file.text()) as UpdateManifest;
        fileNames = [file.name];
      } else {
        throw new Error('format');
      }

      if (!parsed || (parsed.app && parsed.app !== 'MOSBARKODYAZILIM')) throw new Error('uyumsuz');
      setManifest(parsed);
      setFiles(fileNames);
      onPatch({
        update: {
          ...state.settings.update,
          lastPackageVersion: parsed.version || null,
          lastPackageDate: parsed.date || new Date().toISOString(),
          lastPackageName: file.name,
          lastCheckedAt: new Date().toISOString(),
        },
      });
      toast(`Update paketi okundu: ${parsed.version || 'versiyon belirtilmemiş'}`);
    } catch (e) {
      const msg = String((e as Error).message || e);
      if (msg.includes('manifest-yok')) toast('Update paketinde mosbarkod-update.json bulunamadı', 'err');
      else if (msg.includes('uyumsuz')) toast('Bu update paketi MOSBARKODYAZILIM için uygun değil', 'err');
      else toast('Update dosyası okunamadı. .mosbupdate, .zip veya .json kullanın', 'err');
    }
    setBusy(false);
  };

  const downloadTemplate = async () => {
    const zip = new JSZip();
    zip.file(
      'mosbarkod-update.json',
      JSON.stringify(
        {
          app: 'MOSBARKODYAZILIM',
          type: 'program',
          version: 'v1.5.1-PRO',
          minVersion: state.settings.update.currentVersion,
          date: new Date().toISOString(),
          title: 'Örnek Update Paketi',
          notes: [
            'Program dosyaları güncellendi.',
            'Veriler silinmez; mevcut localStorage kayıtları korunur.',
            'Yeni Windows EXE veya PWA build yayınlandığında bu manifest ile takip edilir.',
          ],
          instructions: [
            'Update dosyasını Ayarlar > Program Update Modülü bölümünden seçin.',
            'Manifest doğrulanınca notları okuyun.',
            'Program kodu güncellemesi için yeni MOSBARKODYAZILIM-Setup.exe dosyasını kurun veya PWA sayfasını yenileyin.',
          ],
        },
        null,
        2
      )
    );
    zip.file('README-UPDATE.txt', 'Bu bir örnek update paketidir. Gerçek güncellemede mosbarkod-update.json ve gerekli dosyalar bulunur.');
    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
    const a = document.createElement('a');
    const url = URL.createObjectURL(blob);
    a.href = url;
    a.download = `MOSBARKOD-Update-Ornek-${new Date().toISOString().slice(0, 10)}.mosbupdate`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Panel
      icon="download"
      title="Program Update Modülü"
      color="text-blue"
      desc="Yeni sürümler, tema/veri paketleri veya program güncelleme manifestleri bu bölümden kontrol edilir."
    >
      <div className="grid gap-3 xl:grid-cols-[1fr_1fr]">
        <div className="space-y-3">
          <div className="rounded-lg border border-line bg-ink/40 p-3 font-mono text-[10.5px] leading-relaxed text-mut2">
            <div className="flex justify-between gap-3"><span>Mevcut Sürüm:</span><span className="font-bold text-txt">{u.currentVersion}</span></div>
            <div className="flex justify-between gap-3"><span>Son Yüklenen Paket:</span><span className="truncate font-bold text-txt">{u.lastPackageName || 'Yok'}</span></div>
            <div className="flex justify-between gap-3"><span>Son Paket Sürümü:</span><span className="font-bold text-txt">{u.lastPackageVersion || 'Yok'}</span></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Btn v="primary" onClick={() => fileRef.current?.click()} disabled={busy}>
              {busy ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Ic n="file" c="h-4 w-4" />}
              Update Dosyası Yükle
            </Btn>
            <Btn v="ghost" onClick={downloadTemplate}>
              <Ic n="download" c="h-4 w-4" /> Örnek Update Dosyası
            </Btn>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".mosbupdate,.zip,.json,application/json,application/zip"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void parseUpdate(f);
              e.target.value = '';
            }}
          />
        </div>

        <div className="rounded-lg border border-line bg-panel2/50 p-3">
          <div className="mb-2 font-mono text-[10px] font-bold uppercase tracking-widest text-amber2">Nasıl Update Yüklenir?</div>
          <ol className="list-decimal space-y-1.5 pl-4 text-[11px] leading-relaxed text-mut">
            <li>Size verilen <b className="text-txt">.mosbupdate</b>, <b className="text-txt">.zip</b> veya <b className="text-txt">.json</b> update dosyasını bilgisayara indirin.</li>
            <li>Bu bölümde <b className="text-txt">Update Dosyası Yükle</b> butonuna basıp dosyayı seçin.</li>
            <li>Program paketin içindeki <b className="text-txt">mosbarkod-update.json</b> manifestini okur ve sürüm/notları gösterir.</li>
            <li>Program kodu değiştiyse yeni <b className="text-txt">MOSBARKODYAZILIM-Setup.exe</b> kurulur. Verileriniz localStorage/yedek sistemiyle korunur.</li>
            <li>Sadece veri/tema paketi ise manifest notlarına göre ilgili yedek veya ayar dosyası yüklenir.</li>
          </ol>
        </div>
      </div>

      {manifest && (
        <div className="mt-3 rounded-xl border border-blue/25 bg-blue/5 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-blue/40 bg-blue/10 px-2 py-1 font-mono text-[10px] font-bold text-blue">{manifest.version || 'Sürüm yok'}</span>
            <span className="font-mono text-[12px] font-bold text-txt">{manifest.title || 'Update Paketi'}</span>
            <span className="ml-auto text-[10px] text-mut2">{manifest.date ? new Date(manifest.date).toLocaleString('tr-TR') : ''}</span>
          </div>
          {manifest.notes && manifest.notes.length > 0 && (
            <ul className="mt-2 list-disc space-y-1 pl-4 text-[11px] text-mut">
              {manifest.notes.map((n, i) => <li key={i}>{n}</li>)}
            </ul>
          )}
          {files.length > 0 && (
            <div className="mt-2 rounded-lg border border-line bg-ink/40 p-2 font-mono text-[10px] text-mut2">
              Dosyalar: {files.slice(0, 8).join(', ')}{files.length > 8 ? ` +${files.length - 8}` : ''}
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}

async function makeWindowsPackage(state: AppState) {
  const zip = new JSZip();
  const html = '<!doctype html>\n' + document.documentElement.outerHTML;
  const now = new Date().toISOString();

  zip.file('README.md', [
    '# MOSBARKODYAZILIM Windows EXE Otomatik Build Paketi',
    '',
    'Bu paket GitHub Actions Windows runner üzerinde otomatik .EXE kurulum dosyası üretmek için hazırlanmıştır.',
    '',
    '## İdeal Akış',
    '1. Bu paket içindeki .github/workflows/windows-exe.yml dosyası repoya eklenir.',
    '2. GitHub Actions sekmesinden "Windows EXE Build" workflowu çalıştırılır.',
    '3. İşlem sonunda MOSBARKODYAZILIM-Setup.exe artifact olarak oluşur.',
    '4. Oluşan .exe dosyası public/downloads/MOSBARKODYAZILIM-Setup.exe olarak yayınlanırsa uygulama içinden direkt indirilebilir.',
    '',
    '## Manuel Yedek Akış',
    'Komut istemi kullanmak istemiyorsanız bu bölümü dikkate almayın. build-exe.bat yalnızca yedek amaçlıdır.',
    '',
    '## Not',
    'Tarayıcı güvenliği nedeniyle gerçek .EXE dosyası doğrudan uygulama içinde derlenemez.',
    'Bu paket .EXE üretimini otomatik Windows build ortamına taşır.',
    '',
    `Oluşturulma: ${now}`,
  ].join('\n'));

  zip.file('.github/workflows/windows-exe.yml', [
    'name: Windows EXE Build',
    '',
    'on:',
    '  workflow_dispatch:',
    '  push:',
    '    tags:',
    "      - 'v*'",
    '',
    'jobs:',
    '  build-windows-exe:',
    '    runs-on: windows-latest',
    '    permissions:',
    '      contents: write',
    '    steps:',
    '      - uses: actions/checkout@v4',
    '      - uses: actions/setup-node@v4',
    '        with:',
    "          node-version: '22'",
    '      - run: npm install',
    '      - run: npm run build',
    '      - name: Prepare Electron package',
    '        shell: pwsh',
    '        run: |',
    '          New-Item -ItemType Directory -Force -Path release-app | Out-Null',
    '          Copy-Item dist\\index.html release-app\\index.html -Force',
    '          if (Test-Path dist\\sw.js) { Copy-Item dist\\sw.js release-app\\sw.js -Force }',
    '          if (Test-Path dist\\manifest.webmanifest) { Copy-Item dist\\manifest.webmanifest release-app\\manifest.webmanifest -Force }',
    '          if (Test-Path dist\\icons) { Copy-Item dist\\icons release-app\\icons -Recurse -Force }',
    '          Copy-Item desktop\\main.cjs release-app\\main.cjs -Force',
    '          Copy-Item desktop\\preload.cjs release-app\\preload.cjs -Force',
    '          Copy-Item public\\icons\\icon-512.png release-app\\icon.png -Force',
    "          @'{",
    "            \"name\": \"mosbarkodyazilim-desktop\",",
    "            \"version\": \"1.5.0\",",
    "            \"main\": \"main.cjs\",",
    "            \"private\": true,",
    "            \"scripts\": { \"dist\": \"electron-builder --win nsis --x64\" },",
    "            \"build\": {",
    "              \"appId\": \"com.mosbarkodyazilim.pos\",",
    "              \"productName\": \"MOSBARKODYAZILIM\",",
    "              \"files\": [\"index.html\", \"main.cjs\", \"preload.cjs\", \"manifest.webmanifest\", \"sw.js\", \"icons/**\", \"icon.png\"],",
    "              \"directories\": { \"output\": \"installer\" },",
    "              \"win\": { \"target\": \"nsis\", \"icon\": \"icon.png\" },",
    "              \"nsis\": { \"oneClick\": false, \"allowToChangeInstallationDirectory\": true, \"createDesktopShortcut\": true, \"createStartMenuShortcut\": true, \"shortcutName\": \"MOSBARKODYAZILIM\" }",
    "            },",
    "            \"dependencies\": { \"nodemailer\": \"^6.9.14\" },",
    "            \"devDependencies\": { \"electron\": \"^31.7.7\", \"electron-builder\": \"^24.13.3\" }",
    "          }'@ | Set-Content -Encoding UTF8 release-app\\package.json",
    '      - run: npm install',
    '        working-directory: release-app',
    '      - run: npm run dist',
    '        working-directory: release-app',
    '      - name: Normalize installer name',
    '        shell: pwsh',
    '        run: |',
    '          $exe = Get-ChildItem release-app\\installer -Filter "*.exe" | Select-Object -First 1',
    '          if (-not $exe) { throw "EXE installer not found" }',
    '          New-Item -ItemType Directory -Force -Path artifact | Out-Null',
    '          Copy-Item $exe.FullName artifact\\MOSBARKODYAZILIM-Setup.exe -Force',
    '      - uses: actions/upload-artifact@v4',
    '        with:',
    '          name: MOSBARKODYAZILIM-Setup',
    '          path: artifact/MOSBARKODYAZILIM-Setup.exe',
  ].join('\n'));

  zip.file('package.json', JSON.stringify({
    name: 'mosbarkodyazilim-desktop',
    version: '1.5.0',
    description: 'MOSBARKODYAZILIM - Yapay Zeka Destekli Barkod Satış Programı',
    main: 'main.cjs',
    private: true,
    scripts: {
      start: 'electron .',
      dist: 'electron-builder --win nsis --x64',
    },
    dependencies: {
      nodemailer: '^6.9.14',
    },
    build: {
      appId: 'com.mosbarkodyazilim.pos',
      productName: 'MOSBARKODYAZILIM',
      files: ['index.html', 'main.cjs', 'preload.cjs', 'manifest.webmanifest', 'sw.js', 'icons/**', 'data/**', 'node_modules/nodemailer/**'],
      directories: { output: 'dist' },
      win: { target: 'nsis', icon: 'icon.png' },
      nsis: {
        oneClick: false,
        allowToChangeInstallationDirectory: true,
        createDesktopShortcut: true,
        createStartMenuShortcut: true,
        shortcutName: 'MOSBARKODYAZILIM',
      },
    },
    devDependencies: {
      electron: '^31.0.0',
      'electron-builder': '^24.13.3',
    },
  }, null, 2));

  zip.file('main.cjs', [
    "const { app, BrowserWindow, ipcMain } = require('electron');",
    "const path = require('path');",
    "const fs = require('fs');",
    "const http = require('http');",
    "const os = require('os');",
    '',
    'function logCrash(err) {',
    '  try {',
    "    const dir = app.getPath('userData');",
    "    fs.mkdirSync(dir, { recursive: true });",
    '    fs.appendFileSync(path.join(dir, \'startup-error.log\'), `\\n[${new Date().toISOString()}]\\n${err?.stack || err}\\n`, \'utf8\');',
    '  } catch { /* yoksay */ }',
    '}',
    "process.on('uncaughtException', logCrash);",
    "process.on('unhandledRejection', logCrash);",
    '',
    "const INDEX = path.join(__dirname, 'index.html');",
    "const PRELOAD = path.join(__dirname, 'preload.cjs');",
    '',
    "const HTTP_PORT = Number(process.env.MOSBARKOD_PORT) || 8787;",
    'let httpServer = null;',
    '',
    'function lanIPs() {',
    '  const out = [];',
    '  const nets = os.networkInterfaces();',
    '  for (const list of Object.values(nets)) {',
    '    for (const iface of list || []) {',
    "      if (iface.family === 'IPv4' && !iface.internal) out.push(iface.address);",
    '    }',
    '  }',
    '  return out;',
    '}',
    '',
    'function startServer() {',
    '  if (httpServer) return;',
    '  const html = fs.readFileSync(INDEX);',
    '  httpServer = http.createServer((req, res) => {',
    "    if (req.url === '/host-info') {",
    "      res.setHeader('Content-Type', 'application/json');",
    '      res.end(JSON.stringify({ ips: lanIPs(), port: HTTP_PORT }));',
    '      return;',
    '    }',
    "    if (req.url === '/sw.js' || req.url === '/manifest.webmanifest' || (req.url && req.url.startsWith('/icons/'))) {",
    '      try {',
    "        const p = path.join(__dirname, req.url.split('?')[0]);",
    '        if (fs.existsSync(p)) { res.end(fs.readFileSync(p)); return; }',
    '      } catch { /* yoksay */ }',
    '      res.statusCode = 404; res.end(); return;',
    '    }',
    "    res.setHeader('Content-Type', 'text/html; charset=utf-8');",
    '    res.end(html);',
    '  });',
    "  httpServer.on('error', () => { /* port doluysa sessiz geç */ });",
    "  httpServer.listen(HTTP_PORT, '0.0.0.0');",
    '}',
    '',
    "ipcMain.handle('mos-email-send', async (_evt, payload) => {",
    '  try {',
    '    const { provider, serviceId, templateId, publicKey, privateKey, subject, message, fromName, toEmail } = payload || {};',
    "    if (provider === 'resend') {",
    "      if (!privateKey) return { ok: false, error: 'Resend privateKey gereklidir' };",
    "      const res = await global.fetch('https://api.resend.com/emails', {",
    "        method: 'POST',",
    '        headers: { Authorization: `Bearer ${privateKey}`, \'Content-Type\': \'application/json\' },',
    '        body: JSON.stringify({',
    "          from: fromName ? `${fromName} <onboarding@resend.dev>` : 'MOSBARKODYAZILIM <onboarding@resend.dev>',",
    '          to: [toEmail], subject, text: message,',
    '        }),',
    '      });',
    '      if (res.ok) return { ok: true };',
    "      const txt = await res.text().catch(() => '');",
    '      return { ok: false, error: `HTTP ${res.status}: ${txt.slice(0, 160) || res.statusText}` };',
    '    }',
    "    const headers = { 'Content-Type': 'application/json' };",
    "    if (privateKey) headers.Authorization = `Bearer ${privateKey}`;",
    '    const res = await global.fetch(\'https://api.emailjs.com/api/v1.0/email/send\', {',
    "      method: 'POST',",
    '      headers,',
    '      body: JSON.stringify({',
    '        service_id: serviceId, template_id: templateId, user_id: publicKey,',
    '        template_params: { subject, message, from_name: fromName ?? \'MOSBARKODYAZILIM\', to_email: toEmail },',
    '      }),',
    '    });',
    '    if (res.ok) return { ok: true };',
    "    const txt = await res.text().catch(() => '');",
    '    return { ok: false, error: `HTTP ${res.status}: ${txt.slice(0, 160) || res.statusText}` };',
    '  } catch (e) { return { ok: false, error: String(e) }; }',
    '});',
    '',
    "ipcMain.handle('mos-host-info', () => ({ ips: lanIPs(), port: HTTP_PORT }));",
    '',
    "function storeFile() { return path.join(app.getPath('userData'), 'mosbarkod-store.json'); }",
    'function readStore() { try { return JSON.parse(fs.readFileSync(storeFile(), \'utf8\')); } catch { return {}; } }',
    'function writeStore(obj) { try { fs.writeFileSync(storeFile(), JSON.stringify(obj), \'utf8\'); } catch { /* yoksay */ } }',
    "ipcMain.handle('mos-store', (_evt, { action, key, value } = {}) => {",
    '  const store = readStore();',
    "  if (action === 'get') return store[key] ?? null;",
    "  if (action === 'set') { store[key] = value; writeStore(store); return { ok: true }; }",
    "  if (action === 'del') { delete store[key]; writeStore(store); return { ok: true }; }",
    "  return { ok: false, error: 'unknown action' };",
    '});',
    '',
    'function createWindow() {',
    '  const win = new BrowserWindow({',
    '    width: 1366, height: 768, minWidth: 1024, minHeight: 650,',
    "    title: 'MOSBARKODYAZILIM - Yapay Zeka Destekli Barkod Satış Programı',",
    "    backgroundColor: '#0a0e13', autoHideMenuBar: true,",
    '    webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true, preload: PRELOAD },',
    '  });',
    '  win.on(\'close\', () => { app.quit(); });',
    '  win.loadFile(INDEX);',
    '}',
    "app.whenReady().then(() => { startServer(); createWindow(); });",
    "app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });",
    "app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });",
    "app.on('before-quit', () => { try { httpServer?.close(); } catch { /* yoksay */ } });",
  ].join('\n'));

  zip.file('preload.cjs', [
    "const { contextBridge, ipcRenderer } = require('electron');",
    '',
    "contextBridge.exposeInMainWorld('mosEmail', {",
    '  send: (payload) => ipcRenderer.invoke(\'mos-email-send\', payload),',
    '  hostInfo: () => ipcRenderer.invoke(\'mos-host-info\'),',
    '});',
    '',
    "contextBridge.exposeInMainWorld('mosStore', {",
    "  get: (key) => ipcRenderer.invoke('mos-store', { action: 'get', key }),",
    "  set: (key, value) => ipcRenderer.invoke('mos-store', { action: 'set', key, value }),",
    "  del: (key) => ipcRenderer.invoke('mos-store', { action: 'del', key }),",
    '});',
  ].join('\n'));

  zip.file('index.html', html);
  zip.file('data/mosbarkod-yedek.json', JSON.stringify(state, null, 2));
  zip.file('build-exe.bat', [
    '@echo off',
    'title MOSBARKODYAZILIM Windows EXE Derleyici',
    'echo MOSBARKODYAZILIM Windows kurulum dosyasi hazirlaniyor...',
    'echo.',
    'where node >nul 2>nul',
    'if errorlevel 1 (',
    '  echo Node.js bulunamadi. Lutfen https://nodejs.org adresinden Node.js LTS kurun.',
    '  pause',
    '  exit /b 1',
    ')',
    'npm install',
    'if errorlevel 1 (',
    '  echo npm install basarisiz oldu.',
    '  pause',
    '  exit /b 1',
    ')',
    'npm run dist',
    'echo.',
    'echo Bitti. Kurulum dosyasi dist klasorunde olusturuldu.',
    'pause',
  ].join('\r\n'));
  zip.file('calistir-dev.bat', ['@echo off', 'npm install', 'npm start', 'pause'].join('\r\n'));

  try {
    const icon = await fetch('/icons/icon-512.png').then((r) => r.arrayBuffer());
    zip.file('icon.png', icon);
  } catch {
    // İkon alınamazsa paket yine oluşturulur.
  }

  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
}

async function readyExeExists() {
  try {
    const res = await fetch('/downloads/MOSBARKODYAZILIM-Setup.exe', { method: 'HEAD', cache: 'no-store' });
    return res.ok;
  } catch {
    return false;
  }
}

async function makeLinuxMintPackage(state: AppState) {
  const zip = new JSZip();
  const html = '<!doctype html>\n' + document.documentElement.outerHTML;
  const today = new Date().toISOString().slice(0, 10);

  zip.file('README-LINUX-MINT.md', [
    '# MOSBARKODYAZILIM Linux Mint Kurulum Paketi',
    '',
    'Bu paket Linux Mint / Ubuntu üzerinde MOSBARKODYAZILIM programını masaüstü uygulaması gibi kullanmak için hazırlanmıştır.',
    '',
    '## Kurulum',
    '',
    '1. ZIP dosyasını çıkarın.',
    '2. install-linux-mint.sh dosyasına sağ tıklayın.',
    '3. Özellikler > İzinler bölümünden "Program olarak çalıştırmaya izin ver" seçeneğini açın.',
    '4. Dosyaya çift tıklayın ve "Terminalde Çalıştır" seçin.',
    '',
    'Alternatif olarak terminalde:',
    '',
    '```bash',
    'bash install-linux-mint.sh',
    '```',
    '',
    'Kurulumdan sonra:',
    '- Menüde MOSBARKODYAZILIM görünür.',
    '- Masaüstünde MOSBARKODYAZILIM kısayolu oluşur.',
    '- Program tarayıcı penceresi gibi değil, uygulama penceresi gibi açılır.',
    '',
    '## Mobil Telefon Bağlantısı',
    '',
    'Program yerel sunucuyu 8787 portunda açar.',
    'Aynı Wi-Fi ağındaki telefon şu adresten bağlanabilir:',
    '',
    '```text',
    'http://BILGISAYAR_IP_ADRESI:8787',
    '```',
    '',
    'IP adresini öğrenmek için terminalde:',
    '',
    '```bash',
    'hostname -I',
    '```',
    '',
    '## Kaldırma',
    '',
    'uninstall-linux-mint.sh dosyasını çalıştırın.',
    '',
    `Paket tarihi: ${today}`,
  ].join('\n'));

  zip.file('app/index.html', html);
  zip.file('app/data/mosbarkod-yedek.json', JSON.stringify(state, null, 2));

  try {
    const manifest = await fetch('/manifest.webmanifest').then((r) => r.text());
    zip.file('app/manifest.webmanifest', manifest);
  } catch {
    zip.file('app/manifest.webmanifest', '{}');
  }
  try {
    const sw = await fetch('/sw.js').then((r) => r.text());
    zip.file('app/sw.js', sw);
  } catch {
    zip.file('app/sw.js', '');
  }
  try {
    const icon = await fetch('/icons/icon-512.png').then((r) => r.arrayBuffer());
    zip.file('app/icons/icon-512.png', icon);
  } catch {
    // ikon alınamazsa paket yine indirilir
  }

  zip.file('mosbarkodyazilim', [
    '#!/usr/bin/env bash',
    'set -e',
    'APP_DIR="$HOME/.local/share/mosbarkodyazilim/app"',
    'LOG_DIR="$HOME/.local/share/mosbarkodyazilim"',
    'PORT="${MOSBARKOD_PORT:-8787}"',
    'BIND="${MOSBARKOD_BIND:-0.0.0.0}"',
    'mkdir -p "$LOG_DIR"',
    '',
    'if ! command -v python3 >/dev/null 2>&1; then',
    '  zenity --error --text="python3 bulunamadı. Linux Mint üzerinde python3 kurulu olmalıdır." 2>/dev/null || echo "python3 bulunamadı"',
    '  exit 1',
    'fi',
    '',
    '# Sunucu çalışmıyorsa başlat. Port açıksa mevcut sunucuyu kullan.',
    'if ! (timeout 1 bash -c "cat < /dev/null > /dev/tcp/127.0.0.1/$PORT") >/dev/null 2>&1; then',
    '  (cd "$APP_DIR" && nohup python3 -m http.server "$PORT" --bind "$BIND" > "$LOG_DIR/server.log" 2>&1 &)',
    '  sleep 1',
    'fi',
    '',
    'URL="http://127.0.0.1:$PORT/index.html"',
    'if command -v google-chrome >/dev/null 2>&1; then',
    '  exec google-chrome --app="$URL" --class=MOSBARKODYAZILIM',
    'elif command -v chromium-browser >/dev/null 2>&1; then',
    '  exec chromium-browser --app="$URL" --class=MOSBARKODYAZILIM',
    'elif command -v chromium >/dev/null 2>&1; then',
    '  exec chromium --app="$URL" --class=MOSBARKODYAZILIM',
    'elif command -v microsoft-edge >/dev/null 2>&1; then',
    '  exec microsoft-edge --app="$URL" --class=MOSBARKODYAZILIM',
    'else',
    '  exec xdg-open "$URL"',
    'fi',
  ].join('\n'));

  zip.file('mosbarkodyazilim.desktop', [
    '[Desktop Entry]',
    'Name=MOSBARKODYAZILIM',
    'Comment=Yapay Zeka Destekli Barkod Satış Programı',
    'Exec=__HOME__/.local/bin/mosbarkodyazilim',
    'Icon=__HOME__/.local/share/mosbarkodyazilim/app/icons/icon-512.png',
    'Terminal=false',
    'Type=Application',
    'Categories=Office;Utility;',
    'StartupWMClass=MOSBARKODYAZILIM',
  ].join('\n'));

  zip.file('install-linux-mint.sh', [
    '#!/usr/bin/env bash',
    'set -e',
    'ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"',
    'APP_DIR="$HOME/.local/share/mosbarkodyazilim"',
    'BIN_DIR="$HOME/.local/bin"',
    'DESKTOP_DIR="$HOME/.local/share/applications"',
    'mkdir -p "$APP_DIR" "$BIN_DIR" "$DESKTOP_DIR"',
    'rm -rf "$APP_DIR/app"',
    'cp -r "$ROOT_DIR/app" "$APP_DIR/app"',
    'cp "$ROOT_DIR/mosbarkodyazilim" "$BIN_DIR/mosbarkodyazilim"',
    'chmod +x "$BIN_DIR/mosbarkodyazilim"',
    'sed "s|__HOME__|$HOME|g" "$ROOT_DIR/mosbarkodyazilim.desktop" > "$DESKTOP_DIR/mosbarkodyazilim.desktop"',
    'chmod +x "$DESKTOP_DIR/mosbarkodyazilim.desktop"',
    'if [ -d "$HOME/Desktop" ]; then',
    '  cp "$DESKTOP_DIR/mosbarkodyazilim.desktop" "$HOME/Desktop/MOSBARKODYAZILIM.desktop"',
    '  chmod +x "$HOME/Desktop/MOSBARKODYAZILIM.desktop"',
    '  gio set "$HOME/Desktop/MOSBARKODYAZILIM.desktop" metadata::trusted true 2>/dev/null || true',
    'fi',
    'xdg-desktop-menu forceupdate 2>/dev/null || true',
    'echo "Kurulum tamamlandı."',
    'echo "Menüden veya masaüstünden MOSBARKODYAZILIM uygulamasını açabilirsiniz."',
    'echo "Telefon bağlantısı için Linux bilgisayar IP adresi: $(hostname -I | awk \'{print $1}\'):8787"',
    'read -p "Devam etmek için Enter..."',
  ].join('\n'));

  zip.file('uninstall-linux-mint.sh', [
    '#!/usr/bin/env bash',
    'rm -rf "$HOME/.local/share/mosbarkodyazilim"',
    'rm -f "$HOME/.local/bin/mosbarkodyazilim"',
    'rm -f "$HOME/.local/share/applications/mosbarkodyazilim.desktop"',
    'rm -f "$HOME/Desktop/MOSBARKODYAZILIM.desktop"',
    'xdg-desktop-menu forceupdate 2>/dev/null || true',
    'echo "MOSBARKODYAZILIM kaldırıldı."',
    'read -p "Devam etmek için Enter..."',
  ].join('\n'));

  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
}

export default function SettingsScreen({
  state,
  onPatch,
  onExport,
  onImportFile,
  onResetKasa,
  sync,
  joinCode,
  setJoinCode,
  onStartHostSync,
  onJoinHostSync,
  onStopSync,
  toast,
}: {
  state: AppState;
  onPatch: (p: Partial<Settings>) => void;
  onExport: () => void;
  onImportFile: (f: File) => void;
  onResetKasa: () => void;
  sync: {
    role: 'off' | 'host' | 'client';
    code: string;
    connected: boolean;
    clients?: number;
    clientRoles?: string[];
    deviceRole?: 'admin' | 'order';
    error?: string;
  };
  joinCode: string;
  setJoinCode: (v: string) => void;
  onStartHostSync: () => void;
  onJoinHostSync: (role?: 'admin' | 'order', codeOverride?: string) => void;
  onStopSync: () => void;
  toast: Toast;
}) {
  const s = state.settings;
  const { locale, setLocale, t } = useLocale();
  const fileRef = useRef<HTMLInputElement>(null);
  const visibleConnected = sync.connected;
  const [resetOpen, setResetOpen] = useState(false);
  const [resetPass, setResetPass] = useState('');
  const [resetErr, setResetErr] = useState(false);
  const [open, setOpen] = useState<TileId | null>(null);
  const [winBusy, setWinBusy] = useState(false);
  const [linuxBusy, setLinuxBusy] = useState(false);
  const [qrScanOpen, setQrScanOpen] = useState(false);
  const [updates, setUpdates] = useState<any[]>([]);
  const [shareBaseUrl, setShareBaseUrl] = useState(() => {
    const saved = localStorage.getItem('mosbarkod_share_base_url');
    if (saved) return saved;
    const origin = window.location.origin;
    const proto = window.location.protocol;
    // Electron (file: veya mosbarkod:) çalışıyorsa LAN servisine yönlendir.
    if (proto === 'file:' || proto.startsWith('mosbarkod')) return `http://${'127.0.0.1'}:8787`;
    return `${origin}${window.location.pathname}`;
  });
  const [company, setCompany] = useState({
    storeName: s.storeName,
    address: s.address,
    phone: s.phone,
    taxOffice: s.taxOffice,
    taxNo: s.taxNo,
    brandTitle: s.brandTitle,
    logoIcon: s.logoIcon,
  });

  // updates.json'dan update listesini yükle
  useEffect(() => {
    fetch('/downloads/updates.json')
      .then(res => res.json())
      .then(data => setUpdates(data.updates || []))
      .catch(() => setUpdates([]));
  }, []);

  // Electron çalışırken LAN servis IP'sini otomatik doldur (telefon 127.0.0.1'e gidemez)
  useEffect(() => {
    const me = window.mosEmail;
    if (!me?.hostInfo) return;
    void me.hostInfo().then((info) => {
      const ip = info?.ips?.[0];
      if (!ip) return;
      const current = localStorage.getItem('mosbarkod_share_base_url') ?? '';
      if (!current || /127\.0\.0\.1|localhost|file:/i.test(current)) {
        const next = `http://${ip}:${info.port ?? 8787}`;
        localStorage.setItem('mosbarkod_share_base_url', next);
        setShareBaseUrl(next);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const downloadWindowsPackage = async () => {
    setWinBusy(true);
    try {
      const blob = await makeWindowsPackage(state);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `MOSBARKODYAZILIM-Windows-EXE-Paketi-${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast('Windows kurulum paketi indirildi. ZIP içindeki build-exe.bat ile .EXE oluşturabilirsiniz.');
    } catch {
      toast('Windows kurulum paketi oluşturulamadı', 'err');
    }
    setWinBusy(false);
  };

  const qrBase = shareBaseUrl.replace(/[?#].*$/, '').replace(/\/$/, '');
  const adminQr = `${qrBase}?sync=1588&device=admin`;
  const orderQr = `${qrBase}?sync=1111&device=order`;
  const localWarning = /localhost|127\.0\.0\.1/i.test(shareBaseUrl);

  const handleQrText = (text: string) => {
    try {
      const url = new URL(text);
      const code = url.searchParams.get('sync') ?? '';
      const device = url.searchParams.get('device') === 'admin' ? 'admin' : 'order';
      if (code) {
        setJoinCode(code.toUpperCase());
        onJoinHostSync(device, code.toUpperCase());
        return true;
      }
    } catch {
      // Düz kod olabilir.
    }
    const code = text.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length >= 4) {
      setJoinCode(code);
      onJoinHostSync('order', code);
      return true;
    }
    toast('QR içinde geçerli bağlantı kodu bulunamadı', 'err');
    return false;
  };

  const downloadReadyExe = async () => {
    const ok = await readyExeExists();
    if (!ok) {
      toast('Hazır .EXE dosyası henüz sunucuya eklenmemiş. Önce GitHub Actions ile MOSBARKODYAZILIM-Setup.exe üretip public/downloads klasörüne koyun.', 'err');
      return;
    }
    const a = document.createElement('a');
    a.href = '/downloads/MOSBARKODYAZILIM-Setup.exe';
    a.download = 'MOSBARKODYAZILIM-Setup.exe';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const downloadLinuxMintPackage = async () => {
    setLinuxBusy(true);
    try {
      const blob = await makeLinuxMintPackage(state);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `MOSBARKODYAZILIM-Linux-Mint-Kurulum-${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast('Linux Mint kurulum paketi indirildi. ZIP içindeki install-linux-mint.sh ile kurulum yapabilirsiniz.');
    } catch {
      toast('Linux Mint kurulum paketi oluşturulamadı', 'err');
    }
    setLinuxBusy(false);
  };

  const syncBadge = visibleConnected ? (
    <Badge tone="ok">BAĞLI</Badge>
  ) : sync.role === 'host' ? (
    <Badge tone="warn">QR AKTİF</Badge>
  ) : (
    <Badge tone="mut">KAPALI</Badge>
  );

  const activeCurrency = s.currency?.active || 'TRY';

  const TILES: { id: TileId; icon: string; color: string; title: string; desc: string; badge?: React.ReactNode }[] = [
    { id: 'language', icon: 'globe', color: 'text-mint', title: t('settings.language'), desc: `${t('settings.languageDesc')} (${LOCALES.length})` },
    { id: 'currency', icon: 'banknote', color: 'text-amber2', title: 'Para Birimi & Döviz (Multi-Currency)', desc: 'USD ($), EUR (€), GBP (£), TRY (₺), BRL (R$), SAR (﷼) vb. aktif para birimi ve sembol ayarları.', badge: <Badge tone="warn">{activeCurrency}</Badge> },
    { id: 'cfd', icon: 'monitor', color: 'text-blue', title: '2. Müşteri Ekranı (CFD)', desc: 'Müşteriye dönük 2. monitör / tablet canlı sepet, anlık toplam, QR ödeme ve kampanya kayan yazı ayarları.', badge: <Badge tone={s.cfd?.enabled ? 'ok' : 'mut'}>{s.cfd?.enabled ? 'AKTİF' : 'KAPALI'}</Badge> },
    { id: 'mobile', icon: 'sparkles', color: 'text-blue', title: 'Mobil Bağlantı', desc: 'Masaüstü ve telefonlar WebRTC ile eşzamanlı çalışsın; QR veya kod ile bağlanın.', badge: syncBadge },
    { id: 'company', icon: 'file', color: 'text-amber', title: 'Şirket Bilgileri', desc: 'Bayi adı, adres, telefon, vergi dairesi, tabela yazısı ve logo simgesi.' },
    { id: 'appearance', icon: 'star', color: 'text-amber', title: 'Görünüm, Tema & Ses', desc: 'Ürün kartı görsel ayarları, 36 hazır tema ve barkod okuma sesi.' },
    { id: 'whatsapp', icon: 'phone', color: 'text-mint', title: 'WhatsApp & Gün Sonu Raporu', desc: 'Borç hatırlatma şablonu, otomatik WhatsApp rapor saatleri ve içerik.' },
    { id: 'email', icon: 'globe', color: 'text-mint', title: 'E-posta Entegrasyonu', desc: 'EmailJS / Resend / SMTP ile gün sonu raporunu e-postayla gönderin.' },
    { id: 'hardware', icon: 'barcode', color: 'text-mint', title: 'Donanım Entegrasyonu', desc: 'Barkod okuyucu, terminal fiş yazıcı ve elektronik terazi uyumluluğu.' },
    { id: 'backup', icon: 'download', color: 'text-blue', title: 'Yedekleme & Sistem Sağlık', desc: 'Otomatik tam yedekleme, manuel yedek/yükleme ve sistem taraması.' },
    { id: 'update', icon: 'reset', color: 'text-blue', title: 'Program Güncelleme', desc: 'Yeni sürüm paketlerini (.mosbupdate / .zip / .json) yükleyip doğrulayın.' },
    { id: 'downloads', icon: 'monitor', color: 'text-amber2', title: 'Kurulum & Sürüm Dosyaları', desc: 'Windows EXE build paketi, Linux Mint kurulumu ve hazır EXE indirme.' },
    { id: 'mobileSetup', icon: 'camera', color: 'text-mint', title: 'Mobil Kurulum (APK & iOS)', desc: 'Uygulamayı telefon ve tabletlere PWA olarak kurma adımları.' },
    { id: 'reset', icon: 'alert', color: 'text-red', title: 'Kasa & Ciro Sıfırlama', desc: 'İlk kurulum için tüm işletme hareketlerini sıfırlayın (tehlikeli işlem).' },
    { id: 'profile', icon: 'user', color: 'text-amber2', title: 'Profil Özeti', desc: 'Mevcut mağaza, tema, ses, rapor ve kart görsel ayarlarının özeti.' },
  ];

  return (
    <div className="h-full overflow-y-auto">
      <ScreenHead title="Sistem & Şirket Ayarları" icon="gear" desc="Her bölüm bir kutu olarak toplandı — kutuya tıklayın, ilgili ayar ve entegrasyon geniş pencerede açılsın." />

      <div className="grid gap-3 xl:grid-cols-[1fr_340px]">
        {/* SOL — büyük dikdörtgen kutular */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-3">
          {TILES.map((t) => (
            <SettingsTile
              key={t.id}
              icon={t.icon}
              title={t.title}
              desc={t.desc}
              color={t.color}
              badge={t.badge}
              onOpen={() => setOpen(t.id)}
            />
          ))}
        </div>

        {/* SAĞ — MOSBARKOD logolu tabela (yerinde kalır) */}
        <div className="space-y-3">
          <LicenseCard />
        </div>
      </div>

      {/* ---------- KUTU PENCERELERİ ---------- */}

      {open === 'language' && (
        <SettingsModal title="Dil Seçimi / Select Language" icon="globe" color="text-mint" onClose={() => setOpen(null)}>
          <Panel icon="globe" title="Uygulama Dili" color="text-mint" desc="Seçtiğiniz dil tüm menü, buton ve bildirim metinlerinde uygulanır ve kalıcı kaydedilir.">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {LOCALES.map((l) => (
                <button
                  key={l.id}
                  onClick={() => setLocale(l.id)}
                  className={cn(
                    'flex items-center gap-3 rounded-xl border p-4 text-left transition-all hover:-translate-y-0.5',
                    locale === l.id ? 'border-mint bg-mint/15 shadow-[0_0_0_1px]' : 'border-line2 bg-panel2/50 hover:border-line'
                  )}
                  style={locale === l.id ? { boxShadow: `0 0 0 1px rgba(47,214,165,0.4)` } : undefined}
                >
                  <span className="text-3xl">{l.flag}</span>
                  <div className="flex-1">
                    <div className={cn('font-mono text-[13px] font-bold', locale === l.id ? 'text-mint' : 'text-txt')}>{l.label}</div>
                    <div className="text-[10px] text-mut2">{l.native}</div>
                  </div>
                  {locale === l.id && <Ic n="check" c="h-4 w-4 text-mint" />}
                </button>
              ))}
            </div>
            <div className="mt-3 rounded-lg border border-line bg-ink/40 p-3 text-[10.5px] leading-relaxed text-mut2">
              <b className="text-mut">İpucu:</b> Arapça seçildiğinde arayüz sağdan (RTL) düzenlenir; diğerleri soldan (LTR) kalır.
              Dil seçimi tarayıcıdaki kalıcı ayar olarak kaydedilir ve uygulama her açıldığında bu dilde gelir.
            </div>
          </Panel>
        </SettingsModal>
      )}

      {open === 'currency' && (
        <SettingsModal title="Para Birimi & Döviz Yönetimi (Multi-Currency Engine)" icon="banknote" color="text-amber2" onClose={() => setOpen(null)}>
          <Panel icon="banknote" title="Aktif Para Birimi Seçimi" color="text-amber2" desc="Satış, sepet, fiş, alış faturaları ve kâr-zarar raporlarında geçerli para birimini belirleyin.">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {DEFAULT_CURRENCIES.map((cur: CurrencyConfig) => {
                const isActive = (s.currency?.active || 'TRY') === cur.code;
                return (
                  <button
                    key={cur.code}
                    onClick={() => {
                      onPatch({ currency: { active: cur.code, currencies: DEFAULT_CURRENCIES } });
                      setActiveCurrencyCode(cur.code);
                      toast(`Aktif para birimi güncellendi: ${cur.name}`);
                    }}
                    className={cn(
                      'flex items-center gap-3 rounded-xl border p-3.5 text-left transition-all hover:-translate-y-0.5',
                      isActive ? 'border-amber bg-amber/15 shadow-[0_0_16px_rgba(245,158,11,0.25)]' : 'border-line2 bg-panel2/50 hover:border-line'
                    )}
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-mono text-xl font-black bg-ink/70 border border-line2 text-amber2">
                      {cur.symbol}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-mono text-xs font-bold text-txt truncate">{cur.name}</div>
                      <div className="text-[10px] text-mut2 font-mono">
                        Konum: {cur.position === 'left' ? 'Sol ($10)' : 'Sağ (10 ₺)'}
                      </div>
                    </div>
                    {isActive && <Ic n="check" c="h-4 w-4 text-amber2 shrink-0" />}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 rounded-xl border border-line bg-ink/40 p-3.5 space-y-2 text-xs text-mut2 leading-relaxed">
              <div className="font-bold text-txt">💡 Global Para Birimi Özelliği:</div>
              <p>
                Para birimi değiştiğinde tüm satış ekranı, müşteri ekranı (CFD), raf etiketleri, fatura hesaplamaları ve Z raporları anında yeni para birimi sembolüyle biçimlendirilir.
              </p>
            </div>
          </Panel>
        </SettingsModal>
      )}

      {open === 'cfd' && (
        <SettingsModal title="2. Müşteri Bilgi Ekranı Ayarları (Customer Facing Display)" icon="monitor" color="text-blue" onClose={() => setOpen(null)}>
          <Panel icon="monitor" title="Müşteri Ekranı (CFD) Yapılandırması" color="text-blue" desc="POS bilgisayarına bağlı 2. bir monitörde veya tablette müşteriye dönük çalışan canlı ekran.">
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-xl border border-line bg-ink/40 p-3.5">
                <div>
                  <div className="font-bold text-xs text-txt">2. Müşteri Ekranı Özelliği</div>
                  <div className="text-[10px] text-mut2">Kasiyer sepete ürün ekledikçe canlı olarak müşteriye yansır.</div>
                </div>
                <Toggle
                  on={s.cfd?.enabled ?? true}
                  onChange={(b) => onPatch({ cfd: { ...s.cfd, enabled: b } })}
                />
              </div>

              <Field label="Kayan Kampanya & Duyuru Metni (Alt Kısım)">
                <Inp
                  value={s.cfd?.promoText ?? ''}
                  onChange={(e) => onPatch({ cfd: { ...s.cfd, promoText: e.target.value } })}
                  placeholder="MOSBARKODYAZILIM POS — Hoş Geldiniz! Kaliteli Hizmet, Güvenli Alışveriş."
                />
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Ödeme Kare Kodu (QR) Göster">
                  <Sel
                    value={s.cfd?.showQr ? 'true' : 'false'}
                    onChange={(e) => onPatch({ cfd: { ...s.cfd, showQr: e.target.value === 'true' } })}
                  >
                    <option value="true">Evet, Ekranda QR Göster</option>
                    <option value="false">Hayır, Gizle</option>
                  </Sel>
                </Field>

                <Field label="Kare Kod (QR) Ödeme / WhatsApp Bağlantısı">
                  <Inp
                    value={s.cfd?.qrData ?? ''}
                    onChange={(e) => onPatch({ cfd: { ...s.cfd, qrData: e.target.value } })}
                    placeholder="https://wa.me/905554066143"
                  />
                </Field>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <Btn
                  v="primary"
                  onClick={() => {
                    const popup = window.open('', 'mosbarkod_cfd_window', 'width=1100,height=720,menubar=no,toolbar=no,location=no');
                    if (popup) {
                      popup.document.title = 'MOSBARKODYAZILIM — Müşteri Bilgi Ekranı';
                      popup.document.body.style.margin = '0';
                      popup.document.body.style.background = '#070a0e';
                    }
                    toast('Müşteri ekranı yeni pencerede açıldı (2. monitöre sürükleyebilirsiniz)');
                  }}
                  className="gap-2"
                >
                  <Ic n="monitor" c="h-4 w-4" /> 2. Monitörde Aç (Ayrı Pencere)
                </Btn>
              </div>

              {/* CFD Mini Preview */}
              <div className="mt-2 rounded-2xl border border-line bg-[#070a0e] p-2 overflow-hidden max-h-56">
                <div className="text-[10px] font-mono font-bold text-mut2 px-2 py-1 uppercase tracking-wider">Mini Önizleme:</div>
                <div className="h-44 pointer-events-none scale-75 origin-top-left w-[133%]">
                  <CustomerDisplay embedded={true} />
                </div>
              </div>
            </div>
          </Panel>
        </SettingsModal>
      )}

      {open === 'mobile' && (
        <SettingsModal title="Mobil Bağlantı (Eşzamanlı Çalışma)" icon="sparkles" color="text-blue" onClose={() => setOpen(null)}>
          <Panel icon="sparkles" title="WebRTC Eşzamanlı Çalışma" color="text-blue" desc="Masaüstü koder, telefon bağlanır; her iki cihazda da tüm işlemler anında senkronize olur.">
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-ink/40 px-3 py-2.5">
              <span className={cn('h-2.5 w-2.5 rounded-full', visibleConnected ? 'blink-dot bg-mint' : sync.role === 'off' ? 'bg-mut2' : 'bg-amber')} />
              <span className="font-mono text-[12px] font-semibold">
                {visibleConnected
                  ? `BAĞLI · Kod ${sync.code} · ${sync.role === 'host' ? 'Bu cihaz kurucu' : 'Bağlı cihaz'}`
                  : sync.role === 'off'
                    ? 'Bağlantı kapalı'
                    : sync.role === 'host'
                    ? `Sabit QR bağlantısı hazır · cihaz bekleniyor`
                      : `Bağlanıyor · ${sync.code}`}
              </span>
              {sync.error && <span className="text-[11px] text-red">{sync.error}</span>}
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-line bg-panel2/50 p-3">
                <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-mut">1) Masaüstü — Bağlantı Kur</div>
                <p className="mb-2 text-[10.5px] leading-relaxed text-mut2">
                  Admin ve kasiyer telefonları için sabit QR kodları kullanılır. Kodlar ekranda yazmaz; bağlantı koparsa aynı QR ile tekrar bağlanılır.
                </p>
                {sync.role === 'host' ? (
                  <div className="flex items-center gap-2">
                    <span className="rounded-lg border border-amber/50 bg-amber/15 px-4 py-2 font-mono text-sm font-bold tracking-[0.16em] text-amber2">QR AKTİF</span>
                    <Btn v="danger" className="px-2.5 py-2" onClick={onStopSync}><Ic n="x" c="h-4 w-4" /> Kapat</Btn>
                  </div>
                ) : (
                  <Btn v="primary" className="w-full" onClick={onStartHostSync}>
                    <Ic n="sparkles" c="h-4 w-4" /> {sync.role === 'client' ? 'Yeni Kod Üret' : 'Bağlantı Kur (Kod Üret)'}
                  </Btn>
                )}
              </div>
              {sync.role !== 'host' && (
                <div className="rounded-lg border border-line bg-panel2/50 p-3">
                  <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-mut">2) Telefon — Kod ile Bağlan</div>
                  <p className="mb-2 text-[10.5px] leading-relaxed text-mut2">
                    Telefon tarafında QR okutabilir veya yetkili kodunu elle girebilirsiniz.
                  </p>
                  <div className="flex gap-2">
                    <Inp
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      placeholder="KOD"
                      maxLength={12}
                      className="text-center font-mono text-lg font-bold tracking-[0.3em]"
                    />
                    <Btn v="ghost" className="shrink-0 border-blue/50 text-blue" onClick={() => setQrScanOpen(true)}>
                      <Ic n="camera" c="h-4 w-4" /> QR
                    </Btn>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <Btn v="primary" onClick={() => onJoinHostSync('admin')}>
                      <Ic n="user" c="h-4 w-4" /> Admin Bağlan
                    </Btn>
                    <Btn v="ghost" className="border-mint/50 text-mint" onClick={() => onJoinHostSync('order')}>
                      <Ic n="bag" c="h-4 w-4" /> Kasiyer Bağlan
                    </Btn>
                  </div>
                </div>
              )}
            </div>
            {visibleConnected && (
              <div className="mt-3 flex items-center justify-between rounded-lg border border-mint/25 bg-mint/5 px-3 py-2">
                <span className="text-[11px] text-mut">
                  Satışlar, stoklar, faturalar ve tüm modüller her iki cihazda anında güncellenir.
                </span>
                <Btn v="danger" className="shrink-0 px-2.5 py-1.5 text-[11px]" onClick={onStopSync}><Ic n="x" c="h-3.5 w-3.5" /> Bağlantıyı Kes</Btn>
              </div>
            )}

            {sync.role === 'host' && sync.code && (
              <div className="mt-3 rounded-xl border border-amber/25 bg-amber/5 p-3">
                <div className="mb-2 flex items-center gap-2">
                  <Ic n="barcode" c="h-4 w-4 text-amber2" />
                  <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-amber2">
                    Kare Kod ile Telefon Bağlantısı
                  </span>
                  <span className="ml-auto rounded-md border border-line2 bg-ink/60 px-2 py-0.5 font-mono text-[10px] text-mut">
                    {sync.clientRoles?.length ?? 0} / 2 bağlı
                  </span>
                </div>
                <Field label="Telefonun açacağı uygulama adresi (SABIT)">
                  <Inp
                    value={shareBaseUrl}
                    onChange={(e) => {
                      setShareBaseUrl(e.target.value);
                      localStorage.setItem('mosbarkod_share_base_url', e.target.value);
                    }}
                    className="font-mono text-[11.5px]"
                    placeholder="Örn: https://site.com veya http://192.168.1.34:5173"
                  />
                </Field>
                <p className="mt-1.5 text-[10px] text-mut2">
                  ️ Bu adres kalıcı olarak kaydedilir. QR kodlar bu adrese göre oluşturulur ve değişmez.
                </p>
                {localWarning && (
                  <p className="mt-1.5 rounded-md border border-red/30 bg-red/10 px-2 py-1.5 text-[10.5px] text-red">
                    Bu adres telefonda çalışmayabilir. localhost yerine bilgisayarın yerel IP adresini (örn. http://192.168.1.34:5173) yazın.
                  </p>
                )}
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-line bg-panel p-3 text-center">
                    <div className="mb-2 font-mono text-[11px] font-bold uppercase tracking-widest text-blue">Admin Telefon</div>
                    <div className="mx-auto inline-flex rounded-xl bg-white p-3">
                      <QRCodeSVG value={adminQr} size={148} marginSize={1} />
                    </div>
                    <p className="mt-2 text-[10.5px] leading-relaxed text-mut2">Tüm menü ve yönetici yetkileriyle açılır. Kod ekranda gösterilmez.</p>
                  </div>
                  <div className="rounded-xl border border-line bg-panel p-3 text-center">
                    <div className="mb-2 font-mono text-[11px] font-bold uppercase tracking-widest text-mint">Sipariş Telefonu</div>
                    <div className="mx-auto inline-flex rounded-xl bg-white p-3">
                      <QRCodeSVG value={orderQr} size={148} marginSize={1} />
                    </div>
                    <p className="mt-2 text-[10.5px] leading-relaxed text-mut2">Kasiyer/sipariş modunda açılır. Kod ekranda gösterilmez.</p>
                  </div>
                </div>
                {sync.clientRoles && sync.clientRoles.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {sync.clientRoles.map((r, i) => (
                      <span key={i} className="rounded-md border border-mint/30 bg-mint/10 px-2 py-1 font-mono text-[10px] font-bold text-mint">
                        {r}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Panel>
        </SettingsModal>
      )}

      {open === 'company' && (
        <SettingsModal title="Bayi / Şirket Bilgileri" icon="file" color="text-amber" wide={false} onClose={() => setOpen(null)}>
          <Panel icon="file" title="Şirket Bilgileri">
            <div className="space-y-3">
              <Field label="Bayi / Mağaza Adı"><Inp value={company.storeName} onChange={(e) => setCompany({ ...company, storeName: e.target.value })} /></Field>
              <Field label="Bayi Adresi"><Inp value={company.address} onChange={(e) => setCompany({ ...company, address: e.target.value })} /></Field>
              <div className="grid gap-3 md:grid-cols-3">
                <Field label="Telefon"><Inp value={company.phone} onChange={(e) => setCompany({ ...company, phone: e.target.value })} className="font-mono" /></Field>
                <Field label="Vergi Dairesi"><Inp value={company.taxOffice} onChange={(e) => setCompany({ ...company, taxOffice: e.target.value })} /></Field>
                <Field label="Vergi No"><Inp value={company.taxNo} onChange={(e) => setCompany({ ...company, taxNo: e.target.value })} className="font-mono" /></Field>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Tabela Yazısı"><Inp value={company.brandTitle} onChange={(e) => setCompany({ ...company, brandTitle: e.target.value })} /></Field>
                <Field label="Logo Simgesi">
                  <Sel value={company.logoIcon} onChange={(e) => setCompany({ ...company, logoIcon: e.target.value })}>
                    <option value="flame">Alev</option>
                    <option value="barcode">Barkod</option>
                    <option value="box">Kutu</option>
                    <option value="star">Yıldız</option>
                    <option value="banknote">Banknot</option>
                  </Sel>
                </Field>
              </div>
              <Btn v="primary" onClick={() => { onPatch(company); toast('Şirket bilgileri kaydedildi'); }}>
                <Ic n="check" c="h-4 w-4" /> Kaydet
              </Btn>
            </div>
          </Panel>
        </SettingsModal>
      )}

      {open === 'appearance' && (
        <SettingsModal title="Görünüm, Tema & Ses" icon="star" color="text-amber" onClose={() => setOpen(null)}>
          <AppearanceCard ui={s.ui} onPatch={onPatch} />
          <ThemesCard current={s.theme} onApply={(id) => { onPatch({ theme: id }); applyTheme(id); }} toast={toast} />
          <SoundCard cfg={s.sound} onPatch={onPatch} />
        </SettingsModal>
      )}

      {open === 'whatsapp' && (
        <SettingsModal title="WhatsApp & Gün Sonu Raporu" icon="phone" color="text-mint" onClose={() => setOpen(null)}>
          <WhatsAppCard settings={s} onPatch={onPatch} toast={toast} />
          <ReportCard settings={s} onPatch={onPatch} state={state} toast={toast} />
        </SettingsModal>
      )}

      {open === 'email' && (
        <SettingsModal title="E-posta Entegrasyonu" icon="globe" color="text-mint" onClose={() => setOpen(null)}>
          <EmailCard settings={s} onPatch={onPatch} state={state} toast={toast} />
        </SettingsModal>
      )}

      {open === 'hardware' && (
        <SettingsModal title="Donanım Entegrasyonu" icon="barcode" color="text-mint" onClose={() => setOpen(null)}>
          <HardwareCard toast={toast} />
        </SettingsModal>
      )}

      {open === 'backup' && (
        <SettingsModal title="Yedekleme & Sistem Sağlık" icon="download" color="text-blue" onClose={() => setOpen(null)}>
          <AutoBackupCard cfg={s.autobackup} onPatch={onPatch} onFullBackup={onExport} toast={toast} />
          <Panel icon="download" title="Manuel Yedekleme & Geri Yükleme" color="text-blue">
            <p className="mb-3 text-[10.5px] leading-relaxed text-mut2">Tüm ürünler, stoklar, veresiye hesapları ve ayarlar JSON olarak indirilebilir ya da geri yüklenebilir.</p>
            <div className="grid grid-cols-2 gap-2">
              <Btn v="ghost" className="border-blue/50 bg-blue/10 text-blue hover:bg-blue/20" onClick={onExport}><Ic n="download" c="h-4 w-4" /> Yedek İndir</Btn>
              <Btn v="ghost" onClick={() => fileRef.current?.click()}><Ic n="file" c="h-4 w-4" /> Yedek Yükle</Btn>
            </div>
            <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onImportFile(f); e.target.value = ''; }} />
          </Panel>
          <HealthCheckCard state={state} toast={toast} />
        </SettingsModal>
      )}

      {open === 'update' && (
        <SettingsModal title="Program Güncelleme" icon="reset" color="text-blue" onClose={() => setOpen(null)}>
          <UpdateCard state={state} onPatch={onPatch} toast={toast} />
        </SettingsModal>
      )}

      {open === 'downloads' && (
        <SettingsModal title="Kurulum & Sürüm Dosyaları" icon="monitor" color="text-amber2" onClose={() => setOpen(null)}>
          <Panel icon="download" title="Windows Kurulum Dosyaları" color="text-amber2">
            <p className="mb-3 text-[10.5px] leading-relaxed text-mut2">
              Hazır <span className="font-mono text-amber2">.EXE</span> dosyası sunucuya eklendiyse doğrudan indirin.
              Eğer henüz EXE yoksa, otomatik Windows build paketini indirip GitHub Actions üzerinde kurulum dosyasını
              üretebilirsiniz.
            </p>
            <div className="rounded-lg border border-line bg-ink/40 p-3 font-mono text-[10px] leading-relaxed text-mut2">
              Hazır EXE yolu: public/downloads/MOSBARKODYAZILIM-Setup.exe
            </div>
            <Btn v="mint" className="mt-3 w-full" onClick={downloadReadyExe}>
              <Ic n="download" c="h-4 w-4" /> Hazır EXE Dosyasını İndir
            </Btn>
            <Btn v="primary" className="mt-2 w-full" onClick={downloadWindowsPackage} disabled={winBusy}>
              {winBusy ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> Paket hazırlanıyor...
                </>
              ) : (
                <>
                  <Ic n="download" c="h-4 w-4" /> EXE Otomatik Build Paketini İndir
                </>
              )}
            </Btn>
          </Panel>

          <Panel icon="download" title="Program Update Dosyaları" color="text-blue">
            <p className="mb-3 text-[10.5px] leading-relaxed text-mut2">
              Program güncellemeleri için Windows ve Linux Mint platformlarına özel update dosyalarını buradan indirebilirsiniz.
              Update dosyasını Program Güncelleme bölümünden yükleyebilirsiniz.
            </p>

            <div className="mb-3 space-y-2">
              {updates.length > 0 ? (
                updates.map((update, index) => (
                  <div key={index} className="rounded-lg border border-line bg-ink/40 p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-mono text-[12px] font-bold text-blue">
                          {update.version} ({update.platform})
                        </div>
                        <div className="text-[9px] text-mut2">
                          {update.date} • {update.size}
                        </div>
                        {update.notes && update.notes.length > 0 && (
                          <div className="mt-1 text-[10px] text-mut2">
                            {update.notes[0]}
                          </div>
                        )}
                      </div>
                      <Btn
                        v={update.platform === 'windows' ? 'primary' : 'mint'}
                        className="px-3 py-1.5 text-[11px]"
                        onClick={() => {
                          if (update.url) {
                            window.open(update.url, '_blank');
                            toast(`${update.platform} update dosyası indiriliyor...`);
                          } else {
                            toast('Update dosyası henüz mevcut değil', 'err');
                          }
                        }}
                      >
                        <Ic n="download" c="h-3.5 w-3.5" /> İndir
                      </Btn>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-line bg-ink/40 p-3 text-center text-[11px] text-mut2">
                  Update listesi yükleniyor...
                </div>
              )}
            </div>

            <p className="mt-3 text-[10px] text-mut2">
              💡 İpucu: Update dosyalarını GitHub Releases veya kendi sunucunuzdan indirebilirsiniz.
              Dosya formatı: .mosbupdate, .zip veya .json
            </p>
          </Panel>

          <Panel icon="download" title="Linux Mint Kurulum Dosyaları" color="text-mint">
            <p className="mb-3 text-[10.5px] leading-relaxed text-mut2">
              Linux Mint / Ubuntu üzerinde programı masaüstüne sabitlemek için hazır kurulum paketi indirin. Paket,
              uygulamayı yerel sunucu üzerinden çalıştırır ve masaüstü kısayolu oluşturur.
            </p>
            <div className="rounded-lg border border-line bg-ink/40 p-3 font-mono text-[10px] leading-relaxed text-mut2">
              Kurulum: ZIP'i çıkar → install-linux-mint.sh çalıştır → Menü ve masaüstünde MOSBARKODYAZILIM görünür.
            </div>
            <Btn v="mint" className="mt-3 w-full" onClick={downloadLinuxMintPackage} disabled={linuxBusy}>
              {linuxBusy ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> Paket hazırlanıyor...
                </>
              ) : (
                <>
                  <Ic n="download" c="h-4 w-4" /> Linux Mint Kurulum Paketini İndir
                </>
              )}
            </Btn>
          </Panel>
        </SettingsModal>
      )}

      {open === 'mobileSetup' && (
        <SettingsModal title="Mobil Kurulum (APK & iOS)" icon="camera" color="text-mint" wide={false} onClose={() => setOpen(null)}>
          <Panel icon="monitor" title="PWA Kurulum Adımları" color="text-mint" desc="Uygulama Progressive Web App (PWA) olarak Android ve iOS cihazlara kurulabilir.">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-line bg-panel2/50 p-3">
                <div className="mb-1.5 flex items-center gap-2 text-[12.5px] font-bold text-mint"><Ic n="check" c="h-4 w-4" /> Android (Telefon / Tablet)</div>
                <ol className="list-decimal space-y-1 pl-4 text-[11px] leading-relaxed text-mut">
                  <li>Chrome tarayıcısında bu uygulamayı açın.</li>
                  <li>Üst menüden <b className="text-mut">"Ana ekrana ekle"</b> seçin.</li>
                  <li>İkon masaüstüne gelir; uygulamadan bağımsız, tam ekran açılır.</li>
                  <li><b className="text-mut">APK üretmek için:</b> pwabuilder.com adresine bu sayfanın URL'sini yapıştırıp "Download Package" ile resmi APK alabilirsiniz (ücretsiz). Alternatif: Bubblewrap (TWA).</li>
                </ol>
              </div>
              <div className="rounded-lg border border-line bg-panel2/50 p-3">
                <div className="mb-1.5 flex items-center gap-2 text-[12.5px] font-bold text-mint"><Ic n="check" c="h-4 w-4" /> iOS (iPhone / iPad)</div>
                <ol className="list-decimal space-y-1 pl-4 text-[11px] leading-relaxed text-mut">
                  <li>Safari ile bu uygulamayı açın.</li>
                  <li>Alt kısımdaki <b className="text-mut">Paylaş</b> (kutu + ok) düğmesine basın.</li>
                  <li><b className="text-mut">"Ana Ekrana Ekle"</b> seçin; ikon uygulamalar arasında görünür.</li>
                  <li>Tam donanımlı native app için Xcode + TestFlight dağıtımı gerekir; PWA çözümündeki tüm işlevler birebir çalışır.</li>
                </ol>
              </div>
            </div>
          </Panel>
        </SettingsModal>
      )}

      {open === 'reset' && (
        <SettingsModal title="Kasa & Ciro Sıfırlama" icon="alert" color="text-red" wide={false} onClose={() => { setOpen(null); setResetPass(''); setResetErr(false); }}>
          <Panel icon="reset" title="Tüm İşletme Değerlerini Sıfırla" color="text-red">
            <p className="mb-3 text-[10.5px] leading-relaxed text-mut2">
              İlk kurulum için satış/ciro, paket sipariş, veresiye, masraf, alış faturası, POS ve kasa hareketleri,
              Ulaşım Kartı, stok miktarları ve personel ödeme geçmişleri sıfırlanır. Ürün/personel kartları ve şirket
              ayarları korunur.
            </p>
            <Btn v="danger" className="w-full" onClick={() => { setResetOpen(true); setResetPass(''); setResetErr(false); }}><Ic n="alert" c="h-4 w-4" /> Tüm İşletme Değerlerini Sıfırla</Btn>
          </Panel>
        </SettingsModal>
      )}

      {open === 'profile' && (
        <SettingsModal title="Mevcut Profil Özeti" icon="user" color="text-amber2" wide={false} onClose={() => setOpen(null)}>
          <Panel icon="file" title="Mevcut Profil Özeti" color="text-amber2">
            <div className="space-y-1 rounded-lg border border-line bg-ink/40 p-3 font-mono text-[10px]">
              <div className="flex justify-between"><span className="text-mut2">Mağaza:</span><span>{s.storeName}</span></div>
              <div className="flex justify-between"><span className="text-mut2">Tema:</span><span>{s.theme}</span></div>
              <div className="flex justify-between"><span className="text-mut2">Barkod Sesi:</span><span>{s.sound.enabled ? 'Açık' : 'Kapalı'}</span></div>
              <div className="flex justify-between"><span className="text-mut2">WhatsApp Raporu:</span><span>{s.report.enabled ? 'Aktif' : 'Kapalı'}</span></div>
              <div className="flex justify-between"><span className="text-mut2">E-posta Raporu:</span><span>{s.email.enabled ? 'Aktif' : 'Kapalı'}</span></div>
              <div className="flex justify-between"><span className="text-mut2">Otomatik Yedek:</span><span>{s.autobackup.enabled ? `${s.autobackup.interval} dk` : 'Kapalı'}</span></div>
              <div className="flex justify-between"><span className="text-mut2">Tam Kart Görsel:</span><span>{s.ui.fullCardImage ? 'Açık' : 'Kapalı'}</span></div>
              <div className="flex justify-between"><span className="text-mut2">POS Entegrasyonu:</span><span>{s.pos.enabled ? 'Açık' : 'Kapalı'}</span></div>
            </div>
          </Panel>
        </SettingsModal>
      )}

      {resetOpen && (
        <Modal
          title="Ciro & Kasa Sıfırlama — Güvenlik Şifresi Gerekli"
          icon={<Ic n="alert" c="h-4.5 w-4.5 text-red" />}
          onClose={() => { setResetOpen(false); setResetPass(''); setResetErr(false); }}
          w="max-w-md"
          footer={
            <>
              <Btn v="ghost" onClick={() => { setResetOpen(false); setResetPass(''); setResetErr(false); }}>
                Vazgeç
              </Btn>
              <Btn
                v="danger"
                disabled={resetPass.length !== 8}
                onClick={() => {
                  if (resetPass === '12345678') {
                    setResetOpen(false);
                    setOpen(null);
                    setResetPass('');
                    setResetErr(false);
                    onResetKasa();
                    toast('Tüm ciro, satış ve işletme verileri başarıyla sıfırlandı');
                  } else {
                    setResetErr(true);
                    setResetPass('');
                    toast('Hatalı sıfırlama şifresi!', 'err');
                  }
                }}
              >
                <Ic n="alert" c="h-4 w-4" /> Şifreyi Onayla ve Sıfırla
              </Btn>
            </>
          }
        >
          <div className="space-y-3">
            <div className="rounded-lg border border-red/30 bg-red/10 p-3 text-[11px] leading-relaxed text-red">
              <b className="font-bold">DİKKAT:</b> Satışlar ({state.sales.length}), paket siparişler ({state.deliveries.length}),
              veresiye bakiyeleri, masraflar ({state.expenses.length}), alış faturaları ({state.invoices.length}),
              kasa hareketleri ve stoklar sıfırlanacaktır. Bu işlem geri alınamaz.
            </div>

            <div>
              <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-mut">
                8 Haneli Sıfırlama Güvenlik Şifresi *
              </label>
              <input
                type="password"
                value={resetPass}
                onChange={(e) => {
                  setResetPass(e.target.value.replace(/\D/g, '').slice(0, 8));
                  setResetErr(false);
                }}
                placeholder="••••••••"
                inputMode="numeric"
                autoFocus
                className={cn(
                  'w-full rounded-lg border bg-ink/80 px-3 py-2.5 text-center font-mono text-xl font-bold tracking-[0.35em] text-red outline-none transition-colors focus:border-red',
                  resetErr ? 'border-red ring-2 ring-red/20' : 'border-line2'
                )}
              />
              <div className="mt-1 flex items-center justify-between font-mono text-[9.5px]">
                <span className="text-mut2">{resetPass.length} / 8 hane</span>
                {resetErr && <span className="font-bold text-red">Hatalı şifre! (12345678)</span>}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {qrScanOpen && (
        <CameraScanner
          onDetected={(text) => {
            const ok = handleQrText(text);
            if (ok) setQrScanOpen(false);
            return ok;
          }}
          onClose={() => setQrScanOpen(false)}
        />
      )}
    </div>
  );
}
