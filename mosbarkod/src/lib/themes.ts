export interface Theme {
  id: string;
  name: string;
  desc: string;
  light?: boolean;
  accent: string;
  accent2: string;
  ink: string;
  panel: string;
  panel2: string;
  panel3: string;
  line: string;
  line2: string;
  txt: string;
  mut: string;
  mut2: string;
  mint: string;
  red: string;
  blue: string;
}

/* Koyu temalarda ortak metin/durum renkleri */
const D = {
  txt: '#dbe4ee',
  mut: '#7d8ca0',
  mut2: '#56667d',
  mint: '#2fd6a5',
  red: '#ef5350',
  blue: '#5aa2f0',
};

/* Açık temalarda ortak metin/durum renkleri */
const L = {
  txt: '#101828',
  mut: '#475467',
  mut2: '#667085',
  mint: '#059669',
  red: '#dc2626',
  blue: '#2563eb',
};

export const THEMES: Theme[] = [
  /* ---------------- KOYU TEMALAR ---------------- */
  { id: 'amber', name: 'Amber Gece', desc: 'Klasik MOSBARKOD görünümü', accent: '#f59e0b', accent2: '#fbbf24', ink: '#0a0e13', panel: '#10151c', panel2: '#141b24', panel3: '#1b2531', line: '#1e2833', line2: '#2b3949', ...D },
  { id: 'okyanus', name: 'Okyanus', desc: 'Derin mavi ve turkuaz', accent: '#0ea5e9', accent2: '#38bdf8', ink: '#071019', panel: '#0c1723', panel2: '#102030', panel3: '#16283a', line: '#16283c', line2: '#22405c', ...D },
  { id: 'zumrut', name: 'Zümrüt', desc: 'Koyu yeşil ve nane', accent: '#10b981', accent2: '#34d399', ink: '#071410', panel: '#0d1a15', panel2: '#12221c', panel3: '#182d24', line: '#1a2f26', line2: '#27453a', ...D },
  { id: 'sarap', name: 'Şarap Bordo', desc: 'Bordo ve gül tonları', accent: '#e0355c', accent2: '#f0506e', ink: '#14090d', panel: '#1d0f14', panel2: '#24141b', panel3: '#2e1a23', line: '#331922', line2: '#4a2533', ...D },
  { id: 'morNeon', name: 'Mor Neon', desc: 'Modern mor gece', accent: '#a855f7', accent2: '#c084fc', ink: '#0f0a17', panel: '#171021', panel2: '#1d1429', panel3: '#261b35', line: '#291d3a', line2: '#3d2c56', ...D },
  { id: 'geceMavisi', name: 'Gece Mavisi', desc: 'Kurumsal lacivert', accent: '#3b82f6', accent2: '#60a5fa', ink: '#080d17', panel: '#0e1522', panel2: '#131c2d', panel3: '#1a2538', line: '#1b2740', line2: '#29395a', ...D },
  { id: 'kahve', name: 'Kahve Dükkanı', desc: 'Sıcak kahve ve karamel', accent: '#d97706', accent2: '#f59e0b', ink: '#120c07', panel: '#1a130c', panel2: '#211810', panel3: '#2a1f14', line: '#2c2216', line2: '#40301e', ...D },
  { id: 'grafit', name: 'Grafit', desc: 'Nötr profesyonel tema', accent: '#9ca3af', accent2: '#d1d5db', ink: '#0b0c0e', panel: '#121316', panel2: '#17181c', panel3: '#1d1f24', line: '#212329', line2: '#31343c', ...D },
  { id: 'premiumGold', name: 'Premium Gold', desc: 'Lüks siyah ve metalik altın', accent: '#d4af37', accent2: '#f5d061', ink: '#0e0b05', panel: '#17130a', panel2: '#1e190d', panel3: '#272011', line: '#2a2312', line2: '#423820', ...D },
  { id: 'premiumSilver', name: 'Premium Silver', desc: 'Modern antrasit ve gümüş', accent: '#cbd5e1', accent2: '#f1f5f9', ink: '#0e1116', panel: '#161a21', panel2: '#1c212a', panel3: '#232935', line: '#262c37', line2: '#38414f', ...D },
  { id: 'roseGold', name: 'Rose Gold', desc: 'Zarif gül altını ve bordo', accent: '#e8a0a5', accent2: '#f7c6c9', ink: '#150d10', panel: '#1f141a', panel2: '#261a21', panel3: '#2f2028', line: '#33232c', line2: '#4b3540', ...D },
  { id: 'obsidyenNeon', name: 'Obsidyen Neon', desc: 'Siyah zemin ve neon camgöbeği', accent: '#22d3ee', accent2: '#67e8f9', ink: '#050d10', panel: '#0a1418', panel2: '#0e1c22', panel3: '#14262e', line: '#142a33', line2: '#1f4250', ...D },
  { id: 'arktikCam', name: 'Arktik Cam', desc: 'Buz mavisi modern cam görünüm', accent: '#93c5fd', accent2: '#dbeafe', ink: '#0d1319', panel: '#151d26', panel2: '#1b2530', panel3: '#233040', line: '#24313f', line2: '#35485c', ...D },
  { id: 'royalNavy', name: 'Royal Navy', desc: 'Kraliyet lacivert ve bronz', accent: '#5b7ff2', accent2: '#8aa5ff', ink: '#070b16', panel: '#0d1322', panel2: '#121a2e', panel3: '#182339', line: '#1b2742', line2: '#2b3d63', ...D },
  { id: 'petrol', name: 'Petrol', desc: 'Petrol yeşili ve turkuaz', accent: '#14b8a6', accent2: '#2dd4bf', ink: '#061414', panel: '#0b1c1c', panel2: '#0f2424', panel3: '#143030', line: '#153031', line2: '#1f4a4a', ...D },
  { id: 'gunBatimi', name: 'Gün Batımı', desc: 'Kızıl ve turuncu gece', accent: '#fb7185', accent2: '#fbbf24', ink: '#150b08', panel: '#1e120d', panel2: '#261711', panel3: '#301d15', line: '#33211a', line2: '#4d3125', ...D },
  { id: 'indigo', name: 'İndigo', desc: 'Koyu mor mavisi', accent: '#818cf8', accent2: '#a5b4fc', ink: '#0a0a18', panel: '#101021', panel2: '#15152b', panel3: '#1b1b37', line: '#1e1e3b', line2: '#2e2e57', ...D },
  { id: 'marketYesili', name: 'Market Yeşili', desc: 'Canlı limon ve açık yeşil', accent: '#22c55e', accent2: '#4ade80', ink: '#071309', panel: '#0d1b11', panel2: '#122417', panel3: '#17301e', line: '#1a3322', line2: '#275033', ...D },
  { id: 'siyahKirmizi', name: 'Siyah & Kırmızı', desc: 'Yüksek kontrast spor görünüm', accent: '#ef4444', accent2: '#f87171', ink: '#08090b', panel: '#101114', panel2: '#15171b', panel3: '#1c1f24', line: '#202329', line2: '#33383f', ...D },
  { id: 'ormanGecesi', name: 'Orman Gecesi', desc: 'Koyu haki ve yosun yeşili', accent: '#84cc16', accent2: '#a3e635', ink: '#0a0f08', panel: '#111810', panel2: '#161f14', panel3: '#1d281a', line: '#1f2b1c', line2: '#31432c', ...D },
  { id: 'bakir', name: 'Bakır', desc: 'Sıcak bakır ve antrasit', accent: '#c2703c', accent2: '#e08b52', ink: '#0e0b09', panel: '#171210', panel2: '#1d1815', panel3: '#26201b', line: '#2a221d', line2: '#3f342b', ...D },
  { id: 'lavanta', name: 'Lavanta Gece', desc: 'Yumuşak mor ve gri', accent: '#b39ddb', accent2: '#d1c4e9', ink: '#0d0b12', panel: '#15121c', panel2: '#1b1723', panel3: '#231e2d', line: '#262032', line2: '#392f4a', ...D },
  { id: 'buzMavisi', name: 'Buz Mavisi', desc: 'Soğuk çelik mavisi', accent: '#7dd3fc', accent2: '#bae6fd', ink: '#080f14', panel: '#0f171e', panel2: '#141e27', panel3: '#1b2833', line: '#1d2b36', line2: '#2c414f', ...D },
  { id: 'safir', name: 'Safir', desc: 'Derin safir mavisi', accent: '#4f46e5', accent2: '#818cf8', ink: '#070914', panel: '#0d1020', panel2: '#12162b', panel3: '#191e38', line: '#1b213c', line2: '#2b3459', ...D },

  /* ---------------- AÇIK TEMALAR ---------------- */
  { id: 'modernAcik', name: 'Modern Açık', desc: 'Çağdaş gri-beyaz ve indigo', light: true, accent: '#6366f1', accent2: '#4f46e5', ink: '#eceff5', panel: '#ffffff', panel2: '#f3f5fa', panel3: '#e7ebf3', line: '#e1e7f0', line2: '#c6d0e0', ...L },
  { id: 'gunIsigi', name: 'Gün Işığı', desc: 'Klasik açık beyaz tema', light: true, accent: '#d97706', accent2: '#b45309', ink: '#f7f8fa', panel: '#ffffff', panel2: '#f2f4f7', panel3: '#e9ecf1', line: '#e4e7ec', line2: '#d0d5dd', ...L },
  { id: 'kagit', name: 'Kağıt', desc: 'Sıcak krem kağıt tonu', light: true, accent: '#b45309', accent2: '#92400e', ink: '#faf6f0', panel: '#fffdf9', panel2: '#f5efe6', panel3: '#ece4d8', line: '#e8e0d4', line2: '#d6cbba', ...L },
  { id: 'acikMavi', name: 'Açık Mavi', desc: 'Ferah gökyüzü mavisi', light: true, accent: '#0284c7', accent2: '#0369a1', ink: '#f4f9fd', panel: '#ffffff', panel2: '#eef6fc', panel3: '#e2eff9', line: '#dceaf5', line2: '#c3dcee', ...L },
  { id: 'acikYesil', name: 'Açık Yeşil', desc: 'Taze nane ve beyaz', light: true, accent: '#059669', accent2: '#047857', ink: '#f4fbf8', panel: '#ffffff', panel2: '#ecf8f3', panel3: '#dff2ea', line: '#daf0e6', line2: '#bce3d3', ...L },
  { id: 'acikGri', name: 'Açık Gri', desc: 'Nötr ofis grisi', light: true, accent: '#475467', accent2: '#344054', ink: '#f5f6f8', panel: '#ffffff', panel2: '#f0f1f4', panel3: '#e6e8ec', line: '#e2e4e9', line2: '#cdd1d9', ...L },
  { id: 'pudra', name: 'Pudra', desc: 'Yumuşak gül ve krem', light: true, accent: '#be185d', accent2: '#9d174d', ink: '#fdf5f8', panel: '#ffffff', panel2: '#fbecf2', panel3: '#f7e0ea', line: '#f5dde7', line2: '#eabfd1', ...L },
  { id: 'acikLavanta', name: 'Açık Lavanta', desc: 'Hafif mor ve beyaz', light: true, accent: '#7c3aed', accent2: '#6d28d9', ink: '#f8f6fd', panel: '#ffffff', panel2: '#f2eefb', panel3: '#e9e2f7', line: '#e6def6', line2: '#cfc0ee', ...L },
  { id: 'limon', name: 'Limon', desc: 'Canlı sarı ve beyaz', light: true, accent: '#ca8a04', accent2: '#a16207', ink: '#fdfbf2', panel: '#ffffff', panel2: '#faf5e2', panel3: '#f5eecd', line: '#f2ebc9', line2: '#e3d79c', ...L },
  { id: 'acikTurkuaz', name: 'Açık Turkuaz', desc: 'Deniz esintisi', light: true, accent: '#0d9488', accent2: '#0f766e', ink: '#f2fbfa', panel: '#ffffff', panel2: '#e9f7f5', panel3: '#daf0ed', line: '#d5eeeb', line2: '#b3ded9', ...L },
  { id: 'somon', name: 'Somon', desc: 'Sıcak şeftali tonları', light: true, accent: '#ea580c', accent2: '#c2410c', ink: '#fef7f3', panel: '#ffffff', panel2: '#fdeee6', panel3: '#fbe2d5', line: '#f9dfd1', line2: '#f2c1a7', ...L },
  { id: 'acikIndigo', name: 'Açık İndigo', desc: 'Kurumsal açık lacivert', light: true, accent: '#4338ca', accent2: '#3730a3', ink: '#f6f7fd', panel: '#ffffff', panel2: '#eef0fb', panel3: '#e2e6f8', line: '#dee2f6', line2: '#c0c7ee', ...L },
  { id: 'acikGrafit', name: 'Açık Grafit', desc: 'Yüksek kontrast siyah-beyaz', light: true, accent: '#111827', accent2: '#374151', ink: '#fafafa', panel: '#ffffff', panel2: '#f4f4f5', panel3: '#e9e9eb', line: '#e5e5e7', line2: '#d1d1d6', ...L },
];

const VARS: [string, (t: Theme) => string][] = [
  ['--color-amber', (t) => t.accent],
  ['--color-amber2', (t) => t.accent2],
  ['--color-ink', (t) => t.ink],
  ['--color-panel', (t) => t.panel],
  ['--color-panel2', (t) => t.panel2],
  ['--color-panel3', (t) => t.panel3],
  ['--color-line', (t) => t.line],
  ['--color-line2', (t) => t.line2],
  ['--color-txt', (t) => t.txt],
  ['--color-mut', (t) => t.mut],
  ['--color-mut2', (t) => t.mut2],
  ['--color-mint', (t) => t.mint],
  ['--color-red', (t) => t.red],
  ['--color-blue', (t) => t.blue],
];

export function applyTheme(id: string) {
  const t = THEMES.find((x) => x.id === id) ?? THEMES[0];
  const r = document.documentElement.style;
  for (const [v, get] of VARS) r.setProperty(v, get(t));
  document.documentElement.dataset.themeMode = t.light ? 'light' : 'dark';
  document.documentElement.style.colorScheme = t.light ? 'light' : 'dark';
}

export function resetTheme() {
  const r = document.documentElement.style;
  for (const [v] of VARS) r.removeProperty(v);
  delete document.documentElement.dataset.themeMode;
  document.documentElement.style.colorScheme = '';
}
