#!/usr/bin/env node
/**
 * MOSBARKOD — TESTÇİ LİSANSI ÜRETİCİ
 * -----------------------------------
 * Testçinin telefonunda görünen CİHAZ KODUNU alır, gizli anahtarla imzalayıp
 * ETKİNLEŞTİRME KODU üretir. Üretilen kod YALNIZCA o telefonda çalışır.
 *
 * KULLANIM
 *   node tools/tester-license.mjs --device MOS-3F2A-9C11-7B04 --name "Ahmet Yılmaz"
 *   node tools/tester-license.mjs --device 3F2A9C117B04 --months 12
 *   node tools/tester-license.mjs --device ABC --device DEF     (birden fazla)
 *   node tools/tester-license.mjs --liste cihazlar.txt
 *
 * SEÇENEKLER
 *   --device / -d   Cihaz kodu (tekrarlanabilir)
 *   --name / -n     Testçinin adı (yalnızca kayıt için, koda girmez)
 *   --months / -m   Kaç ay geçerli olsun (varsayılan 12)
 *   --exp           Bitiş tarihi (GG.AA.YYYY) — verilirse --months yok sayılır
 *   --key           Gizli anahtar dosyası (varsayılan tools/tester-private.key)
 *   --liste         Her satırda "CihazKodu, Ad" yazan metin dosyası
 *
 * ÖNEMLİ
 *   • tester-private.key ASLA paylaşılmaz ve depoya yüklenmez (.gitignore'da).
 *   • Bu dosyayı kaybederseniz eski kodları doğrulayamazsınız → YEDEKLEYİN.
 *   • Kodlar tools/tester-kayitlari.csv dosyasına da yazılır (kayıt defteri).
 */

import { createPrivateKey, createSign } from 'node:crypto';
import { readFileSync, appendFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const PREFIX = 'MTEST1';
const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_KEY = join(HERE, 'tester-private.key');
const LOG = join(HERE, 'tester-kayitlari.csv');

/* ---------------- argümanlar ---------------- */
const argv = process.argv.slice(2);
const opts = { devices: [], names: [], months: 12, exp: '', key: DEFAULT_KEY, liste: '' };

for (let i = 0; i < argv.length; i += 1) {
  const a = argv[i];
  const next = () => argv[++i] ?? '';
  switch (a) {
    case '--device':
    case '-d':
      opts.devices.push(next());
      break;
    case '--name':
    case '-n':
      opts.names.push(next());
      break;
    case '--months':
    case '-m':
      opts.months = Number(next()) || 12;
      break;
    case '--exp':
      opts.exp = next();
      break;
    case '--key':
      opts.key = next();
      break;
    case '--liste':
      opts.liste = next();
      break;
    case '--help':
    case '-h':
      console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('*/')[0]);
      process.exit(0);
      break;
    default:
      if (!a.startsWith('-')) opts.devices.push(a);
      break;
  }
}

/* ---------------- liste dosyası ---------------- */
if (opts.liste) {
  if (!existsSync(opts.liste)) fail(`Liste dosyası bulunamadı: ${opts.liste}`);
  const lines = readFileSync(opts.liste, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const [d, ...rest] = t.split(/[,\t;]/);
    opts.devices.push(d.trim());
    opts.names.push(rest.join(',').trim());
  }
}

if (!opts.devices.length) {
  fail('Cihaz kodu gerekli. Örnek: node tools/tester-license.mjs --device MOS-3F2A-9C11-7B04');
}

/* ---------------- yardımcılar ---------------- */
function fail(msg) {
  console.error(`\n  ✗ ${msg}\n`);
  process.exit(1);
}

const pad = (n) => String(n).padStart(2, '0');
const yymmdd = (d) => `${String(d.getFullYear()).slice(2)}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
const trDate = (d) => `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;

function addMonths(d, m) {
  const x = new Date(d.getTime());
  x.setMonth(x.getMonth() + m);
  return x;
}

function parseTrDate(s) {
  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(s.trim());
  if (!m) fail(`Tarih GG.AA.YYYY biçiminde olmalı: ${s}`);
  return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
}

/** "MOS-3F2A-9C11-7B04" → "3F2A9C117B04" */
function normalizeDevice(raw) {
  const hex = String(raw || '')
    .toUpperCase()
    .replace(/[^A-F0-9]/g, '')
    .slice(0, 12);
  if (hex.length !== 12) {
    fail(`Cihaz kodu 12 haneli olmalı (MOS-XXXX-XXXX-XXXX): "${raw}"`);
  }
  return hex;
}

function prettyDevice(hex) {
  return `MOS-${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}`;
}

/* ---------------- imzalama ---------------- */
/* Uygulama WebCrypto (ECDSA + SHA-256) ile doğrular; o da imzayı ham
   r||s (P1363) biçiminde bekler. Node'un varsayılan DER çıktısını değil,
   doğrudan WebCrypto'nun çıktısını kullanıyoruz — böylece biçim uyuşmazlığı
   olmaz. */
async function loadSigner(pemPath) {
  const keyObj = createPrivateKey(readFileSync(pemPath, 'utf8'));
  const der = keyObj.export({ type: 'pkcs8', format: 'der' });
  return crypto.subtle.importKey(
    'pkcs8',
    der,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );
}

async function signPayload(signer, payload) {
  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    signer,
    new TextEncoder().encode(payload),
  );
  return Buffer.from(sig).toString('base64url');
}

let privateKey;
try {
  privateKey = await loadSigner(opts.key);
} catch (e) {
  fail(
    `Gizli anahtar okunamadı: ${opts.key}\n` +
      `  Dosya var mı? Kaybettiyseniz yeni anahtar üretmeniz ve uygulamadaki\n` +
      `  GENEL anahtarı güncellemeniz gerekir. (${e.message})`,
  );
}

const today = new Date();
const issue = yymmdd(today);
const expDate = opts.exp ? parseTrDate(opts.exp) : addMonths(today, opts.months);
const exp = yymmdd(expDate);

console.log('\n══════════════════════════════════════════════════════════════');
console.log('  MOSBARKOD — TESTÇİ LİSANSI ÜRETİCİ');
console.log(`  Veriliş: ${trDate(today)}   Bitiş: ${trDate(expDate)}`);
console.log('══════════════════════════════════════════════════════════════\n');

const rows = [];
for (let i = 0; i < opts.devices.length; i += 1) {
  const devRaw = opts.devices[i];
  const hex = normalizeDevice(devRaw);
  const name = (opts.names[i] || opts.names[0] || '').trim();
  const payload = `${PREFIX}.${hex}.${issue}.${exp}`;

  let sig;
  try {
    sig = await signPayload(privateKey, payload);
  } catch (e) {
    fail(`İmzalanamadı: ${e.message}`);
  }
  const code = `${payload}.${sig}`;

  console.log(`  ${name ? name : `Testçi ${i + 1}`}  ·  ${prettyDevice(hex)}`);
  console.log('  ─────────────────────────────────────────────────────────────');
  console.log(`  ${code}`);
  console.log('');
  rows.push([trDate(today), trDate(expDate), prettyDevice(hex), name, code].join(';'));
}

/* ---------------- kayıt defteri ---------------- */
try {
  if (!existsSync(LOG)) {
    appendFileSync(LOG, 'verilis;bitis;cihaz;ad;kod\n', 'utf8');
  }
  appendFileSync(LOG, rows.join('\n') + '\n', 'utf8');
  console.log(`  ✓ Kayıt defteri: ${LOG}`);
} catch (e) {
  console.error(`  ! Kayıt defterine yazılamadı: ${e.message}`);
}

console.log(`\n  Toplam ${rows.length} kod üretildi.`);
console.log('  Her kod YALNIZCA kendisinin kesildiği telefonda çalışır.\n');
