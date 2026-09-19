import { describe, it, expect, beforeEach, vi } from 'vitest';
import { generateKeyPairSync, type KeyObject } from 'node:crypto';
import { normalizeDeviceCode, resetDeviceFingerprintCache } from './deviceId';
import {
  activateTesterCode,
  checkTesterLicense,
  formatTesterDate,
  parseTesterCode,
  verifyTesterCode,
  type TesterInfo,
} from './testerLicense';

/* Testler için kendi anahtar çiftimizi üretiyoruz (gerçek gizli anahtar
   depoda yoktur, yalnızca GENEL anahtar uygulamaya gömülüdür). */
const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
const TEST_JWK = publicKey.export({ format: 'jwk' }) as JsonWebKey;
const yabanciKey = generateKeyPairSync('ec', { namedCurve: 'P-256' }).privateKey;

/** İmzayı uygulamanın beklediği BİÇİMDE (WebCrypto, ham r||s) üretir. */
async function signPayload(payload: string, keyObj: KeyObject): Promise<string> {
  const der = keyObj.export({ type: 'pkcs8', format: 'der' }) as unknown as BufferSource;
  const k = await crypto.subtle.importKey(
    'pkcs8',
    der,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    k,
    new TextEncoder().encode(payload),
  );
  return Buffer.from(sig).toString('base64url');
}

const DEVICE_A = '3F2A9C117B04';
const FP_A = DEVICE_A.toLowerCase() + '0000000000000000000000000000000000000000000000000000';
const FP_B = 'abcdef123456' + '0000000000000000000000000000000000000000000000000000';

async function makeCode(
  device = DEVICE_A,
  issue = '260919',
  exp = '270919',
  key: KeyObject = privateKey,
): Promise<string> {
  const payload = `MTEST1.${device}.${issue}.${exp}`;
  return `${payload}.${await signPayload(payload, key)}`;
}

function mockStorage(initial: Record<string, string> = {}) {
  const store = new Map<string, string>(Object.entries(initial));
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => {
      store.set(k, String(v));
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => store.clear(),
  });
}

describe('testçi lisansı (tek cihaza bağlı)', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    resetDeviceFingerprintCache();
    mockStorage();
  });

  it('bu cihaza kesilmiş kodu doğrular', async () => {
    const res = await verifyTesterCode(await makeCode(), FP_A, TEST_JWK);
    expect(res.status).toBe('gecerli');
    expect(res.info?.device).toBe(DEVICE_A);
  });

  it('AYNI kod başka cihazda geçersiz olur', async () => {
    const code = await makeCode(); // DEVICE_A'ya kesildi
    const res = await verifyTesterCode(code, FP_B, TEST_JWK);
    expect(res.status).toBe('baska-cihaz');
  });

  it('imzası bozulmuş kodu reddeder', async () => {
    const code = await makeCode();
    const bozuk = code.slice(0, -4) + 'AAAA';
    const res = await verifyTesterCode(bozuk, FP_A, TEST_JWK);
    expect(res.status).toBe('bozuk');
  });

  it('BAŞKA bir gizli anahtarla üretilmiş kodu reddeder', async () => {
    const sahte = await makeCode(DEVICE_A, '260919', '270919', yabanciKey);
    const res = await verifyTesterCode(sahte, FP_A, TEST_JWK);
    expect(res.status).toBe('bozuk');
  });

  it('süresi dolmuş kodu reddeder', async () => {
    const res = await verifyTesterCode(await makeCode(DEVICE_A, '240919', '250919'), FP_A, TEST_JWK);
    expect(res.status).toBe('sure-bitti');
  });

  it('biçimi bozuk / eksik kodları reddeder', async () => {
    expect((await verifyTesterCode('merhaba', FP_A, TEST_JWK)).status).toBe('bozuk');
    expect((await verifyTesterCode('', FP_A, TEST_JWK)).status).toBe('bozuk');
    expect((await verifyTesterCode('MTEST2.AAAA.AAAA.AAAA.AAAA', FP_A, TEST_JWK)).status).toBe('bozuk');
    expect(parseTesterCode('MTEST1.3F2A9C117B04.260919.270919')).toBeNull(); // imza yok
  });

  it('cihaz kodu normalize edilir, tarih okunur biçimde yazılır', () => {
    expect(normalizeDeviceCode('MOS-3f2a-9c11-7b04')).toBe('3F2A9C117B04');
    expect(normalizeDeviceCode('mos 3f2a 9c11 7b04')).toBe('3F2A9C117B04');
    expect(formatTesterDate('270919')).toBe('19.09.2027');
  });

  it('kod girilmemişse klasik lisansa dokunmaz', async () => {
    mockStorage({ mosbarkod_licensed: '1' });
    const st = await checkTesterLicense(TEST_JWK);
    expect(st.status).toBe('yok');
    expect(localStorage.getItem('mosbarkod_licensed')).toBe('1');
  });

  it('kod klonlanıp başka cihazda açılırsa lisans düşer', async () => {
    // 1) Gerçek cihaz: kod etkinleştirilir
    mockStorage({ mosbarkod_device_uuid: 'cihaz-bir' });
    resetDeviceFingerprintCache();
    const { getDeviceFingerprint } = await import('./deviceId');
    const fp1 = await getDeviceFingerprint();
    const code = await makeCode(fp1.slice(0, 12).toUpperCase());
    const ok = await activateTesterCode(code, TEST_JWK);
    expect(ok.status).toBe('gecerli');
    expect(localStorage.getItem('mosbarkod_licensed')).toBe('1');

    // 2) Uygulama verisi başka telefona taşındı (klonlama) → parmak izi değişir
    const kayitliKod = localStorage.getItem('mosbarkod_tester_code')!;
    mockStorage({
      mosbarkod_device_uuid: 'cihaz-iki',
      mosbarkod_tester_code: kayitliKod,
      mosbarkod_licensed: '1',
    });
    resetDeviceFingerprintCache();
    const st = await checkTesterLicense(TEST_JWK);
    expect(st.status).toBe('baska-cihaz');
    // PRO kilidi kapanmalı
    expect(localStorage.getItem('mosbarkod_licensed')).toBeNull();
  });

  it('bilgi alanları doğru döner', async () => {
    const res = await verifyTesterCode(await makeCode(), FP_A, TEST_JWK);
    const info = res.info as TesterInfo;
    expect(info.issue).toBe('260919');
    expect(info.exp).toBe('270919');
  });
});
