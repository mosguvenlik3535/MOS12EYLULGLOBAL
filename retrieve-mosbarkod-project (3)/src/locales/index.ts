import type { Locale, Translations } from './i18n';
import { tr } from './tr';
import { en } from './en';
import { es } from './es';
import { de } from './de';
import { fr } from './fr';
import { it } from './it';
import { pt } from './pt';
import { zh } from './zh';
import { pl } from './pl';
import { ro } from './ro';
import { el } from './el';
import { nl } from './nl';
import { ar } from './ar';
import { ru } from './ru';

export const translations: Translations = {
  tr,
  en,
  es,
  de,
  fr,
  it,
  pt,
  zh,
  pl,
  ro,
  el,
  nl,
  ar,
  ru,
};

export type { Locale };
export { setI18n, loadLocale, saveLocale, getLocale, t, isRtl, RTL_LOCALES, LOCALES } from './i18n';
