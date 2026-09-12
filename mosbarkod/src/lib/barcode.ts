/**
 * Gerçek EAN-13 barkod kodlayıcı (çizgi/boşluk modül dizisi üretir).
 * Üretilen barkodlar standart barkod okuyucularla taranabilir.
 */

const L: Record<string, number[]> = {
  '0': [0, 0, 0, 1, 1, 0, 1],
  '1': [0, 0, 1, 1, 0, 0, 1],
  '2': [0, 0, 1, 0, 0, 1, 1],
  '3': [0, 1, 1, 1, 1, 0, 1],
  '4': [0, 1, 0, 0, 0, 1, 1],
  '5': [0, 1, 1, 0, 0, 0, 1],
  '6': [0, 1, 0, 1, 1, 1, 1],
  '7': [0, 1, 1, 1, 0, 1, 1],
  '8': [0, 1, 1, 0, 1, 1, 1],
  '9': [0, 0, 0, 1, 0, 1, 1],
};

const G: Record<string, number[]> = Object.fromEntries(
  Object.entries(L).map(([d, bits]) => [d, [...bits].reverse()])
);

const R: Record<string, number[]> = Object.fromEntries(
  Object.entries(L).map(([d, bits]) => [d, bits.map((b) => 1 - b)])
);

/* İlk rakam → sol 6 hanenin G/L deseni */
const PARITY: Record<string, string[]> = {
  '0': ['L', 'L', 'L', 'L', 'L', 'L'],
  '1': ['L', 'L', 'G', 'L', 'G', 'G'],
  '2': ['L', 'L', 'G', 'G', 'L', 'G'],
  '3': ['L', 'L', 'G', 'G', 'G', 'L'],
  '4': ['L', 'G', 'L', 'L', 'G', 'G'],
  '5': ['L', 'G', 'G', 'L', 'L', 'G'],
  '6': ['L', 'G', 'G', 'G', 'L', 'L'],
  '7': ['L', 'G', 'L', 'G', 'L', 'G'],
  '8': ['L', 'G', 'L', 'G', 'G', 'L'],
  '9': ['L', 'G', 'G', 'L', 'G', 'L'],
};

const START = [1, 0, 1];
const MID = [0, 1, 0, 1, 0];
const END = [1, 0, 1];

/** 13 haneli EAN-13'ü 95 modüllük çizgi dizisine dönüştürür (1=çizgi, 0=boşluk). Geçersizse boş dizi. */
export function encodeEan13(code: string): number[] {
  const digits = (code || '').replace(/\D/g, '');
  if (digits.length !== 13) return [];
  const first = digits[0];
  const parity = PARITY[first];
  if (!parity) return [];

  const bars: number[] = [...START];
  for (let i = 0; i < 6; i++) {
    const d = digits[1 + i];
    const table = parity[i] === 'G' ? G : L;
    const bits = table[d];
    if (!bits) return [];
    bars.push(...bits);
  }
  bars.push(...MID);
  for (let i = 0; i < 6; i++) {
    const bits = R[digits[7 + i]];
    if (!bits) return [];
    bars.push(...bits);
  }
  bars.push(...END);
  return bars;
}

/** EAN-13 doğrulaması: son hane kontrol basamağıyla uyumlu mu? */
export function isEan13Valid(code: string): boolean {
  const digits = (code || '').replace(/\D/g, '');
  if (digits.length !== 13) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const d = digits.charCodeAt(i) - 48;
    sum += i % 2 === 0 ? d : d * 3;
  }
  const check = (10 - (sum % 10)) % 10;
  return check === digits.charCodeAt(12) - 48;
}
