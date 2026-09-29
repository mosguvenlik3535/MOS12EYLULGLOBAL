import { collectBackupFile, zipBackup, readBackupBytes } from './backupArchive';
import { snapshotStore } from './backupStore';
import { defaultSettings, defaultState, type AppState, type Settings } from '../data';

/**
 * Yedekleme motoru — sürümlü, checksum imzalı, dönen (rotasyonlu) anlık görüntüler.
 *
 * Özellikler:
 *  - Her yedek: tür, sürüm, tarih, checksum ve kapsam bilgisi taşır.
 *  - Otomatik yedekler IndexedDB içinde ZIP olarak (küçük liste localStorage'da) dönen arşiv olarak tutulur (tek anahtar üzerine yazılmaz).
 *  - keepDays'e göre eski arşivler otomatik temizlenir; ayrıca MAX_SNAPSHOTS sınırı vardır.
 *  - İçe aktarma: eski düz JSON dışa aktarmaları da destekler, checksum doğrular.
 */

export const BACKUP_KIND = 'MOSBARKOD-BACKUP';
export const BACKUP_VERSION = 2;
export const MAX_SNAPSHOTS = 30;

const INDEX_KEY = 'mosbarkod_backup_index';
const SNAP_PREFIX = 'mosbarkod_backup_';

export type BackupScope = 'full' | 'data' | 'settings';
export type BackupSource = 'auto' | 'manual';

export interface BackupMeta {
  id: string;
  createdAt: string;
  size: number;
  checksum: string;
  source: BackupSource;
  scope: BackupScope;
  version: number;
}

export interface BackupFile {
  kind: string;
  version: number;
  scope: BackupScope;
  createdAt: string;
  checksum: string;
  data: Partial<AppState>;
  attachments?: Record<string,string>;
  attachmentChecksum?: string;
}

/* ---------- checksum (FNV-1a 32-bit) ---------- */

export function checksumOf(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/* ---------- yardımcılar ---------- */

const snapKey = (id: string) => SNAP_PREFIX + id;

const stampId = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, '0');
  const ts = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
  return `${ts}-${Math.random().toString(36).slice(2, 6)}`;
};

export function humanBytes(bytes: number): string {
  if (!bytes || bytes < 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function trySet(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function readIndex(): BackupMeta[] {
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function writeIndex(list: BackupMeta[]) {
  trySet(INDEX_KEY, JSON.stringify(list));
}

/* ---------- dizin / liste ---------- */

export function listBackups(): BackupMeta[] {
  return readIndex()
    .filter((m) => m && typeof m.id === 'string')
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function backupStorageUsage(): { count: number; bytes: number } {
  const list = listBackups();
  return { count: list.length, bytes: list.reduce((a, m) => a + (m.size || 0), 0) };
}

/* ---------- oluşturma ---------- */

export function buildBackupFile(
  data: Partial<AppState>,
  scope: BackupScope,
  createdAt = new Date().toISOString()
): BackupFile {
  return {
    kind: BACKUP_KIND,
    version: BACKUP_VERSION,
    scope,
    createdAt,
    checksum: checksumOf(JSON.stringify(data)),
    data,
  };
}

export function serializeBackup(data: Partial<AppState>, scope: BackupScope, createdAt?: string): string {
  return JSON.stringify(buildBackupFile(data, scope, createdAt), null, 2);
}

/** Kapsam seçicileri — dışa aktarma için. */
export const fullBackupData = (s: AppState): AppState => s;
export const dataOnlyBackup = (s: AppState): Partial<AppState> => {
  const { settings: _s, ...rest } = s;
  return rest;
};
export const settingsOnlyBackup = (s: AppState): { settings: Settings } => ({ settings: s.settings });

/* ---------- anlık görüntü (snapshot) ---------- */

export async function createSnapshot(data: AppState, source: BackupSource, keepDays: number): Promise<BackupMeta | null> {
 try {
  const file=await collectBackupFile(data,'full');const bytes=await zipBackup(file);const id=stampId(new Date(file.createdAt));
  await snapshotStore('put',id,bytes);
  const meta:BackupMeta={id,createdAt:file.createdAt,size:bytes.length,checksum:file.checksum,source,scope:'full',version:3};
  if(!trySet(INDEX_KEY,JSON.stringify([meta,...listBackups()]))){await snapshotStore('delete',id);return null;}
  await pruneBackups(keepDays);return meta;
 }catch{return null;}
}

/* ---------- okuma / geri yükleme ---------- */

export async function readBackup(id: string): Promise<BackupFile | null> {
 try {const raw=localStorage.getItem(snapKey(id));if(raw)return JSON.parse(raw);const bytes=await snapshotStore('get',id);return bytes?JSON.parse(await readBackupBytes(bytes)):null;}catch{return null;}
}
export async function deleteBackup(id: string) {
 await snapshotStore('delete',id);localStorage.removeItem(snapKey(id));writeIndex(readIndex().filter(m=>m.id!==id));
}
export async function pruneBackups(keepDays: number) {
 const list=listBackups();const cutoff=Date.now()-Math.max(1,keepDays)*86400000;
 for(const m of list.filter((m,i)=>i>=MAX_SNAPSHOTS||new Date(m.createdAt).getTime()<cutoff))await deleteBackup(m.id);
}

/* ---------- ayrıştırma / içe aktarma ---------- */

function normalizeArrays(partial: Partial<AppState>): AppState {
  const base = defaultState();
  const merged: AppState = { ...base, ...partial };
  merged.products = Array.isArray(merged.products) ? merged.products : [];
  merged.sales = Array.isArray(merged.sales) ? merged.sales : [];
  merged.deliveries = Array.isArray(merged.deliveries) ? merged.deliveries : [];
  merged.customers = Array.isArray(merged.customers) ? merged.customers : [];
  merged.expenses = Array.isArray(merged.expenses) ? merged.expenses : [];
  merged.supplierCredits = Array.isArray(merged.supplierCredits) ? merged.supplierCredits : [];
  merged.invoices = Array.isArray(merged.invoices) ? merged.invoices : [];
  merged.staff = Array.isArray(merged.staff) ? merged.staff : [];
  merged.cashMoves = Array.isArray(merged.cashMoves) ? merged.cashMoves : [];
  merged.posCloses = Array.isArray(merged.posCloses) ? merged.posCloses : [];
  if (!merged.imkart || !Array.isArray(merged.imkart.txns)) merged.imkart = { limit: 0, txns: [] };
  merged.settings = { ...defaultSettings(), ...(merged.settings || {}) };
  return merged;
}

export type ParseResult =
  | { ok: true; scope: BackupScope; data: AppState; attachments?: Record<string,string> }
  | { ok: false; error: string };

/**
 * Yedek metnini ayrıştırır; her zaman tam bir AppState döndürür.
 * `current` — veri/sadece-ayar kapsamlarında eksik kalan kısmı tamamlamak için kullanılır.
 */
export function parseBackupFile(text: string, current: AppState): ParseResult {
  let obj: any;
  try {
    obj = JSON.parse(text);
  } catch {
    return { ok: false, error: 'JSON ayrıştırılamadı — dosya bozuk olabilir' };
  }
  if (!obj || typeof obj !== 'object') return { ok: false, error: 'Dosya geçerli bir yedek değil' };

  // Eski düz dışa aktarmalar (kind alanı yok): tam yedek sayılır.
  if (!obj.kind) {
    if (!Array.isArray(obj.products) || !Array.isArray(obj.sales) || !obj.settings) {
      return { ok: false, error: 'Dosya geçerli bir MOSBARKOD yedeği değil' };
    }
    return { ok: true, scope: 'full', data: normalizeArrays(obj as Partial<AppState>) };
  }

  if (obj.kind !== BACKUP_KIND) {
    return { ok: false, error: 'Bu dosya MOSBARKOD yedeği değil (tanınmayan tür)' };
  }
  if(obj.version>3)return {ok:false,error:'Bu yedek daha yeni bir uygulama sürümü gerektiriyor'};
  if(obj.version===3&&!obj.checksum)return {ok:false,error:'Yedek bütünlük bilgisi eksik'};
  if (!obj.data || typeof obj.data !== 'object') {
    return { ok: false, error: 'Yedek içeriği boş veya eksik' };
  }
  if (obj.checksum) {
    const expected = checksumOf(JSON.stringify(obj.data));
    if (expected !== obj.checksum) {
      return { ok: false, error: 'Yedek bütünlük doğrulaması başarısız (checksum uyuşmuyor)' };
    }
  }

  const scope: BackupScope = obj.scope === 'data' || obj.scope === 'settings' ? obj.scope : 'full';
  const d = obj.data as Partial<AppState>;
  let attachments: Record<string,string> | undefined;
  if(obj.version>=3 && scope!=='settings' && obj.attachments===undefined)return {ok:false,error:'Yedekte fatura belgeleri bloğu eksik'};
  if(obj.attachments!==undefined){
    if(!obj.attachments||typeof obj.attachments!=='object'||Array.isArray(obj.attachments)||checksumOf(JSON.stringify(obj.attachments))!==obj.attachmentChecksum)return {ok:false,error:'Fatura belgeleri bütünlük kontrolü başarısız'};
    const ids=new Set((Array.isArray(d.invoices)?d.invoices:[]).map(i=>i.id));
    attachments=Object.create(null);
    for(const [id,value] of Object.entries(obj.attachments)){
      if(!ids.has(id)||typeof value!=='string'||!/^data:(application\/pdf|image\/(jpeg|png|webp|gif));base64,[A-Za-z0-9+/]*={0,2}$/.test(value))return {ok:false,error:'Yedekte geçersiz veya faturasız belge var'};
      attachments![id]=value;
    }
  }


  // Sadece ayarlar: mevcut makinenin işletme verileri korunur, yalnızca ayarlar değişir.
  if (scope === 'settings') {
    if (!d.settings) return { ok: false, error: 'Ayar yedeğinde settings bloğu eksik' };
    return {
      ok: true,
      scope,
      data: { ...normalizeArrays({ ...current }), settings: { ...defaultSettings(), ...d.settings } },
    };
  }

  const data = normalizeArrays(d);
  // Sadece veri: mevcut makinenin ayarları korunur, işletme verileri yedekten gelir.
  if (scope === 'data') {
    data.settings = current.settings;
  }
  return { ok: true, scope, data, attachments };
}

/* ---------- indirme ---------- */

export function downloadText(filename: string, text: string) {
  downloadBlob(filename,new Blob([text], { type: 'application/json' }));
}
export function downloadBlob(filename:string,blob:Blob) {
  /* Mobil (özellikle Android uygulaması): <a download> WebView'da çalışmayabilir.
     Web Share destekleniyorsa paylaşım penceresi açılır — kullanıcı dosyayı
     Dosyalar/Drive/WhatsApp'a kaydedebilir. Başarısız olursa klasik indirmeye düşülür. */
  try {
    const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
    const native = cap?.isNativePlatform?.() ?? false;
    const coarse = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
    const nav = navigator as Navigator & {
      canShare?: (data: { files?: File[] }) => boolean;
      share?: (data: { files?: File[]; title?: string }) => Promise<void>;
    };
    if ((native || coarse) && typeof nav.canShare === 'function' && typeof nav.share === 'function') {
      const file = new File([blob], filename, { type: blob.type });
      if (nav.canShare({ files: [file] })) {
        nav.share({ files: [file], title: filename }).catch(() => {
          /* kullanıcı vazgeçti — sessiz çık */
        });
        return;
      }
    }
  } catch {
    /* desteklenmiyorsa klasik indirmeye düş */
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(()=>URL.revokeObjectURL(url),60_000);
}

export async function downloadBackup(filename: string, data: Partial<AppState>, scope: BackupScope) {
 const file=await collectBackupFile(data,scope);await downloadBackupFile(filename,file);
}
export async function downloadBackupFile(filename:string,file:BackupFile){
 const bytes=await zipBackup(file);downloadBlob(filename.replace(/\.json$/i,'.zip'),new Blob([bytes],{type:'application/zip'}));
}
