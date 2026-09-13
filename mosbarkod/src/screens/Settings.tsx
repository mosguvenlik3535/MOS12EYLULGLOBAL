import { useEffect, useRef, useState, type ReactNode } from 'react';
import JSZip from 'jszip';
import { QRCodeSVG } from 'qrcode.react';
import { cn } from '../utils/cn';
import { Ic } from '../icons';
import { Badge, Btn, Field, Inp, Modal, ScreenHead, Sel } from '../components/ui';
import { HardwareCard, ReportCard, WhatsAppCard, EmailCard } from './SettingsIntegrations';
import { AutoBackupCard, CloudBackupCard, HealthCheckCard, SoundCard, ThemesCard } from './SettingsSystem';
import { applyTheme } from '../lib/themes';
import { defaultUI, DEFAULT_CURRENCIES, setActiveCurrencyCode, moduleEnabled, type AppState, type Settings, type CurrencyConfig } from '../data';
import CameraScanner from '../components/CameraScanner';
import { CustomerDisplay } from '../components/CustomerDisplay';
import { useLocale } from '../locales/i18n';
import { LOCALES } from '../locales/i18n';
import Flag from '../components/Flag';
import { IS_DEMO, IS_PLAY, appVersionLabel } from '../lib/buildMode';


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
          <div className="font-mono text-[17px] font-extrabold tracking-[0.12em] text-amber2">MOS</div>
          <div className="mt-1 font-mono text-[6px] tracking-[0.35em] text-white/65">BARKOD</div>
        </div>
        <div className="mt-4 font-mono text-[9px] tracking-[0.24em] text-white/60">LİSANSLI YAZILIM</div>
      </div>

      <div className="mt-5 font-mono text-[15px] font-bold tracking-[0.14em] text-amber2">MOSBARKODYAZILIM</div>
      <div className="mt-1 text-[10px] text-mut2">Profesyonel Barkodlu Satış Çözümleri</div>

      <div className="mt-5 space-y-2 rounded-xl border border-white/70 bg-black/20 p-3 font-mono text-[9.5px]">
        <div className="flex justify-between gap-3"><span className="text-mut2">Yazılım Sahibi:</span><span className="font-bold text-txt">MOSBARKODYAZILIM</span></div>
        <div className="flex justify-between gap-3"><span className="text-mut2">Sürüm:</span><span className="font-bold text-txt">{appVersionLabel()}</span></div>
        <div className="flex justify-between gap-3"><span className="text-mut2">Lisans Tipi:</span><span className={cn('font-bold', IS_PLAY || IS_DEMO ? 'text-amber2' : 'text-mint')}>{IS_PLAY ? '★ AYLIK ABONELİK' : IS_DEMO ? '★ DENEME' : '✓ ÖMÜR BOYU'}</span></div>
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
  | 'modules'
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
          version: appVersionLabel(),
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

/**
 * Korumalı bölümlerin ortak güvenlik şifresi.
 * Kasa & ciro sıfırlama gibi kritik bölümler yalnızca bu 8 haneli şifreyle açılır.
 */
const SECURITY_PASS = '12345678';

/**
 * Ortak 8 haneli güvenlik şifresi penceresi.
 * Şifre doğru girildiğinde `onAuthorized` çağrılır; yanlış girilirse hata gösterilir.
 */
function SecurityGateModal({
  title,
  confirmLabel,
  warning,
  color = 'text-red',
  onAuthorized,
  onError,
  onClose,
}: {
  title: string;
  confirmLabel: string;
  warning?: ReactNode;
  color?: string;
  onAuthorized: () => void;
  onError?: () => void;
  onClose: () => void;
}) {
  const [pass, setPass] = useState('');
  const [err, setErr] = useState(false);

  const clear = () => {
    setPass('');
    setErr(false);
  };

  return (
    <Modal
      title={title}
      icon={<Ic n="lock" c={`h-4.5 w-4.5 ${color}`} />}
      onClose={() => {
        clear();
        onClose();
      }}
      w="max-w-md"
      footer={
        <>
          <Btn
            v="ghost"
            onClick={() => {
              clear();
              onClose();
            }}
          >
            Vazgeç
          </Btn>
          <Btn
            v="danger"
            disabled={pass.length !== 8}
            onClick={() => {
              if (pass === SECURITY_PASS) {
                clear();
                onAuthorized();
              } else {
                setErr(true);
                setPass('');
                onError?.();
              }
            }}
          >
            <Ic n="alert" c="h-4 w-4" /> {confirmLabel}
          </Btn>
        </>
      }
    >
      <div className="space-y-3">
        {warning}
        <div>
          <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-mut">
            8 Haneli Güvenlik Şifresi *
          </label>
          <input
            type="password"
            value={pass}
            onChange={(e) => {
              setPass(e.target.value.replace(/\D/g, '').slice(0, 8));
              setErr(false);
            }}
            placeholder="••••••••"
            inputMode="numeric"
            autoFocus
            className={cn(
              'w-full rounded-lg border bg-ink/80 px-3 py-2.5 text-center font-mono text-xl font-bold tracking-[0.35em] text-red outline-none transition-colors focus:border-red',
              err ? 'border-red ring-2 ring-red/20' : 'border-line2'
            )}
          />
          <div className="mt-1 flex items-center justify-between font-mono text-[9.5px]">
            <span className="text-mut2">{pass.length} / 8 hane</span>
            {err && <span className="font-bold text-red">Hatalı şifre!</span>}
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default function SettingsScreen({
  state,
  onPatch,
  onRestore,
  onResetKasa,
  sync,
  joinCode,
  setJoinCode,
  onStartHostSync,
  onJoinHostSync,
  onStopSync,
  toast,
  proLocked = false,
  onRequirePro,
}: {
  state: AppState;
  onPatch: (p: Partial<Settings>) => void;
  onRestore: (data: AppState) => void;
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
  proLocked?: boolean;
  onRequirePro?: () => void;
}) {
  const s = state.settings;
  const { locale, setLocale, t } = useLocale();
  const visibleConnected = sync.connected;
  const [resetGateOpen, setResetGateOpen] = useState(false);
  const [open, setOpen] = useState<TileId | null>(null);
  const [qrScanOpen, setQrScanOpen] = useState(false);
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
    customerLogo: s.customerLogo ?? '',
  });
  const logoRef = useRef<HTMLInputElement>(null);

  // Bayi logosu — küçültülmüş PNG data URL'e çevrilir (kayıtlar şişmesin).
  const onLogoFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast('Lütfen bir görsel dosyası seçin', 'err');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const MAX = 160;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, w, h);
        setCompany((c) => ({ ...c, customerLogo: canvas.toDataURL('image/png') }));
        toast('Logo hazır — "Kaydet"e basın');
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  };

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

  const syncBadge = visibleConnected ? (
    <Badge tone="ok">BAĞLI</Badge>
  ) : sync.role === 'host' ? (
    <Badge tone="warn">QR AKTİF</Badge>
  ) : (
    <Badge tone="mut">KAPALI</Badge>
  );

  const activeCurrency = s.currency?.active || 'TRY';
  const imkartOn = moduleEnabled(s, 'imkart');
  const deliveryOn = moduleEnabled(s, 'delivery');
  const MODULE_ON_COUNT = (imkartOn ? 1 : 0) + (deliveryOn ? 1 : 0);

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
    { id: 'modules', icon: 'box', color: 'text-blue', title: 'Modül Yönetimi', desc: 'Ulaşım Kartı ve Paket Sipariş sekmelerini ülkeye/müşteriye göre açıp kapatın.', badge: <Badge tone="warn">{MODULE_ON_COUNT}/2 AÇIK</Badge> },
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
              onOpen={() => {
                // Kritik bölüm yalnızca güvenlik şifresiyle açılır.
                if (t.id === 'reset') {
                  setResetGateOpen(true);
                } else {
                  setOpen(t.id);
                }
              }}
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
                  <Flag code={l.id} className="h-6 w-8" />
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
                    placeholder="https://wa.me/905xxxxxxxxx"
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
                <Field label="Logo Simgesi (logo yoksa)">
                  <Sel value={company.logoIcon} onChange={(e) => setCompany({ ...company, logoIcon: e.target.value })}>
                    <option value="flame">Alev</option>
                    <option value="barcode">Barkod</option>
                    <option value="box">Kutu</option>
                    <option value="star">Yıldız</option>
                    <option value="banknote">Banknot</option>
                  </Sel>
                </Field>
              </div>
              <Field label="Bayi / Mağaza Logosu">
                <div className="flex items-center gap-3">
                  {company.customerLogo ? (
                    <img
                      src={company.customerLogo}
                      alt="Bayi logosu"
                      className="h-14 w-14 shrink-0 rounded-lg border border-line bg-ink/40 object-contain p-1"
                    />
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-line bg-ink/40 text-amber2">
                      <Ic n={company.logoIcon || 'flame'} c="h-7 w-7" />
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Btn v="ghost" className="border-blue/50 bg-blue/10 text-blue hover:bg-blue/20" onClick={() => logoRef.current?.click()}>
                      <Ic n="file" c="h-4 w-4" /> Logo Yükle
                    </Btn>
                    {company.customerLogo && (
                      <Btn v="ghost" className="border-red/40 text-red" onClick={() => setCompany((c) => ({ ...c, customerLogo: '' }))}>
                        <Ic n="trash" c="h-4 w-4" /> Kaldır
                      </Btn>
                    )}
                  </div>
                </div>
                <p className="mt-1.5 text-[10px] leading-relaxed text-mut2">
                  Logo yoksa soldaki simge kullanılır. Önerilen: kare, şeffaf arka planlı PNG. Görsel otomatik küçültülür.
                </p>
                <input
                  ref={logoRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onLogoFile(f);
                    e.target.value = '';
                  }}
                />
              </Field>
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
          <HardwareCard settings={s} onPatch={onPatch} toast={toast} />
        </SettingsModal>
      )}

      {open === 'backup' && (
        <SettingsModal title="Yedekleme & Sistem Sağlık" icon="download" color="text-blue" onClose={() => setOpen(null)}>
          <AutoBackupCard cfg={s.autobackup} state={state} onPatch={onPatch} onRestore={onRestore} toast={toast} />
          <CloudBackupCard cfg={s.cloud} state={state} onPatch={onPatch} onRestore={onRestore} toast={toast} proLocked={proLocked} onRequirePro={onRequirePro} />
          <HealthCheckCard state={state} toast={toast} />
        </SettingsModal>
      )}

      {open === 'update' && (
        <SettingsModal title="Program Güncelleme" icon="reset" color="text-blue" onClose={() => setOpen(null)}>
          <UpdateCard state={state} onPatch={onPatch} toast={toast} />
        </SettingsModal>
      )}

      {open === 'modules' && (
        <SettingsModal title="Modül Yönetimi" icon="box" color="text-blue" wide={false} onClose={() => setOpen(null)}>
          <Panel icon="box" title="Aktif Modüller (Sekmeler)" color="text-blue" desc="Her ülke veya müşteri bu sekmelerin tümüne ihtiyaç duymayabilir. Kapattığınız sekme menüden kaldırılır; değişiklik anında kaydedilir.">
            <div className="mb-3 rounded-xl border border-line bg-ink/40 p-3">
              <div className="mb-2 font-mono text-[9px] font-bold uppercase tracking-wider text-mut2">
                Hazır Profiller — tek tıkla uygula:
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: 'Tam Paket', desc: 'İmkart + Sipariş', m: { imkart: true, delivery: true } },
                  { label: 'Sipariş Yok', desc: 'yalnız İmkart', m: { imkart: true, delivery: false } },
                  { label: 'İmkart Yok', desc: 'yalnız Sipariş', m: { imkart: false, delivery: true } },
                  { label: 'Yalnız POS', desc: 'ikisi kapalı', m: { imkart: false, delivery: false } },
                ].map((pr) => (
                  <button
                    key={pr.label}
                    type="button"
                    onClick={() => {
                      onPatch({ modules: { ...s.modules, ...pr.m } });
                      toast(`"${pr.label}" profili uygulandı`);
                    }}
                    className="rounded-lg border border-line2 bg-panel3 px-3 py-1.5 text-left transition-colors hover:border-amber/50"
                  >
                    <div className="font-mono text-[11px] font-bold text-txt">{pr.label}</div>
                    <div className="font-mono text-[9px] text-mut2">{pr.desc}</div>
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2.5">
              {([
                {
                  id: 'imkart',
                  icon: 'card',
                  title: 'Ulaşım Kartı',
                  desc: 'Toplu ulaşım kartına bakiye/dolum satışı sekmesi, limit yönetimi ve gün sonu dolum devri.',
                  on: imkartOn,
                  offHint: 'Kapatılırsa menüden, üst limit butonundan ve gün sonu kapatma ekranından kaldırılır.',
                },
                {
                  id: 'delivery',
                  icon: 'bag',
                  title: 'Paket Sipariş',
                  desc: 'Adrese paket/kargo siparişi alma, teslimat takibi ve kurye atama sekmesi.',
                  on: deliveryOn,
                  offHint: 'Kapatılırsa sipariş telefonları (order rolü) Satış ekranına yönlendirilir.',
                },
              ] as const).map((m) => (
                <div
                  key={m.id}
                  className={cn('flex items-center gap-3 rounded-xl border p-4 transition-colors', m.on ? 'border-mint/40 bg-mint/5' : 'border-line2 bg-panel2/40')}
                >
                  <Ic n={m.icon} c={cn('h-5 w-5 shrink-0', m.on ? 'text-mint' : 'text-mut')} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[13px] font-bold text-txt">{m.title}</span>
                      {m.on ? <Badge tone="ok">AÇIK</Badge> : <Badge tone="mut">KAPALI</Badge>}
                    </div>
                    <div className="text-[11px] leading-snug text-mut2">{m.desc}</div>
                    <div className="mt-0.5 text-[10px] leading-snug text-mut2">{m.offHint}</div>
                  </div>
                  <button
                    onClick={() => onPatch({ modules: { ...s.modules, [m.id]: !m.on } })}
                    role="switch"
                    aria-checked={m.on}
                    aria-label={`${m.title} modülünü ${m.on ? 'kapat' : 'aç'}`}
                    className={cn('relative h-7 w-12 shrink-0 rounded-full border transition-colors', m.on ? 'border-mint bg-mint/30' : 'border-line bg-ink/60')}
                  >
                    <span className={cn('absolute top-0.5 h-5.5 w-5.5 rounded-full bg-white shadow transition-all', m.on ? 'left-6' : 'left-0.5')} />
                  </button>
                </div>
              ))}
            </div>
            <div className="rounded-lg border border-line bg-ink/40 p-3 text-[10.5px] leading-relaxed text-mut2">
              <b className="text-mut">Not:</b> Ayar cihazda kalıcı saklanır; uygulama yeniden açıldığında da geçerlidir. Kapattığınız
              modüle ait mevcut veriler (dolum geçmişi, siparişler) silinmez — yalnızca ekranlar gizlenir.
            </div>
          </Panel>
        </SettingsModal>
      )}

      {open === 'reset' && (
        <SettingsModal title="Kasa & Ciro Sıfırlama" icon="alert" color="text-red" wide={false} onClose={() => setOpen(null)}>
          <Panel icon="reset" title="Tüm İşletme Değerlerini Sıfırla" color="text-red">
            <p className="mb-3 text-[10.5px] leading-relaxed text-mut2">
              İlk kurulum için satış/ciro, paket sipariş, veresiye, masraf, alış faturası, POS ve kasa hareketleri,
              Ulaşım Kartı, stok miktarları ve personel ödeme geçmişleri sıfırlanır. Ürün/personel kartları ve şirket
              ayarları korunur.
            </p>
            <Btn v="danger" className="w-full" onClick={() => { onResetKasa(); setOpen(null); toast('Tüm ciro, satış ve işletme verileri başarıyla sıfırlandı'); }}><Ic n="alert" c="h-4 w-4" /> Tüm İşletme Değerlerini Sıfırla</Btn>
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

      {resetGateOpen && (
        <SecurityGateModal
          title="Kasa & Ciro Sıfırlama — Güvenlik Şifresi Gerekli"
          confirmLabel="Şifreyi Onayla ve Aç"
          color="text-red"
          warning={
            <div className="rounded-lg border border-red/30 bg-red/10 p-3 text-[11px] leading-relaxed text-red">
              <b className="font-bold">DİKKAT:</b> Bu bölümde tüm satış/ciro, paket sipariş, veresiye, masraf, alış faturası,
              kasa hareketleri ve stoklar sıfırlanır. İşlem geri alınamaz — yalnızca yetkili yöneticiler açmalıdır.
            </div>
          }
          onAuthorized={() => {
            setResetGateOpen(false);
            setOpen('reset');
          }}
          onError={() => toast('Hatalı güvenlik şifresi!', 'err')}
          onClose={() => setResetGateOpen(false)}
        />
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
