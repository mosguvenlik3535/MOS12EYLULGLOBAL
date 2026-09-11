/**
 * MOSBARKOD Çoklu Dil Desteği — i18n çekirdeği
 *
 * Prensip: Kaynak kodda hard-coded dil YOK; tüm metin anahtarlara bağlanır.
 * - İlk açılışta tarayıcı dilini algılar; kalıcı dil secimi localStorage'da tutulur.
 * - Eksik çeviri anahtarları her zaman Türkçe (tr) fallback ile gösterilir.
 */

import { createContext, useContext } from 'react';

export type Locale =
  | 'tr'
  | 'en'
  | 'es'
  | 'de'
  | 'fr'
  | 'it'
  | 'pt'
  | 'zh'
  | 'pl'
  | 'ro'
  | 'el'
  | 'nl'
  | 'ar'
  | 'ru';

export const LOCALES: { id: Locale; label: string; native: string; flag: string; rtl?: boolean }[] = [
  { id: 'tr', label: 'Türkçe', native: 'Türkçe', flag: '🇹🇷' },
  { id: 'en', label: 'English', native: 'English', flag: '🇬🇧' },
  { id: 'es', label: 'Español', native: 'Español', flag: '🇪🇸' },
  { id: 'de', label: 'Deutsch', native: 'Deutsch', flag: '🇩🇪' },
  { id: 'fr', label: 'Français', native: 'Français', flag: '🇫🇷' },
  { id: 'it', label: 'Italiano', native: 'Italiano', flag: '🇮🇹' },
  { id: 'pt', label: 'Português', native: 'Português (Brasil)', flag: '🇧🇷' },
  { id: 'zh', label: 'Chinese', native: '简体中文', flag: '🇨🇳' },
  { id: 'pl', label: 'Polski', native: 'Polski', flag: '🇵🇱' },
  { id: 'ro', label: 'Română', native: 'Română', flag: '🇷🇴' },
  { id: 'el', label: 'Ελληνικά', native: 'Ελληνικά', flag: '🇬🇷' },
  { id: 'nl', label: 'Nederlands', native: 'Nederlands', flag: '🇳🇱' },
  { id: 'ar', label: 'العربية', native: 'العربية', flag: '🇸🇦', rtl: true },
  { id: 'ru', label: 'Русский', native: 'Русский', flag: '🇷🇺' },
];

export const RTL_LOCALES: Locale[] = ['ar'];
export const isRtl = (l: Locale) => RTL_LOCALES.includes(l);

const KEY = 'mosbarkod_locale';

export const loadLocale = (): Locale => {
  try {
    const stored = localStorage.getItem(KEY) as Locale | null;
    if (stored && LOCALES.some((l) => l.id === stored)) return stored;
  } catch { /* yoksay */ }
  try {
    const nav = (navigator.language || 'tr').toLocaleLowerCase('tr-TR').slice(0, 2) as Locale;
    if (LOCALES.some((l) => l.id === nav)) return nav;
  } catch { /* yoksay */ }
  return 'tr';
};

export const saveLocale = (l: Locale) => {
  try {
    localStorage.setItem(KEY, l);
  } catch { /* yoksay */ }
};

/* ---------- Çeviri kataloğu ---------- */

export type TranslationTable = Record<string, string>;
export type Translations = Record<Locale, TranslationTable>;

/** Aktif çeviri tablosu (ana dil yüklendikten sonra doldurulur) */
let _t: TranslationTable = {};
let _locale: Locale = 'tr';

export const setI18n = (table: TranslationTable, locale: Locale) => {
  _t = table;
  _locale = locale;
  return locale;
};

export const getLocale = () => _locale;

/** Anahtar çevirisi — parametre değiştirilebilir: t('key', { name, amount }) → "Merhaba {name}, {amount} ₺" */
export const t = (key: string, params?: Record<string, string | number>): string => {
  let s = _t[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      s = s.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
  }
  return s;
};

/* Context — React bileşenlerinden erişim */
export const LocaleContext = createContext<{
  locale: Locale;
  t: (key: string, params?: Record<string, string | number>) => string;
  setLocale: (l: Locale) => void;
  isRtl: boolean;
  dir: 'ltr' | 'rtl';
}>({
  locale: 'tr',
  t,
  setLocale: () => {},
  isRtl: false,
  dir: 'ltr',
});

export const useLocale = () => useContext(LocaleContext);
