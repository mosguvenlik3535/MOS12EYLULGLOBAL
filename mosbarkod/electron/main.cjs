/**
 * MOSBARKODYAZILIM — Electron ana süreç
 * Windows (.exe) ve Linux (AppImage) masaüstü sürümleri için.
 *
 * Görevleri:
 *  - dist/ içindeki tek dosyalık uygulamayı yerel HTTP sunucusu üzerinden açar
 *    (http://127.0.0.1:8787 → güvenli bağlam, crypto.subtle + göreli fetch çalışır).
 *  - Aynı sunucu telefonların LAN'dan bağlanıp mobil kasa olmasını sağlar (/host-info).
 *  - IPC köprüleri: mosStore, mosEmail, mosSmtp (nodemailer), mosCloud (CORS'suz HTTP).
 */
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const os = require('os');
const net = require('net');
const crypto = require('crypto');

const HTTP_PORT = Number(process.env.MOSBARKOD_PORT) || 8787;
const ROOT = path.join(__dirname, '..', 'dist');
const PRELOAD = path.join(__dirname, 'preload.cjs');

/* ---------- hata kaydı ---------- */

function logCrash(err) {
  try {
    const dir = app.getPath('userData');
    fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(path.join(dir, 'startup-error.log'), `\n[${new Date().toISOString()}]\n${err?.stack || err}\n`, 'utf8');
  } catch {
    /* yoksay */
  }
}
process.on('uncaughtException', logCrash);
process.on('unhandledRejection', logCrash);

/* ---------- LAN / yerel HTTP sunucusu ---------- */

function lanIPs() {
  const out = [];
  const nets = os.networkInterfaces();
  for (const list of Object.values(nets)) {
    for (const iface of list || []) {
      if (iface.family === 'IPv4' && !iface.internal) out.push(iface.address);
    }
  }
  return out;
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
  '.exe': 'application/octet-stream',
  '.AppImage': 'application/octet-stream',
};

let httpServer = null;
function startServer() {
  if (httpServer) return;
  httpServer = http.createServer((req, res) => {
    try {
      if (req.url === '/host-info') {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ ips: lanIPs(), port: HTTP_PORT }));
        return;
      }
      const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
      // Statik dosyalar (ikonlar, manifest, sw, downloads)
      if (urlPath !== '/') {
        const p = path.join(ROOT, urlPath);
        if (fs.existsSync(p) && fs.statSync(p).isFile()) {
          const ext = path.extname(p).toLowerCase();
          res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
          res.end(fs.readFileSync(p));
          return;
        }
      }
      // SPA: her şey index.html'e düşer
      const idx = path.join(ROOT, 'index.html');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(fs.existsSync(idx) ? fs.readFileSync(idx) : '<h1>dist/index.html bulunamadı — önce npm run build</h1>');
    } catch (e) {
      res.statusCode = 500;
      res.end(String(e));
    }
  });
  httpServer.on('error', () => {
    /* port doluysa sessiz geç */
  });
  httpServer.listen(HTTP_PORT, '0.0.0.0');
}

/* ---------- kalıcı depo (lisans, POS kilit) ---------- */

function storeFile() {
  return path.join(app.getPath('userData'), 'mosbarkod-store.json');
}
function readStore() {
  try {
    return JSON.parse(fs.readFileSync(storeFile(), 'utf8'));
  } catch {
    return {};
  }
}
function writeStore(obj) {
  try {
    fs.writeFileSync(storeFile(), JSON.stringify(obj), 'utf8');
  } catch {
    /* yoksay */
  }
}

/* ---------- lisans kasası (şifreli + makineye bağlı, userData/mosbarkod-license.dat) ---------- */

function licenseFile() {
  return path.join(app.getPath('userData'), 'mosbarkod-license.dat');
}

/** Kasa anahtarı — uygulama + makine kimliğinden türetilir (ikili dosyada bulunmaz). */
function vaultKey() {
  const machine = process.env.COMPUTERNAME || process.env.HOSTNAME || os.hostname() || 'pos';
  const seed = 'MOSBARKOD-VAULT|' + machine + '|v2';
  return crypto.createHash('sha256').update(seed, 'utf8').digest();
}

/** AES-256-GCM ile şifrele — içerik düz metin okunamaz ve değiştirilemez (auth tag). */
function encryptVault(obj) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', vaultKey(), iv);
  const enc = Buffer.concat([cipher.update(JSON.stringify(obj), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { v: 2, iv: iv.toString('base64'), tag: tag.toString('base64'), data: enc.toString('base64') };
}

function decryptVault(raw) {
  try {
    const p = JSON.parse(raw);
    if (p && p.v === 2 && p.data && p.iv && p.tag) {
      const iv = Buffer.from(p.iv, 'base64');
      const tag = Buffer.from(p.tag, 'base64');
      const data = Buffer.from(p.data, 'base64');
      const d = crypto.createDecipheriv('aes-256-gcm', vaultKey(), iv);
      d.setAuthTag(tag);
      return JSON.parse(Buffer.concat([d.update(data), d.final()]).toString('utf8'));
    }
    return p; // eski düz JSON kaydı — bir sonraki yazımda şifrelenir
  } catch {
    return {};
  }
}

function readLicense() {
  try {
    return decryptVault(fs.readFileSync(licenseFile(), 'utf8'));
  } catch {
    return {};
  }
}
function writeLicense(obj) {
  try {
    fs.writeFileSync(licenseFile(), JSON.stringify(encryptVault(obj)), 'utf8');
  } catch {
    /* yoksay */
  }
}

/* ---------- lisans doğrulama (ana süreç — anahtar metni renderer'a inmez) ---------- */

const MAIN_SALT = 'MOSBARKOD·2026·PRO';
const MAIN_DIGEST = [
  'a7569f65', 'b55afef1', '98bd7414', '278953ef',
  '0736810a', '0a1390f9', '84ca2fd3', '95a27e24',
].join('');
const MAIN_CHECKSUM = 884;

function formatLicenseKey(clean) {
  return clean.slice(0, 3) + '-' + clean.slice(3, 7) + '-' + clean.slice(7, 11) + '-' + clean.slice(11, 15);
}

function isValidMainKey(raw) {
  const clean = String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 15);
  if (!/^MOS[A-Z0-9]{12}$/.test(clean)) return false;
  const payload = clean.slice(3);
  let s = 0;
  for (const ch of payload) s = (s + ch.charCodeAt(0) * 7) % 997;
  if (s !== MAIN_CHECKSUM) return false;
  const digest = crypto.createHash('sha256').update(MAIN_SALT + formatLicenseKey(clean), 'utf8').digest('hex');
  return digest === MAIN_DIGEST;
}

/* POS Entegrasyonu zincir anahtarı — XOR ile gizlenmiş, düz metin değildir. */
const POS_KEY = (() => {
  const x = [0x6b, 0x6f, 0x62, 0x62, 0x6b, 0x6f, 0x62, 0x62];
  const k = 0x5a;
  return x.map((c) => String.fromCharCode(c ^ k)).join('');
})();

const posCodes = () => [...POS_KEY].map((c) => c.charCodeAt(0));
const codesToKey = (codes) => codes.map((c) => String.fromCharCode(c)).join('');

/* ---------- e-posta gönderimi (Node tarafı, CORS yok) ---------- */

let nodemailer = null;
function getNodemailer() {
  if (nodemailer) return nodemailer;
  try {
    nodemailer = require('nodemailer');
  } catch {
    nodemailer = false;
  }
  return nodemailer;
}

async function smtpSend(payload) {
  const nm = getNodemailer();
  if (!nm) return { ok: false, error: 'nodemailer kurulu değil' };
  try {
    const { host, port, secure, user, pass, from, to, subject, text } = payload || {};
    const transport = nm.createTransport({
      host,
      port: Number(port) || 587,
      secure: Boolean(secure),
      auth: { user, pass },
      tls: secure ? {} : { rejectUnauthorized: false },
      connectionTimeout: 20000,
    });
    const info = await transport.sendMail({ from, to, subject, text });
    return { ok: true, messageId: info.messageId };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

async function apiSend(payload) {
  const {
    provider, serviceId, templateId, publicKey, privateKey, subject, message,
    fromName, toEmail, fromEmail, domain,
  } = payload || {};
  const from = fromEmail || 'noreply@mosbarkod.app';
  const name = fromName || 'MOSBARKODYAZILIM';
  const httpError = async (res) => {
    const txt = await res.text().catch(() => '');
    return { ok: false, error: `HTTP ${res.status}: ${txt.slice(0, 160) || res.statusText}` };
  };
  try {
    switch (provider) {
      case 'resend': {
        if (!privateKey) return { ok: false, error: 'Resend API Key gereklidir' };
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${privateKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ from: `${name} <${from}>`, to: [toEmail], subject, text: message }),
        });
        return res.ok ? { ok: true } : await httpError(res);
      }
      case 'sendgrid': {
        if (!privateKey) return { ok: false, error: 'SendGrid API Key gereklidir' };
        const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: { Authorization: `Bearer ${privateKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: toEmail }] }],
            from: { email: from, name },
            subject,
            content: [{ type: 'text/plain', value: message }],
          }),
        });
        return res.status >= 200 && res.status < 300 ? { ok: true } : await httpError(res);
      }
      case 'mailgun': {
        if (!privateKey || !domain) return { ok: false, error: 'Mailgun API Key ve Domain gereklidir' };
        const body = new URLSearchParams();
        body.set('from', `${name} <${from}>`);
        body.set('to', toEmail);
        body.set('subject', subject);
        body.set('text', message);
        const res = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
          method: 'POST',
          headers: {
            Authorization: `Basic ${Buffer.from(`api:${privateKey}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body,
        });
        return res.ok ? { ok: true } : await httpError(res);
      }
      case 'mailjet': {
        if (!publicKey || !privateKey) return { ok: false, error: 'Mailjet API Key ve Secret Key gereklidir' };
        const res = await fetch('https://api.mailjet.com/v3.1/send', {
          method: 'POST',
          headers: {
            Authorization: `Basic ${Buffer.from(`${publicKey}:${privateKey}`).toString('base64')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            Messages: [{ From: { Email: from, Name: name }, To: [{ Email: toEmail }], Subject: subject, TextPart: message }],
          }),
        });
        return res.ok ? { ok: true } : await httpError(res);
      }
      case 'brevo': {
        if (!privateKey) return { ok: false, error: 'Brevo API Key gereklidir' };
        const res = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: { 'api-key': privateKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sender: { name, email: from },
            to: [{ email: toEmail }],
            subject,
            textContent: message,
          }),
        });
        return res.ok ? { ok: true } : await httpError(res);
      }
      case 'smtp2go': {
        if (!privateKey) return { ok: false, error: 'SMTP2GO API Key gereklidir' };
        const res = await fetch('https://api.smtp2go.com/v3/email/send', {
          method: 'POST',
          headers: { 'X-Smtp2go-Api-Key': privateKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: [toEmail], sender: from, subject, text_body: message }),
        });
        return res.ok ? { ok: true } : await httpError(res);
      }
      case 'emailjs':
      default: {
        if (!serviceId || !templateId || !publicKey) {
          return { ok: false, error: 'EmailJS için Service ID, Template ID ve Public Key gereklidir' };
        }
        const headers = { 'Content-Type': 'application/json' };
        if (privateKey) headers.Authorization = `Bearer ${privateKey}`;
        const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            service_id: serviceId,
            template_id: templateId,
            user_id: publicKey,
            template_params: { subject, message, from_name: name, to_email: toEmail },
          }),
        });
        return res.ok ? { ok: true } : await httpError(res);
      }
    }
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

/* ---------- IPC ---------- */

ipcMain.handle('mos-store', (_evt, { action, key, value } = {}) => {
  const store = readStore();
  if (action === 'get') return store[key] ?? null;
  if (action === 'set') {
    store[key] = value;
    writeStore(store);
    return { ok: true };
  }
  if (action === 'del') {
    delete store[key];
    writeStore(store);
    return { ok: true };
  }
  return { ok: false, error: 'unknown action' };
});

ipcMain.handle('mos-license', (_evt, { action, patch } = {}) => {
  if (action === 'read') return readLicense();
  if (action === 'write') {
    const merged = { ...readLicense(), ...(patch || {}) };
    writeLicense(merged);
    return { ok: true, data: merged };
  }
  return { ok: false, error: 'unknown action' };
});

ipcMain.handle('mos-license-verify', (_evt, { key } = {}) => ({ ok: isValidMainKey(key) }));

ipcMain.handle('mos-license-activate', (_evt, { key } = {}) => {
  if (!isValidMainKey(key)) return { ok: false };
  const lic = readLicense();
  lic.main = true;
  lic.mainTs = new Date().toISOString();
  writeLicense(lic);
  return { ok: true };
});

ipcMain.handle('mos-license-status', () => ({ main: Boolean(readLicense().main) }));

ipcMain.handle('mos-license-ensure', () => {
  const lic = readLicense();
  if (lic.k && Array.isArray(lic.k) && lic.k.length >= 8) {
    return { key: codesToKey(lic.k), codes: lic.k };
  }
  const codes = posCodes();
  lic.k = codes;
  writeLicense(lic);
  return { key: POS_KEY, codes };
});

ipcMain.handle('mos-email-send', async (_evt, payload) => {
  if (payload?.provider === 'smtp') return await smtpSend(payload);
  return await apiSend(payload);
});

ipcMain.handle('mos-smtp', async (_evt, payload) => await smtpSend(payload));

ipcMain.handle('mos-cloud-http', async (_evt, req) => {
  try {
    const { url, method = 'GET', headers = {}, body } = req || {};
    const res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? body : undefined,
      redirect: 'follow',
    });
    return { status: res.status, body: await res.text() };
  } catch (e) {
    return { status: 0, body: String(e) };
  }
});

ipcMain.handle('mos-host-info', () => ({ ips: lanIPs(), port: HTTP_PORT }));

/* ---------- ESC/POS termal yazıcı (TCP 9100) ---------- */

function sendRawTcp(ip, port, base64) {
  return new Promise((resolve) => {
    let data;
    try {
      data = Buffer.from(base64, 'base64');
    } catch (e) {
      resolve({ ok: false, error: 'Geçersiz veri: ' + String(e) });
      return;
    }
    const sock = net.createConnection({ host: ip, port: Number(port) || 9100, timeout: 5000 });
    let settled = false;
    const done = (r) => {
      if (settled) return;
      settled = true;
      try { sock.destroy(); } catch { /* yoksay */ }
      resolve(r);
    };
    sock.on('connect', () => sock.write(data, () => done({ ok: true })));
    sock.on('error', (e) => done({ ok: false, error: String(e && e.message ? e.message : e) }));
    sock.on('timeout', () => done({ ok: false, error: 'Yazıcıya bağlanılamadı (zaman aşımı)' }));
  });
}

ipcMain.handle('mos-print-tcp', async (_evt, { ip, port, data } = {}) => {
  if (!ip || !data) return { ok: false, error: 'Yazıcı adresi veya veri eksik' };
  return await sendRawTcp(ip, port, data);
});

/* ---------- pencere ---------- */

function createWindow() {
  const win = new BrowserWindow({
    width: 1366,
    height: 768,
    minWidth: 1024,
    minHeight: 650,
    title: 'MOS POS: Barkod Satış ve Stok',
    backgroundColor: '#0a0e13',
    autoHideMenuBar: true,
    icon: path.join(ROOT, 'icons', 'icon-512.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: PRELOAD,
    },
  });
  // macOS keeps the app/server alive when the last window is closed (Dock reopen).
  if (process.platform !== 'darwin') win.on('close', () => app.quit());
  win.loadURL(`http://127.0.0.1:${HTTP_PORT}/`).catch(() => win.loadFile(path.join(ROOT, 'index.html')));
}

app.whenReady().then(() => {
  startServer();
  createWindow();
});
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
app.on('before-quit', () => {
  try {
    httpServer?.close();
  } catch {
    /* yoksay */
  }
});
