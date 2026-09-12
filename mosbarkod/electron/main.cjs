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

/* ---------- pencere ---------- */

function createWindow() {
  const win = new BrowserWindow({
    width: 1366,
    height: 768,
    minWidth: 1024,
    minHeight: 650,
    title: 'MOSBARKODYAZILIM - Yapay Zeka Destekli Barkod Satış Programı',
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
  win.on('close', () => app.quit());
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
