import type { AppState, Settings } from '../data';
import { serializeBackup } from './backup';

/**
 * Bulut yedekleme — Google Drive & Dropbox.
 *
 * Mimari:
 *  - Tüm HTTP istekleri `httpRequest` üzerinden gider; .exe (Electron) tarafında
 *    `window.mosCloud.http` köprüsü kullanılır (CORS yok), tarayıcı/PWA'da doğrudan fetch.
 *  - Google Drive tarayıcıdan da çalışır (CORS destekli). Dropbox API'si tarayıcıdan CORS
 *    engeline takılır; Dropbox .exe (köprü) üzerinden çalışır.
 *  - Şifreleme: AES-GCM (PBKDF2 ile anahtar türetme) + gzip sıkıştırma.
 *    Buluta yalnızca şifreli paket gider; sağlayıcı içeriği okuyamaz.
 */

export type CloudProviderId = 'gdrive' | 'dropbox';
export type CloudCfg = Settings['cloud'];

export interface CloudFile {
  id: string;
  name: string;
  size: number;
  modified: string;
}

const MAGIC = 'MOSBCLD';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const DRIVE_UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
const DRIVE_FILES = 'https://www.googleapis.com/drive/v3/files';
const DROPBOX_UPLOAD = 'https://content.dropboxapi.com/2/files/upload';
const DROPBOX_LIST = 'https://api.dropboxapi.com/2/files/list_folder';
const DROPBOX_DOWNLOAD = 'https://content.dropboxapi.com/2/files/download';
const DROPBOX_MKDIR = 'https://api.dropboxapi.com/2/files/create_folder_v2';

declare global {
  interface Window {
    mosCloud?: {
      http: (req: {
        url: string;
        method?: string;
        headers?: Record<string, string>;
        body?: string;
      }) => Promise<{ status: number; body: string }>;
    };
  }
}

/* ---------- genel HTTP (köprü öncelikli) ---------- */

interface HttpResponse {
  status: number;
  body: string;
}

async function httpRequest(req: {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}): Promise<HttpResponse> {
  const bridge = typeof window !== 'undefined' ? window.mosCloud?.http : undefined;
  if (bridge) {
    return await bridge(req);
  }
  const res = await fetch(req.url, {
    method: req.method || 'GET',
    headers: req.headers,
    body: req.body,
  });
  return { status: res.status, body: await res.text() };
}

function assertOk(r: HttpResponse, label: string): void {
  if (r.status < 200 || r.status >= 300) {
    let msg = r.body.slice(0, 200);
    try {
      const j = JSON.parse(r.body);
      msg = j.error_summary || j.error_description || j.error?.message || j.error || msg;
    } catch {
      /* raw */
    }
    throw new Error(`${label} (HTTP ${r.status}): ${msg}`);
  }
}

/* ---------- şifreleme + sıkıştırma ---------- */

const te = new TextEncoder();
const td = new TextDecoder();

async function deriveKey(pass: string): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey('raw', te.encode(pass), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: te.encode('mosbarkod-cloud-v1'), iterations: 120000, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

function bytesToBase64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(s);
}

function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function gzip(text: string): Promise<Uint8Array<ArrayBuffer> | null> {
  try {
    if (typeof CompressionStream === 'undefined') return null;
    const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
    const buf = await new Response(stream).arrayBuffer();
    return new Uint8Array(buf);
  } catch {
    return null;
  }
}

async function gunzip(bytes: Uint8Array<ArrayBuffer>): Promise<string> {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  const buf = await new Response(stream).arrayBuffer();
  return td.decode(buf);
}

function ensureSubtle(): void {
  if (!crypto?.subtle) throw new Error('Şifreleme bu ortamda desteklenmiyor (güvenli bağlam gerekli)');
}

/** Şifreli paket: base64( iv || AES-GCM(MAGIC + ver(1B) + [gzip|raw]) ) */
export async function encryptCloudText(text: string, pass: string): Promise<string> {
  ensureSubtle();
  const gz = await gzip(text);
  const payload = gz ?? te.encode(text);
  const plain = new Uint8Array(MAGIC.length + 1 + payload.length);
  plain.set(te.encode(MAGIC), 0);
  plain[MAGIC.length] = gz ? 1 : 0;
  plain.set(payload, MAGIC.length + 1);
  const key = await deriveKey(pass);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plain));
  const out = new Uint8Array(iv.length + cipher.length);
  out.set(iv, 0);
  out.set(cipher, iv.length);
  return bytesToBase64(out);
}

export async function decryptCloudText(payload: string, pass: string): Promise<string> {
  ensureSubtle();
  const raw = base64ToBytes(payload.trim());
  const iv = raw.subarray(0, 12);
  const cipher = raw.subarray(12);
  const key = await deriveKey(pass);
  const plain = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher));
  if (td.decode(plain.subarray(0, MAGIC.length)) !== MAGIC) {
    throw new Error('Şifre çözülemedi — parola yanlış olabilir');
  }
  const version = plain[MAGIC.length];
  const body = plain.subarray(MAGIC.length + 1);
  if (version === 1) return await gunzip(body);
  return td.decode(body);
}

/* ---------- paketleme ---------- */

function passOf(cfg: CloudCfg): string {
  return (cfg.encryptPass || '').trim() || 'mosbarkod';
}

export async function packForCloud(data: AppState, cfg: CloudCfg): Promise<{ blob: Blob; name: string }> {
  const json = serializeBackup(data, 'full');
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
  if (cfg.encrypt) {
    const payload = await encryptCloudText(json, passOf(cfg));
    return { blob: new Blob([payload], { type: 'application/octet-stream' }), name: `mosbarkod-${stamp}.mosbc` };
  }
  return { blob: new Blob([json], { type: 'application/json' }), name: `mosbarkod-${stamp}.json` };
}

export async function unpackFromCloud(text: string, cfg: CloudCfg): Promise<string> {
  return cfg.encrypt ? await decryptCloudText(text, passOf(cfg)) : text;
}

/* ---------- Google Drive ---------- */

async function googleAccessToken(cfg: CloudCfg): Promise<string> {
  if (!cfg.gdriveClientId || !cfg.gdriveClientSecret || !cfg.gdriveRefreshToken) {
    throw new Error('Google Drive için Client ID, Client Secret ve Refresh Token gerekli');
  }
  const body = new URLSearchParams({
    client_id: cfg.gdriveClientId,
    client_secret: cfg.gdriveClientSecret,
    refresh_token: cfg.gdriveRefreshToken,
    grant_type: 'refresh_token',
  });
  const r = await httpRequest({
    url: TOKEN_URL,
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  assertOk(r, 'Google token yenileme');
  const j = JSON.parse(r.body);
  if (!j.access_token) throw new Error('Google token yanıtı geçersiz');
  return j.access_token as string;
}

async function googleFolderId(accessToken: string, name: string): Promise<string | null> {
  if (!name) return null;
  const q = encodeURIComponent(
    `name = '${name.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
  );
  const list = await httpRequest({
    url: `${DRIVE_FILES}?q=${q}&pageSize=5&fields=files(id,name)`,
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  assertOk(list, 'Google klasör arama');
  const j = JSON.parse(list.body);
  if (j.files && j.files.length) return j.files[0].id;
  const create = await httpRequest({
    url: DRIVE_FILES,
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, mimeType: 'application/vnd.google-apps.folder' }),
  });
  assertOk(create, 'Google klasör oluşturma');
  const cj = JSON.parse(create.body);
  return cj.id ?? null;
}

async function googleUpload(accessToken: string, name: string, content: string, folderId: string | null) {
  const boundary = `mosbarkod_${Math.random().toString(36).slice(2)}`;
  const meta = JSON.stringify({
    name,
    ...(folderId ? { parents: [folderId] } : {}),
  });
  const body = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n` +
    `--${boundary}\r\nContent-Type: application/octet-stream\r\n\r\n${content}\r\n` +
    `--${boundary}--`;
  const r = await httpRequest({
    url: DRIVE_UPLOAD,
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  });
  assertOk(r, 'Google Drive yükleme');
  return JSON.parse(r.body) as { id: string; name: string; size?: string };
}

/* ---------- Dropbox ---------- */

function dropboxPath(cfg: CloudCfg, name?: string): string {
  const base = cfg.folder ? (cfg.folder.startsWith('/') ? cfg.folder : `/${cfg.folder}`) : '';
  const clean = base.replace(/\/+$/, '');
  return name ? `${clean}/${name}` : clean || '';
}

async function dropboxEnsureFolder(cfg: CloudCfg): Promise<void> {
  const path = dropboxPath(cfg);
  if (!path) return;
  const r = await httpRequest({
    url: DROPBOX_MKDIR,
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg.dropboxToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, autorename: false }),
  });
  // Zaten var ise sorun değil.
  if (r.status >= 200 && r.status < 300) return;
  try {
    const j = JSON.parse(r.body);
    if (j?.error_summary?.includes('path/conflict')) return;
  } catch {
    /* ignore */
  }
  assertOk(r, 'Dropbox klasör oluşturma');
}

async function dropboxUpload(cfg: CloudCfg, name: string, content: string) {
  const path = dropboxPath(cfg, name);
  const r = await httpRequest({
    url: DROPBOX_UPLOAD,
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cfg.dropboxToken}`,
      'Content-Type': 'application/octet-stream',
      'Dropbox-API-Arg': JSON.stringify({ path, mode: 'overwrite', autorename: true, mute: true }),
    },
    body: content,
  });
  assertOk(r, 'Dropbox yükleme');
  return JSON.parse(r.body) as { name: string; size: number };
}

/* ---------- üst düzey işlemler ---------- */

export async function cloudUpload(cfg: CloudCfg, data: AppState): Promise<{ ok: boolean; error?: string }> {
  try {
    const { blob, name } = await packForCloud(data, cfg);
    const content = await blob.text();
    if (cfg.provider === 'gdrive') {
      const token = await googleAccessToken(cfg);
      const folderId = await googleFolderId(token, cfg.folder);
      await googleUpload(token, name, content, folderId);
    } else if (cfg.provider === 'dropbox') {
      if (!cfg.dropboxToken) throw new Error('Dropbox Access Token gerekli');
      await dropboxEnsureFolder(cfg);
      await dropboxUpload(cfg, name, content);
    } else {
      return { ok: false, error: 'Sağlayıcı seçilmedi' };
    }
    return { ok: true };
  } catch (e) {
    const msg = String(e instanceof Error ? e.message : e);
    if (msg.includes('CORS') || msg.includes('Failed to fetch')) {
      return {
        ok: false,
        error: 'Bu sağlayıcı tarayıcıdan CORS engeline takıldı — .exe (masaüstü) sürümünde çalışır.',
      };
    }
    return { ok: false, error: msg };
  }
}

export async function cloudList(cfg: CloudCfg): Promise<{ ok: boolean; files?: CloudFile[]; error?: string }> {
  try {
    if (cfg.provider === 'gdrive') {
      const token = await googleAccessToken(cfg);
      const folderId = await googleFolderId(token, cfg.folder);
      const q = `name contains 'mosbarkod' and trashed = false${folderId ? ` and '${folderId}' in parents` : ''}`;
      const r = await httpRequest({
        url: `${DRIVE_FILES}?q=${encodeURIComponent(q)}&orderBy=modifiedTime desc&pageSize=30&fields=files(id,name,size,modifiedTime)`,
        headers: { Authorization: `Bearer ${token}` },
      });
      assertOk(r, 'Google Drive listeleme');
      const j = JSON.parse(r.body);
      const files: CloudFile[] = (j.files || []).map((f: any) => ({
        id: f.id,
        name: f.name,
        size: Number(f.size || 0),
        modified: f.modifiedTime || '',
      }));
      return { ok: true, files };
    }
    if (cfg.provider === 'dropbox') {
      if (!cfg.dropboxToken) throw new Error('Dropbox Access Token gerekli');
      const path = dropboxPath(cfg) || '';
      const r = await httpRequest({
        url: DROPBOX_LIST,
        method: 'POST',
        headers: { Authorization: `Bearer ${cfg.dropboxToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, recursive: false, limit: 30 }),
      });
      assertOk(r, 'Dropbox listeleme');
      const j = JSON.parse(r.body);
      const files: CloudFile[] = (j.entries || [])
        .filter((e: any) => e['.tag'] === 'file')
        .map((e: any) => ({
          id: e.path_lower || e.id || e.name,
          name: e.name,
          size: Number(e.size || 0),
          modified: e.server_modified || '',
        }))
        .sort((a: CloudFile, b: CloudFile) => (a.modified < b.modified ? 1 : -1));
      return { ok: true, files };
    }
    return { ok: false, error: 'Sağlayıcı seçilmedi' };
  } catch (e) {
    const msg = String(e instanceof Error ? e.message : e);
    if (msg.includes('CORS') || msg.includes('Failed to fetch')) {
      return { ok: false, error: 'Bu sağlayıcı tarayıcıdan CORS engeline takıldı — .exe (masaüstü) sürümünde çalışır.' };
    }
    return { ok: false, error: msg };
  }
}

export async function cloudDownloadText(cfg: CloudCfg, file: CloudFile): Promise<string> {
  if (cfg.provider === 'gdrive') {
    const token = await googleAccessToken(cfg);
    const r = await httpRequest({
      url: `${DRIVE_FILES}/${encodeURIComponent(file.id)}?alt=media`,
      headers: { Authorization: `Bearer ${token}` },
    });
    assertOk(r, 'Google Drive indirme');
    return r.body;
  }
  if (cfg.provider === 'dropbox') {
    const r = await httpRequest({
      url: DROPBOX_DOWNLOAD,
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.dropboxToken}`,
        'Content-Type': 'text/plain; charset=dropbox-cors-hack',
        'Dropbox-API-Arg': JSON.stringify({ path: file.id }),
      },
    });
    assertOk(r, 'Dropbox indirme');
    return r.body;
  }
  throw new Error('Sağlayıcı seçilmedi');
}
