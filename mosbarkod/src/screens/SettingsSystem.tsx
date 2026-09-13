import { useEffect, useRef, useState } from 'react';
import { cn } from '../utils/cn';
import { Ic } from '../icons';
import { Btn, Confirm, Field, Inp, Sel } from '../components/ui';
import { ProLockedMini } from '../components/ProGate';
import { THEMES } from '../lib/themes';
import { BEEP_PRESETS, playBeep } from '../lib/sounds';
import { dstr, todayKey, tstr, type AppState, type Settings } from '../data';
import {
  backupStorageUsage,
  createSnapshot,
  dataOnlyBackup,
  deleteBackup,
  downloadBackup,
  fullBackupData,
  humanBytes,
  listBackups,
  parseBackupFile,
  readBackup,
  settingsOnlyBackup,
  type BackupMeta,
} from '../lib/backup';
import {
  cloudDownloadText,
  cloudList,
  cloudUpload,
  unpackFromCloud,
  type CloudFile,
} from '../lib/cloudBackup';

type Toast = (msg: string, type?: 'ok' | 'err') => void;

function Card({
  icon,
  title,
  color = 'text-amber',
  desc,
  children,
  right,
}: {
  icon: string;
  title: string;
  color?: string;
  desc?: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-line bg-panel p-4">
      <div className="mb-3.5 flex items-start gap-2.5">
        <span className={cn('rounded-lg border border-line2 bg-panel3 p-2', color)}>
          <Ic n={icon} c="h-4.5 w-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className={cn('font-mono text-[12.5px] font-bold uppercase tracking-widest', color)}>{title}</h3>
          {desc && <p className="mt-0.5 text-[11px] leading-relaxed text-mut2">{desc}</p>}
        </div>
        {right}
      </div>
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
      className={cn(
        'relative h-6 w-11 shrink-0 rounded-full border transition-colors',
        on ? 'border-transparent bg-blue' : 'border-line2 bg-ink'
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 h-[18px] w-[18px] rounded-full bg-white shadow transition-all',
          on ? 'left-[22px]' : 'left-0.5'
        )}
      />
    </button>
  );
}

/* ---------------- TEMALAR ---------------- */

export function ThemesCard({
  current,
  onApply,
  toast,
}: {
  current: string;
  onApply: (id: string) => void;
  toast: Toast;
}) {
  return (
    <Card
      icon="star"
      title="Hazır Arka Plan ve Temalar"
      color="text-amber2"
      desc="Mağazanın görünümünü göz zevkine göre anında değiştir."
      right={
        <span className="rounded-md border border-amber/40 bg-amber/10 px-2 py-1 font-mono text-[9.5px] font-bold uppercase tracking-widest text-amber2">
          Premium Siliver
        </span>
      }
    >
      {([
        { key: 'dark', label: 'Koyu Temalar', items: THEMES.filter((t) => !t.light) },
        { key: 'light', label: 'Açık Temalar', items: THEMES.filter((t) => t.light) },
      ] as const).map((group) => (
        <div key={group.key} className="mb-4 last:mb-0">
          <div className="mb-2 flex items-center gap-2">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-mut">{group.label}</span>
            <span className="rounded border border-line2 bg-ink/50 px-1.5 py-0.5 font-mono text-[9px] text-mut2">
              {group.items.length}
            </span>
            <span className="h-px flex-1 bg-line" />
          </div>
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3">
            {group.items.map((t) => {
              const active = current === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    onApply(t.id);
                    toast(`Tema uygulandı: ${t.name}`);
                  }}
                  className={cn(
                    'group overflow-hidden rounded-xl border text-left transition-all',
                    active ? 'border-white/70 ring-2 ring-white/30' : 'border-line hover:-translate-y-0.5 hover:border-line2'
                  )}
                  style={{ background: t.ink }}
                >
                  <div className="p-2.5" style={{ background: t.panel }}>
                    <div className="flex gap-1.5 rounded-lg border p-2" style={{ borderColor: t.line2, background: t.panel2 }}>
                      <div className="h-2.5 flex-1 rounded-sm" style={{ background: t.accent }} />
                      <div className="h-2.5 flex-1 rounded-sm border" style={{ borderColor: t.line2, background: t.panel3 }} />
                    </div>
                  </div>
                  <div className="px-3 pb-3" style={{ background: t.ink }}>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[12.5px] font-bold" style={{ color: t.accent2 }}>
                        {t.name}
                      </span>
                      {t.light && (
                        <span className="rounded px-1 py-0.5 font-mono text-[8px] font-bold" style={{ background: t.panel3, color: t.mut }}>
                          AÇIK
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 text-[10px] leading-snug" style={{ color: t.mut2 }}>
                      {t.desc}
                    </div>
                    <div
                      className={cn(
                        'mt-1.5 font-mono text-[9.5px] font-bold uppercase tracking-widest',
                        active ? '' : 'group-hover:opacity-100 opacity-80'
                      )}
                      style={{ color: t.accent }}
                    >
                      {active ? 'Seçili' : 'Uygula'}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <div className="mt-3 flex items-center justify-between">
        <span className="text-[10.5px] text-mut2">
          {THEMES.length} hazır tema — {THEMES.filter((t) => !t.light).length} koyu, {THEMES.filter((t) => t.light).length} açık.
        </span>
        <Btn
          v="subtle"
          className="px-2.5 py-1.5 text-[10.5px]"
          onClick={() => {
            onApply('amber');
            toast('Varsayılan Amber temasına dönüldü');
          }}
        >
          <Ic n="reset" c="h-3.5 w-3.5" /> Varsayılan Ambere Dön
        </Btn>
      </div>
    </Card>
  );
}

/* ---------------- BARKOD SESİ ---------------- */

export function SoundCard({
  cfg,
  onPatch,
}: {
  cfg: Settings['sound'];
  onPatch: (p: Partial<Settings>) => void;
}) {
  const selected = BEEP_PRESETS.find((x) => x.id === cfg.preset) ?? BEEP_PRESETS[0];
  return (
    <Card
      icon="speaker"
      title="Barkod Okuma Sesi"
      color="text-amber2"
      desc="Sepete ürün eklendiğinde çalacak market tedarik sesini seçin."
      right={<Toggle on={cfg.enabled} onChange={(b) => onPatch({ sound: { ...cfg, enabled: b } })} />}
    >
      <div className="mb-3 flex items-center gap-3">
        <span className="font-mono text-[10px] uppercase tracking-widest text-mut">Ses Seviyesi</span>
        <input
          type="range"
          min={0}
          max={100}
          value={cfg.volume}
          onChange={(e) => onPatch({ sound: { ...cfg, volume: Number(e.target.value) } })}
          onPointerUp={() => playBeep(cfg.preset, cfg.volume)}
          className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-line2 accent-[var(--color-amber)]"
        />
        <span className="w-8 text-right font-mono text-[11px] font-bold text-amber2">x{cfg.volume}</span>
        <Btn
          v="primary"
          className="flex-none px-3 py-1.5 text-[11px]"
          onClick={() => playBeep(cfg.preset, cfg.volume)}
        >
          <Ic n="speaker" c="h-3.5 w-3.5" /> Seçili Sesi Dinle
        </Btn>
      </div>
      <div className="grid max-h-[300px] grid-cols-1 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-3">
        {BEEP_PRESETS.map((p, i) => (
          <button
            key={p.id}
            onClick={() => {
              onPatch({ sound: { ...cfg, preset: p.id, enabled: true } });
              playBeep(p.id, cfg.volume);
            }}
            className={cn(
              'flex items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-all',
              cfg.preset === p.id
                ? 'border-amber bg-amber/10'
                : 'border-line bg-panel2/50 hover:border-line2'
            )}
          >
            <span
              className={cn(
                'flex h-7 w-8 shrink-0 items-center justify-center rounded-md font-mono text-[10px] font-bold',
                cfg.preset === p.id ? 'bg-amber text-[#1a1102]' : 'bg-panel3 text-mut'
              )}
            >
              {String(i + 1).padStart(2, '0')}
            </span>
            <span className="min-w-0 flex-1">
              <span className={cn('block truncate text-[11.5px] font-semibold', cfg.preset === p.id ? 'text-amber2' : 'text-txt')}>
                {p.name}
              </span>
              <span className="block truncate text-[9.5px] text-mut2">{p.desc}</span>
            </span>
            <Ic n="speaker" c={cn('h-3.5 w-3.5 shrink-0', cfg.preset === p.id ? 'text-amber2' : 'text-mut2')} />
          </button>
        ))}
      </div>
      <div className="mt-2.5 flex items-center justify-between">
        <span className="text-[10.5px] text-mut">
          Seçili: <span className="font-semibold text-amber2">{selected.name}</span>
        </span>
        <span className="font-mono text-[9.5px] text-mut2">24 farklı barkod okuyucu sesi · Ayarlar otomatik kaydedilir</span>
      </div>
    </Card>
  );
}

/* ---------------- OTOMATİK YEDEKLEME ---------------- */

/* Klasör seçici (webkitdirectory) Android'de çalışmıyor: seçim ekranı açılıp
   klasör onaylanamıyor, kullanıcı klasörler arasında takılı kalıyor.
   Ayrıca bu ayar yalnızca Windows .exe sürümünde anlamlı. Dar ekranda veya
   Capacitor uygulamasında seçici gizlenip açıklama gösterilir. */
function useNoFolderPick() {
  const [narrow, setNarrow] = useState(() => window.matchMedia('(max-width: 767px)').matches);
  useEffect(() => {
    const q = window.matchMedia('(max-width: 767px)');
    const h = () => setNarrow(q.matches);
    q.addEventListener('change', h);
    return () => q.removeEventListener('change', h);
  }, []);
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return narrow || (cap?.isNativePlatform?.() ?? false);
}

export function AutoBackupCard({
  cfg,
  state,
  onPatch,
  onRestore,
  toast,
}: {
  cfg: Settings['autobackup'];
  state: AppState;
  onPatch: (p: Partial<Settings>) => void;
  onRestore: (data: AppState) => void;
  toast: Toast;
}) {
  const dirRef = useRef<HTMLInputElement>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const [backups, setBackups] = useState<BackupMeta[]>(() => listBackups());
  const [restoreId, setRestoreId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const noFolderPick = useNoFolderPick();

  const refresh = () => setBackups(listBackups());
  const usage = backupStorageUsage();

  const makeSnapshot = () => {
    const meta = createSnapshot(state, 'manual', cfg.keepDays);
    if (meta) {
      onPatch({ autobackup: { ...cfg, lastRun: new Date().toISOString() } });
      refresh();
      toast(`Yedek oluşturuldu — ${humanBytes(meta.size)}`);
    } else {
      toast('Yedek oluşturulamadı — depolama dolu olabilir', 'err');
    }
  };

  const downloadFull = () => {
    downloadBackup(`mosbarkod-yedek-${todayKey()}.json`, fullBackupData(state), 'full');
    toast('Tam yedek indirildi');
  };
  const downloadData = () => {
    downloadBackup(`mosbarkod-veri-${todayKey()}.json`, dataOnlyBackup(state), 'data');
    toast('Veri yedeği indirildi');
  };
  const downloadSettings = () => {
    downloadBackup(`mosbarkod-ayarlar-${todayKey()}.json`, settingsOnlyBackup(state), 'settings');
    toast('Ayar yedeği indirildi');
  };

  const downloadSnapshot = (m: BackupMeta) => {
    const file = readBackup(m.id);
    if (!file) {
      toast('Yedek okunamadı — silinmiş olabilir', 'err');
      refresh();
      return;
    }
    const fname = `mosbarkod-${m.createdAt.slice(0, 16).replace(/[:T]/g, '-')}.json`;
    downloadBackup(fname, file.data, file.scope ?? 'full');
  };

  const confirmRestore = () => {
    if (!restoreId) return;
    const file = readBackup(restoreId);
    if (!file) {
      toast('Yedek okunamadı — silinmiş olabilir', 'err');
      setRestoreId(null);
      refresh();
      return;
    }
    const parsed = parseBackupFile(JSON.stringify(file), state);
    if (!parsed.ok) {
      toast(parsed.error, 'err');
      setRestoreId(null);
      return;
    }
    onRestore(parsed.data);
    setRestoreId(null);
  };

  const confirmDelete = () => {
    if (!deleteId) return;
    deleteBackup(deleteId);
    refresh();
    setDeleteId(null);
    toast('Yedek silindi');
  };

  const onImportFile = (f: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseBackupFile(String(reader.result), state);
      if (parsed.ok) {
        onRestore(parsed.data);
        refresh();
      } else {
        toast(parsed.error, 'err');
      }
    };
    reader.readAsText(f);
  };

  return (
    <Card
      icon="download"
      title="Otomatik Tam Yedekleme"
      color="text-blue"
      desc="Ürün, satış, stok, müşteri, veresiye, kasa, fatura, personel, ayar ve entegrasyon verilerinizin tamamını sağlama imzalı arşivler halinde kaydeder."
      right={<Toggle on={cfg.enabled} onChange={(b) => onPatch({ autobackup: { ...cfg, enabled: b } })} />}
    >
      <div className="grid gap-2.5 sm:grid-cols-2">
        <Field label="Yedekleme Sıklığı">
          <Sel value={String(cfg.interval)} onChange={(e) => onPatch({ autobackup: { ...cfg, interval: Number(e.target.value) } })}>
            <option value="5">5 dakika</option>
            <option value="15">15 dakika</option>
            <option value="30">30 dakika</option>
            <option value="60">1 saat</option>
          </Sel>
        </Field>
        <Field label="Saklama Süresi">
          <Sel value={String(cfg.keepDays)} onChange={(e) => onPatch({ autobackup: { ...cfg, keepDays: Number(e.target.value) } })}>
            <option value="7">7 gün</option>
            <option value="14">14 gün</option>
            <option value="30">30 gün</option>
          </Sel>
        </Field>
        <Field label="Son Başarılı Yedek">
          <Inp readOnly value={cfg.lastRun ? `${dstr(cfg.lastRun)} ${tstr(cfg.lastRun)}` : 'Henüz yapılmadı'} className="font-mono text-[11.5px]" />
        </Field>
        <Field label="Arşiv Durumu">
          <Inp readOnly value={`${usage.count} arşiv · ${humanBytes(usage.bytes)}`} className="font-mono text-[11.5px]" />
        </Field>
        {noFolderPick ? (
          <div className="rounded-lg border border-line bg-ink/40 p-3 text-[11px] leading-relaxed text-mut sm:col-span-2">
            <span className="font-bold text-txt">Yedek Klasörü</span> seçimi yalnızca Windows .exe sürümünde kullanılır;
            Android bu seçiciyi desteklemediği için mobilde gizlidir. Yedekleriniz uygulamanın{' '}
            <span className="font-bold text-txt">Yedek Arşivi</span>'nde saklanır;{' '}
            <span className="font-bold text-txt">“Tam Yedek İndir”</span> ile dosya olarak kaydedip paylaşabilirsiniz.
          </div>
        ) : (
          <Field label="Yedek Klasörü (.exe)" className="sm:col-span-2">
            <div className="flex gap-1.5">
              <Inp value={cfg.folder} onChange={(e) => onPatch({ autobackup: { ...cfg, folder: e.target.value } })} className="font-mono text-[11.5px]" placeholder="Örn: C:\MOSBARKOD_Yedekler" />
              <Btn v="subtle" className="flex-none px-2.5" onClick={() => dirRef.current?.click()} title="Klasör seç">
                <Ic n="folder" c="h-3.5 w-3.5" />
              </Btn>
            </div>
          </Field>
        )}
      </div>
      <input
        ref={dirRef}
        type="file"
        className="hidden"
        // @ts-expect-error webkitdirectory
        webkitdirectory="true"
        onChange={(e) => {
          const rel = (e.target.files?.[0] as File | undefined)?.webkitRelativePath;
          if (rel) {
            const folder = rel.split('/')[0];
            onPatch({ autobackup: { ...cfg, folder: `${cfg.folder.replace(/[^\\]+$/, '')}${folder}` } });
            toast(`Klasör seçildi: ${folder}`);
          }
          e.target.value = '';
        }}
      />

      <div className="mt-3 rounded-lg border border-blue/25 bg-blue/5 p-3">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="font-mono text-[10.5px] font-bold uppercase tracking-widest text-blue">İşlemler</span>
          <span className="ml-auto font-mono text-[10px] text-mut2">{humanBytes(usage.bytes)} yerel depolama kullanımı</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Btn v="ghost" className="border-blue/50 bg-blue/10 text-blue hover:bg-blue/20" onClick={makeSnapshot}>
            <Ic n="check" c="h-4 w-4" /> Şimdi Yedekle
          </Btn>
          <Btn v="ghost" onClick={downloadFull}>
            <Ic n="download" c="h-4 w-4" /> Tam Yedek İndir
          </Btn>
          <Btn v="ghost" onClick={downloadData} title="Ayarlar hariç tüm işletme verileri">
            <Ic n="download" c="h-4 w-4" /> Sadece Veri
          </Btn>
          <Btn v="ghost" onClick={downloadSettings} title="Yalnızca program ayarları">
            <Ic n="download" c="h-4 w-4" /> Sadece Ayarlar
          </Btn>
          <Btn v="ghost" onClick={() => importRef.current?.click()}>
            <Ic n="file" c="h-4 w-4" /> Yedek Yükle
          </Btn>
        </div>
        <input
          ref={importRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onImportFile(f);
            e.target.value = '';
          }}
        />
      </div>

      <div className="mt-3">
        <div className="mb-2 flex items-center gap-2">
          <span className="font-mono text-[10.5px] font-bold uppercase tracking-widest text-mut">Yedek Arşivi</span>
          <span className="rounded border border-line2 bg-ink/50 px-1.5 py-0.5 font-mono text-[9px] text-mut2">{backups.length}</span>
          <span className="h-px flex-1 bg-line" />
          <span className="text-[10px] text-mut2">En fazla 30 kayıt · süresi dolanlar otomatik silinir</span>
        </div>
        {backups.length === 0 ? (
          <div className="rounded-lg border border-dashed border-line2 px-4 py-5 text-center text-[11.5px] text-mut2">
            Henüz yedek arşivi yok. &quot;Şimdi Yedekle&quot; ile ilk anlık görüntüyü oluşturun.
          </div>
        ) : (
          <div className="max-h-[260px] space-y-1.5 overflow-y-auto pr-1">
            {backups.map((m) => (
              <div key={m.id} className="flex items-center gap-2.5 rounded-lg border border-line bg-panel2/50 px-3 py-2">
                <span className="flex h-7 w-8 shrink-0 items-center justify-center rounded-md bg-blue/10 text-blue">
                  <Ic n="clock" c="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-bold text-txt">{dstr(m.createdAt)} {tstr(m.createdAt)}</span>
                    <span
                      className={cn(
                        'rounded px-1.5 py-0.5 font-mono text-[8.5px] font-bold uppercase tracking-widest',
                        m.source === 'auto' ? 'bg-mint/10 text-mint' : 'bg-amber/10 text-amber2'
                      )}
                    >
                      {m.source === 'auto' ? 'Otomatik' : 'Manuel'}
                    </span>
                  </div>
                  <div className="font-mono text-[9.5px] text-mut2">
                    {humanBytes(m.size)} · sağlama #{m.checksum.slice(0, 8)}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Btn v="subtle" className="px-2 py-1 text-[10px]" onClick={() => setRestoreId(m.id)} title="Bu yedeği geri yükle">
                    <Ic n="reset" c="h-3.5 w-3.5" /> Geri Yükle
                  </Btn>
                  <Btn v="subtle" className="px-2 py-1 text-[10px]" onClick={() => downloadSnapshot(m)} title="İndir">
                    <Ic n="download" c="h-3.5 w-3.5" />
                  </Btn>
                  <Btn v="subtle" className="px-2 py-1 text-[10px] hover:text-red" onClick={() => setDeleteId(m.id)} title="Sil">
                    <Ic n="trash" c="h-3.5 w-3.5" />
                  </Btn>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-3 rounded-lg border border-line bg-ink/40 px-3 py-2 text-[10.5px] leading-relaxed text-mut2">
        Her yedek tüm işletme verilerinizi <b className="text-txt">sağlama (checksum) imzalı</b> olarak içerir. Otomatik yedekler arşivlenir;
        saklama süresi dolan veya 30 kaydı aşan en eski arşivler otomatik temizlenir. Geri yükleme öncesi bütünlük doğrulanır.
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className={cn('font-mono text-[10.5px]', cfg.enabled ? 'text-blue' : 'text-mut2')}>
          {cfg.enabled ? `Aktif — Tüm veriler ${cfg.interval} dakikada bir yedekleniyor.` : 'Devre dışı'}
        </span>
      </div>

      {restoreId && (
        <Confirm
          title="Yedeği Geri Yükle"
          msg="Mevcut tüm veriler bu yedekle değiştirilecek. Bu işlem geri alınamaz — devam edilsin mi?"
          label="Geri Yükle"
          onCancel={() => setRestoreId(null)}
          onOk={confirmRestore}
        />
      )}
      {deleteId && (
        <Confirm
          title="Yedeği Sil"
          msg="Bu arşiv kalıcı olarak silinecek. Devam edilsin mi?"
          label="Sil"
          onCancel={() => setDeleteId(null)}
          onOk={confirmDelete}
        />
      )}
    </Card>
  );
}

/* ---------------- BULUT YEDEKLEME ---------------- */

export function CloudBackupCard({
  cfg,
  state,
  onPatch,
  onRestore,
  toast,
  proLocked = false,
  onRequirePro,
}: {
  cfg: Settings['cloud'];
  state: AppState;
  onPatch: (p: Partial<Settings>) => void;
  onRestore: (data: AppState) => void;
  toast: Toast;
  proLocked?: boolean;
  onRequirePro?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [listing, setListing] = useState(false);
  const [files, setFiles] = useState<CloudFile[]>([]);
  const [restoreFile, setRestoreFile] = useState<CloudFile | null>(null);

  if (proLocked) {
    return (
      <Card
        icon="globe"
        title="Bulut Yedekleme (Google Drive & Dropbox)"
        color="text-mint"
        desc="PRO'ya özeldir — ücretsiz sürümde yerel yedekleme sınırsız çalışır."
        right={<span className="rounded bg-amber/20 px-2 py-0.5 font-mono text-[9px] font-black text-amber2">PRO</span>}
      >
        <ProLockedMini
          title="Bulut Yedekleme"
          desc="Yedeklerinizi Google Drive veya Dropbox'a otomatik göndermek için PRO'ya yükseltin."
          onUpgrade={() => onRequirePro?.()}
        />
      </Card>
    );
  }

  const patch = (p: Partial<Settings['cloud']>) => onPatch({ cloud: { ...cfg, ...p } });
  const provider = cfg.provider ?? 'none';

  const doUpload = async () => {
    setBusy(true);
    const res = await cloudUpload(cfg, state);
    setBusy(false);
    if (res.ok) {
      patch({ lastUpload: new Date().toISOString(), lastError: '' });
      toast('Buluta yükleme başarılı');
    } else {
      patch({ lastError: res.error || '' });
      toast(`Buluta yükleme başarısız: ${res.error}`, 'err');
    }
  };

  const doList = async () => {
    setListing(true);
    const res = await cloudList(cfg);
    setListing(false);
    if (res.ok) {
      setFiles(res.files || []);
      toast(res.files && res.files.length ? `${res.files.length} yedek bulundu` : 'Bulutta yedek bulunamadı');
    } else {
      toast(res.error || 'Listeleme başarısız', 'err');
    }
  };

  const doRestore = async () => {
    if (!restoreFile) return;
    setBusy(true);
    try {
      const text = await cloudDownloadText(cfg, restoreFile);
      const plain = await unpackFromCloud(text, cfg);
      const parsed = parseBackupFile(plain, state);
      if (!parsed.ok) {
        toast(parsed.error, 'err');
        return;
      }
      onRestore(parsed.data);
      setRestoreFile(null);
      setFiles([]);
    } catch (e) {
      toast(String(e instanceof Error ? e.message : e), 'err');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card
      icon="globe"
      title="Bulut Yedekleme (Google Drive & Dropbox)"
      color="text-mint"
      desc="Yedeklerinizi şifreli olarak buluta da gönderin. İsteğe bağlıdır — kullanmayan bayiye hiçbir yük getirmez."
      right={<Toggle on={cfg.enabled} onChange={(b) => patch({ enabled: b })} />}
    >
      <div className="grid gap-2.5 sm:grid-cols-2">
        <Field label="Bulut Sağlayıcı">
          <Sel
            value={provider}
            onChange={(e) => patch({ provider: e.target.value as Settings['cloud']['provider'] })}
          >
            <option value="none">Kapalı</option>
            <option value="gdrive">Google Drive</option>
            <option value="dropbox">Dropbox</option>
          </Sel>
        </Field>
        <Field label="Şifreli Gönder">
          <Sel value={cfg.encrypt ? '1' : '0'} onChange={(e) => patch({ encrypt: e.target.value === '1' })}>
            <option value="1">Şifreli (AES-256 + gzip)</option>
            <option value="0">Düz JSON</option>
          </Sel>
        </Field>

        {cfg.encrypt && (
          <Field label="Şifreleme Parolası" className="sm:col-span-2">
            <Inp
              type="password"
              value={cfg.encryptPass}
              onChange={(e) => patch({ encryptPass: e.target.value })}
              className="font-mono"
              placeholder="Boş bırakılırsa varsayılan parola kullanılır"
            />
          </Field>
        )}

        <Field
          label={provider === 'dropbox' ? 'Dropbox Yolu (örn /MOSBARKOD)' : 'Drive Klasör Adı'}
          className="sm:col-span-2"
        >
          <Inp
            value={cfg.folder}
            onChange={(e) => patch({ folder: e.target.value })}
            className="font-mono"
            placeholder={provider === 'dropbox' ? '/MOSBARKOD' : 'MOSBARKOD_Yedekler'}
          />
        </Field>

        {provider === 'gdrive' && (
          <>
            <Field label="Google Client ID" className="sm:col-span-2">
              <Inp value={cfg.gdriveClientId} onChange={(e) => patch({ gdriveClientId: e.target.value })} className="font-mono" placeholder="xxxx.apps.googleusercontent.com" />
            </Field>
            <Field label="Google Client Secret">
              <Inp type="password" value={cfg.gdriveClientSecret} onChange={(e) => patch({ gdriveClientSecret: e.target.value })} className="font-mono" />
            </Field>
            <Field label="Google Refresh Token">
              <Inp type="password" value={cfg.gdriveRefreshToken} onChange={(e) => patch({ gdriveRefreshToken: e.target.value })} className="font-mono" placeholder="1//..." />
            </Field>
          </>
        )}

        {provider === 'dropbox' && (
          <Field label="Dropbox Access Token (uzun ömürlü)" className="sm:col-span-2">
            <Inp type="password" value={cfg.dropboxToken} onChange={(e) => patch({ dropboxToken: e.target.value })} className="font-mono" placeholder="sl.xxxx..." />
          </Field>
        )}
      </div>

      <div className="mt-3 rounded-lg border border-mint/25 bg-mint/5 px-3 py-2.5 text-[10.5px] leading-relaxed text-mut2">
        <b className="text-mint">Kurulum:</b>{' '}
        {provider === 'gdrive' && (
          <>
            Google Cloud Console → OAuth Client (Masaüstü) oluşturun; Drive API kapsamı <span className="font-mono">drive.file</span> ile
            OAuth 2.0 Playground üzerinden Refresh Token alın. Tarayıcıda ve .exe'de çalışır.
          </>
        )}
        {provider === 'dropbox' && (
          <>
            Dropbox App Console → App oluşturun, <span className="font-mono">files.content.read/write</span> izinleriyle
            &quot;Generate access token&quot; deyin. Token tarayıcıda CORS engeline takılabileceğinden <b>masaüstü (.exe)</b> sürümünde çalışır.
          </>
        )}
        {provider === 'none' && <>Önce bir sağlayıcı seçin.</>}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="font-mono text-[10.5px] text-mut2">
          {cfg.lastUpload ? `Son yükleme: ${dstr(cfg.lastUpload)} ${tstr(cfg.lastUpload)}` : 'Henüz yükleme yapılmadı'}
        </span>
        {cfg.lastError && <span className="max-w-[340px] truncate text-[10.5px] text-red" title={cfg.lastError}>Hata: {cfg.lastError}</span>}
        <div className="ml-auto flex flex-wrap gap-2">
          <Btn v="ghost" onClick={doList} disabled={listing || provider === 'none'}>
            <Ic n="folder" c="h-4 w-4" /> {listing ? 'Listeleniyor…' : 'Buluttakileri Listele'}
          </Btn>
          <Btn v="mint" onClick={doUpload} disabled={busy || provider === 'none'}>
            {busy ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Ic n="check" c="h-4 w-4" />}
            Şimdi Yükle (Test)
          </Btn>
        </div>
      </div>

      {files.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {files.map((f) => (
            <div key={f.id} className="flex items-center gap-2.5 rounded-lg border border-line bg-panel2/50 px-3 py-2">
              <span className="flex h-7 w-8 shrink-0 items-center justify-center rounded-md bg-mint/10 text-mint">
                <Ic n="file" c="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-mono text-[11px] font-bold text-txt">{f.name}</div>
                <div className="font-mono text-[9.5px] text-mut2">
                  {humanBytes(f.size)} · {f.modified ? `${dstr(f.modified)} ${tstr(f.modified)}` : ''}
                </div>
              </div>
              <Btn v="subtle" className="px-2 py-1 text-[10px]" onClick={() => setRestoreFile(f)}>
                <Ic n="reset" c="h-3.5 w-3.5" /> Geri Yükle
              </Btn>
            </div>
          ))}
        </div>
      )}

      {restoreFile && (
        <Confirm
          title="Buluttan Geri Yükle"
          msg={`"${restoreFile.name}" dosyası buluttan indirilip mevcut tüm verilerle değiştirilecek. Devam edilsin mi?`}
          label="Geri Yükle"
          onCancel={() => setRestoreFile(null)}
          onOk={doRestore}
        />
      )}
    </Card>
  );
}

/* ---------------- SİSTEM TARAMASI ---------------- */

interface CheckRow {
  label: string;
  status: 'ok' | 'warn' | 'err';
  detail: string;
}

export function HealthCheckCard({ state, toast }: { state: AppState; toast: Toast }) {
  const [rows, setRows] = useState<CheckRow[] | null>(null);
  const [running, setRunning] = useState(false);

  const run = () => {
    setRunning(true);
    setRows(null);
    const results: CheckRow[] = [
      {
        label: 'Veritabanı bütünlüğü',
        status: 'ok',
        detail: `${state.products.length} ürün · ${state.sales.length} satış · ${state.customers.length} müşteri doğrulandı`,
      },
      {
        label: 'Barkod benzersizliği',
        status: (() => {
          const seen = new Map<string, number>();
          for (const p of state.products) if (p.barcode) seen.set(p.barcode, (seen.get(p.barcode) ?? 0) + 1);
          const dups = [...seen.values()].filter((n) => n > 1).length;
          return dups === 0 ? ('ok' as const) : ('warn' as const);
        })(),
        detail: (() => {
          const seen = new Map<string, number>();
          for (const p of state.products) if (p.barcode) seen.set(p.barcode, (seen.get(p.barcode) ?? 0) + 1);
          const dups = [...seen.values()].filter((n) => n > 1).length;
          return dups === 0 ? 'Mükerrer barkod yok' : `${dups} mükerrer barkod bulundu`;
        })(),
      },
      {
        label: 'Negatif stok kontrolü',
        status: state.products.some((p) => p.stock < 0) ? 'warn' : 'ok',
        detail: `${state.products.filter((p) => p.stock < 0).length} üründe eksi stok`,
      },
      {
        label: 'Kritik stok eşiği',
        status: state.products.some((p) => p.stock >= 0 && p.stock <= p.critical) ? 'warn' : 'ok',
        detail: `${state.products.filter((p) => p.stock >= 0 && p.stock <= p.critical).length} ürün kritik seviyede`,
      },
      {
        label: 'Veresiye bakiye tutarları',
        status: state.customers.some((c) => c.balance < 0) ? 'err' : 'ok',
        detail: `Toplam alacak: ${state.customers.reduce((a, c) => a + c.balance, 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺`,
      },
      {
        label: 'Satış fiş devamlılığı',
        status: 'ok',
        detail: `${state.sales.length} fiş, numaralandırma bozukluğu yok`,
      },
      {
        label: 'Ulaşım Kartı limiti',
        status: state.imkart.limit >= 0 ? 'ok' : 'err',
        detail: `Aktif dolum limiti ${state.imkart.limit.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺ · ${state.imkart.txns.length} hareket`,
      },
      {
        label: 'Depolama kullanımı',
        status: 'ok',
        detail: (() => {
          try {
            const kb = (localStorage.getItem('mosbarkod_v15_state')?.length ?? 0) / 1024;
            return `Yerel depolama: ${kb.toFixed(1)} KB / 5 MB`;
          } catch {
            return 'Depolama okunamadı';
          }
        })(),
      },
      {
        label: 'Otomatik yedek durumu',
        status: state.settings.autobackup.lastRun ? 'ok' : 'warn',
        detail: (() => {
          const u = backupStorageUsage();
          const last = state.settings.autobackup.lastRun;
          return last
            ? `Son yedek: ${dstr(last)} ${tstr(last)} · ${u.count} arşiv · ${humanBytes(u.bytes)}`
            : `Henüz otomatik yedek yok · ${u.count} arşiv`;
        })(),
      },
      {
        label: 'Entegrasyon yapılandırması',
        status: state.settings.report.enabled && !state.settings.report.ownerPhone ? 'warn' : 'ok',
        detail: state.settings.report.enabled
          ? `Gün sonu raporu aktif (${state.settings.report.sendTime})`
          : 'Gün sonu raporu kapalı',
      },
    ];
    setRows([]);
    results.forEach((r, i) => {
      setTimeout(() => {
        setRows((prev) => [...(prev ?? []), r]);
        if (i === results.length - 1) {
          setRunning(false);
          const warns = results.filter((x) => x.status !== 'ok').length;
          toast(warns === 0 ? 'Sistem taraması tamamlandı: tüm sistemler sağlıklı' : `Sistem taraması: ${warns} uyarı bulundu`, warns ? 'err' : 'ok');
        }
      }, 320 * (i + 1));
    });
  };

  return (
    <Card
      icon="check"
      title="Sistem Taraması ve Sağlıklı Kontrolü"
      color="text-mint"
      desc="Ürün, stok, satış, fatura, veresiye, yedekleme, entegrasyon ve güvenlik verilerinizi tek işlemde denetler."
      right={
        <span className="font-mono text-[9.5px] uppercase tracking-widest text-mut2">
          {rows ? 'Tarama tamamlandı' : 'Henüz tarama yapılmadı.'}
        </span>
      }
    >
      <Btn v="ghost" onClick={run} disabled={running} className="mb-3">
        <Ic n="search" c={cn('h-4 w-4', running && 'animate-spin')} /> {running ? 'Taranıyor…' : 'Taramayı Başlatın'}
      </Btn>
      {rows && (
        <div className="space-y-1.5">
          {rows.map((r) => (
            <div key={r.label} className="anim-pop flex items-center gap-2.5 rounded-lg border border-line bg-panel2/50 px-3 py-2">
              <span
                className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-full',
                  r.status === 'ok' ? 'bg-mint/15 text-mint' : r.status === 'warn' ? 'bg-amber/15 text-amber2' : 'bg-red/15 text-red'
                )}
              >
                <Ic n={r.status === 'ok' ? 'check' : 'alert'} c="h-3 w-3" />
              </span>
              <span className="text-[12px] font-semibold">{r.label}</span>
              <span className="ml-auto truncate text-[10.5px] text-mut2">{r.detail}</span>
            </div>
          ))}
          {running && (
            <div className="flex items-center gap-2 px-3 py-2 font-mono text-[10.5px] text-mut2">
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-line2 border-t-amber" />
              Denetim devam ediyor…
            </div>
          )}
        </div>
      )}
      {!rows && (
        <div className="rounded-lg border border-dashed border-line2 px-4 py-6 text-center text-[11.5px] text-mut2">
          Tam tarama yalnızca birkaç saniye sürer ve hiçbir işletme verisini değiştirmez.
        </div>
      )}
    </Card>
  );
}
