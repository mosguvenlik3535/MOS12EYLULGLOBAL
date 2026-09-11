import { defaultSettings, defaultState, type AppState, type Settings } from '../data';

/**
 * Yedekleme motoru — sürümlü, checksum imzalı, dönen (rotasyonlu) anlık görüntüler.
 *
 * Özellikler:
 *  - Her yedek: tür, sürüm, tarih, checksum ve kapsam bilgisi taşır.
 *  - Otomatik yedekler localStorage'da dönen arşiv olarak tutulur (tek anahtar üzerine yazılmaz).
 *  - keepDays'e göre eski arşivler otomatik temizlenir; ayrıca MAX_SNAPSHOTS sınırı vardır.
 *  - İçe aktarma: eski düz JSON dışa aktarmaları da destekler, checksum doğrular.
 */

export const BACKUP_KIND = 'MOSBARKOD-BACKUP';
export const BACKUP_VERSION = 2;
export const MAX_SNAPSHOTS = 30;

const INDEX_KEY = 'mosbarkod_backup_index';
const LATEST_KEY = 'mosbarkod_auto_backup'; // eski sürümle geriye dönük uyumluluk
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

export function createSnapshot(
  data: AppState,
  source: BackupSource,
  keepDays: number
): BackupMeta | null {
  const createdAt = new Date().toISOString();
  const file = buildBackupFile(data, 'full', createdAt);
  const id = stampId(new Date(createdAt));
  const text = JSON.stringify(file);
  let ok = trySet(snapKey(id), text);
  if (!ok) {
    dropOldest(3); // kota dolduysa en eskileri düşürüp tekrar dene
    ok = trySet(snapKey(id), text);
  }
  if (!ok) return null;
  const meta: BackupMeta = {
    id,
    createdAt,
    size: text.length,
    checksum: file.checksum,
    source,
    scope: 'full',
    version: BACKUP_VERSION,
  };
  const list = listBackups();
  list.unshift(meta);
  writeIndex(list);
  if (source === 'auto') trySet(LATEST_KEY, text);
  pruneBackups(keepDays);
  return meta;
}

function dropOldest(n: number) {
  const list = listBackups(); // en yeni önce
  const targets = list.slice(-n);
  for (const t of targets) {
    try {
      localStorage.removeItem(snapKey(t.id));
    } catch {
      /* ignore */
    }
  }
  writeIndex(list.filter((m) => !targets.some((t) => t.id === m.id)));
}

/* ---------- okuma / geri yükleme ---------- */

export function readBackup(id: string): BackupFile | null {
  try {
    const raw = localStorage.getItem(snapKey(id));
    if (!raw) return null;
    return JSON.parse(raw) as BackupFile;
  } catch {
    return null;
  }
}

export function deleteBackup(id: string) {
  try {
    localStorage.removeItem(snapKey(id));
  } catch {
    /* ignore */
  }
  writeIndex(readIndex().filter((m) => m.id !== id));
}

/* ---------- temizlik ---------- */

export function pruneBackups(keepDays: number) {
  const cutoff = Date.now() - Math.max(1, keepDays) * 86400000;
  const list = readIndex().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const expired = list.filter((m) => new Date(m.createdAt).getTime() < cutoff);
  const overflow = list.slice(MAX_SNAPSHOTS);
  const toDelete = new Set([...expired, ...overflow].map((m) => m.id));
  for (const id of toDelete) {
    try {
      localStorage.removeItem(snapKey(id));
    } catch {
      /* ignore */
    }
  }
  writeIndex(list.filter((m) => !toDelete.has(m.id)));
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
  merged.invoices = Array.isArray(merged.invoices) ? merged.invoices : [];
  merged.staff = Array.isArray(merged.staff) ? merged.staff : [];
  merged.cashMoves = Array.isArray(merged.cashMoves) ? merged.cashMoves : [];
  merged.posCloses = Array.isArray(merged.posCloses) ? merged.posCloses : [];
  if (!merged.imkart || !Array.isArray(merged.imkart.txns)) merged.imkart = { limit: 0, txns: [] };
  merged.settings = { ...defaultSettings(), ...(merged.settings || {}) };
  return merged;
}

export type ParseResult =
  | { ok: true; scope: BackupScope; data: AppState }
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
  return { ok: true, scope, data };
}

/* ---------- indirme ---------- */

export function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadBackup(filename: string, data: Partial<AppState>, scope: BackupScope) {
  downloadText(filename, serializeBackup(data, scope));
}
