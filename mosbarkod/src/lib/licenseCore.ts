/**
 * MOSBARKOD — Lisans doğrulama çekirdeği (saf, test edilebilir).
 *
 * AMAÇ: Lisans anahtarı ikili dosyada (EXE / APK / AppImage) DÜZ METİN olarak
 * bulunamaz. Doğrulama; format + sağlama (checksum) + tuzlanmış SHA-256 özeti
 * üzerinden yapılır. Özet değeri parçalara bölünüp karıştırılmış olarak saklanır;
 * böylece `strings` gibi araçlarla anahtar ya da tek parça özet bulunamaz.
 *
 * Gerçek doğrulama masaüstünde Electron ANA SÜRECİNDE de tekrarlanır
 * (electron/main.cjs → mos-license-verify). Buradaki kod web/APK yedeğidir.
 */

/* ------------------------------------------------------------------ */
/*  SHA-256 (senkron, saf JS — WebCrypto gerektirmez)                  */
/* ------------------------------------------------------------------ */

function rotr(x: number, n: number): number {
  return (x >>> n) | (x << (32 - n));
}

export function sha256hex(input: string): string {
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];

  // UTF-8 kodlama
  const bytes: number[] = [];
  for (const ch of input) {
    const cp = ch.codePointAt(0)!;
    if (cp < 0x80) bytes.push(cp);
    else if (cp < 0x800) bytes.push(0xc0 | (cp >> 6), 0x80 | (cp & 0x3f));
    else if (cp < 0x10000) bytes.push(0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
    else bytes.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 0x3f), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
  }

  const bitLen = bytes.length * 8;
  const bitLenHi = Math.floor(bitLen / 0x100000000);
  const bitLenLo = bitLen >>> 0;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  bytes.push(
    (bitLenHi >>> 24) & 0xff, (bitLenHi >>> 16) & 0xff, (bitLenHi >>> 8) & 0xff, bitLenHi & 0xff,
    (bitLenLo >>> 24) & 0xff, (bitLenLo >>> 16) & 0xff, (bitLenLo >>> 8) & 0xff, bitLenLo & 0xff
  );

  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;

  const w = new Array<number>(64);
  for (let i = 0; i < bytes.length; i += 64) {
    for (let t = 0; t < 16; t++) {
      w[t] = ((bytes[i + t * 4] << 24) | (bytes[i + t * 4 + 1] << 16) | (bytes[i + t * 4 + 2] << 8) | bytes[i + t * 4 + 3]) >>> 0;
    }
    for (let t = 16; t < 64; t++) {
      const s0 = rotr(w[t - 15], 7) ^ rotr(w[t - 15], 18) ^ (w[t - 15] >>> 3);
      const s1 = rotr(w[t - 2], 17) ^ rotr(w[t - 2], 19) ^ (w[t - 2] >>> 10);
      w[t] = (w[t - 16] + s0 + w[t - 7] + s1) >>> 0;
    }
    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, hh = h7;
    for (let t = 0; t < 64; t++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (hh + S1 + ch + K[t] + w[t]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;
      hh = g; g = f; f = e; e = (d + temp1) >>> 0; d = c; c = b; b = a; a = (temp1 + temp2) >>> 0;
    }
    h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0; h5 = (h5 + f) >>> 0; h6 = (h6 + g) >>> 0; h7 = (h7 + hh) >>> 0;
  }

  const hex = (n: number) => n.toString(16).padStart(8, '0');
  return hex(h0) + hex(h1) + hex(h2) + hex(h3) + hex(h4) + hex(h5) + hex(h6) + hex(h7);
}

/* ------------------------------------------------------------------ */
/*  Gizli malzeme — parçalara bölünmüş, sırayla birleştirilir.         */
/* ------------------------------------------------------------------ */

const SALT = 'MOSBARKOD·2026·PRO';

/** Özetin 8 parçası — karıştırılmış sırada (gerçek sıra DIGEST_ORDER ile kurulur). */
const DIGEST_FRAGMENTS = [
  '278953ef', // özetin 4. bloğu
  'a7569f65', // 1. blok
  '84ca2fd3', // 7. blok
  '98bd7414', // 3. blok
  '95a27e24', // 8. blok
  'b55afef1', // 2. blok
  '0a1390f9', // 6. blok
  '0736810a', // 5. blok
];
/** Çıktı konumu → parça dizini eşlemesi. */
const DIGEST_ORDER = [1, 5, 3, 0, 7, 6, 2, 4];

const expectedDigest = (): string => DIGEST_ORDER.map((i) => DIGEST_FRAGMENTS[i]).join('');

/** Sağlama değeri 884'ün gizlenmiş hali (372 + 512). */
const CHECK_OFFSET = 512;
const CHECK_FRAGMENT = 372;
const expectedChecksum = (): number => CHECK_OFFSET + CHECK_FRAGMENT;

/* ------------------------------------------------------------------ */
/*  Lisans anahtarı doğrulama                                          */
/* ------------------------------------------------------------------ */

/** Girdiyi MOS-XXXX-XXXX-XXXX biçimine getirir (ilk 3 hane MOS + 3×4 blok). */
export const normalizeLicenseKey = (raw: string): string => {
  const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 15);
  if (clean.length <= 3) return clean;
  const p1 = clean.slice(0, 3);
  const rest = clean.slice(3);
  const blocks = rest.match(/.{1,4}/g) ?? [];
  return [p1, ...blocks].join('-');
};

const checksumOf = (payload: string): number => {
  let s = 0;
  for (const ch of payload) s = (s + ch.charCodeAt(0) * 7) % 997;
  return s;
};

/**
 * Lisans anahtarını doğrular.
 * 1) MOS-XXXX-XXXX-XXXX biçimi
 * 2) Payload sağlama değeri
 * 3) Tuzlanmış SHA-256 özeti (anahtar metni koddan okunamaz)
 */
export const isValidLicenseKey = (raw: string): boolean => {
  const key = normalizeLicenseKey(raw);
  if (!/^MOS-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(key)) return false;
  const payload = key.replace(/-/g, '').slice(3);
  if (checksumOf(payload) !== expectedChecksum()) return false;
  return sha256hex(SALT + key) === expectedDigest();
};
