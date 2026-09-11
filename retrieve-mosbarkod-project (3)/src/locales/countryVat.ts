import type { Locale } from './i18n';
import type { Product } from '../data';

export interface VatRateMeta {
  rate: number;
  label: string;
  desc: string;
  color: string;
}

export interface CountryVatProfile {
  locale: Locale;
  countryName: string;
  vatName: string; // KDV, VAT, IVA, MwSt., TVA, BTW, ΦΠΑ, НДС, 增值税...
  rates: number[];
  defaultRate: number;
  meta: Record<number, VatRateMeta>;
  suggestRate: (category?: string) => number;
}

export const COUNTRY_VAT_PROFILES: Record<Locale, CountryVatProfile> = {
  tr: {
    locale: 'tr',
    countryName: 'Türkiye',
    vatName: 'KDV',
    rates: [0, 1, 10, 18, 20],
    defaultRate: 20,
    meta: {
      0: { rate: 0, label: '%0', desc: 'İstisna / KDV Muafiyeti', color: '#7d8ca0' },
      1: { rate: 1, label: '%1', desc: 'Temel gıda, ekmek, un, unlu mamul', color: '#2fd6a5' },
      10: { rate: 10, label: '%10', desc: 'Gıda, meşrubat, atıştırmalık, temizlik', color: '#5aa2f0' },
      18: { rate: 18, label: '%18', desc: 'Eski genel oran (arşiv kayıtlar)', color: '#c084fc' },
      20: { rate: 20, label: '%20', desc: 'Genel oran — alkol, tütün, genel ürünler', color: '#f59e0b' },
    },
    suggestRate: (cat = '') => {
      const c = cat.toLocaleLowerCase('tr-TR');
      if (c.includes('bira') || c.includes('raki') || c.includes('rakı') || c.includes('viski') || c.includes('sigara') || c.includes('tütün')) return 20;
      if (c.includes('kuru yemiş') || c.includes('ekmek') || c.includes('un')) return 1;
      if (c.includes('meşrubat') || c.includes('atıştırmalık') || c.includes('kahve') || c.includes('çay')) return 10;
      return 20;
    },
  },

  en: {
    locale: 'en',
    countryName: 'United Kingdom / Global',
    vatName: 'VAT',
    rates: [0, 5, 20],
    defaultRate: 20,
    meta: {
      0: { rate: 0, label: '0%', desc: 'Zero Rate — Basic food, books, water', color: '#7d8ca0' },
      5: { rate: 5, label: '5%', desc: 'Reduced Rate — Domestic fuel, child seats', color: '#5aa2f0' },
      20: { rate: 20, label: '20%', desc: 'Standard Rate — Alcohol, tobacco, snacks, drinks', color: '#f59e0b' },
    },
    suggestRate: (cat = '') => {
      const c = cat.toLowerCase();
      if (c.includes('nut') || c.includes('bread') || c.includes('flour') || c.includes('milk')) return 0;
      if (c.includes('fuel') || c.includes('energy')) return 5;
      return 20;
    },
  },

  es: {
    locale: 'es',
    countryName: 'España',
    vatName: 'IVA',
    rates: [0, 4, 10, 21],
    defaultRate: 21,
    meta: {
      0: { rate: 0, label: '0%', desc: 'Exento — Operaciones exentas', color: '#7d8ca0' },
      4: { rate: 4, label: '4%', desc: 'Superreducido — Pan, leche, huevos, frutas, verduras', color: '#2fd6a5' },
      10: { rate: 10, label: '10%', desc: 'Reducido — Alimentos, agua, hostelería', color: '#5aa2f0' },
      21: { rate: 21, label: '21%', desc: 'General — Alcohol, tabaco, refrescos, general', color: '#f59e0b' },
    },
    suggestRate: (cat = '') => {
      const c = cat.toLowerCase();
      if (c.includes('bread') || c.includes('ekmek') || c.includes('pan') || c.includes('fruta')) return 4;
      if (c.includes('meşrubat') || c.includes('atıştırmalık') || c.includes('snack') || c.includes('beverage') || c.includes('kuru yemiş')) return 10;
      return 21;
    },
  },

  de: {
    locale: 'de',
    countryName: 'Deutschland',
    vatName: 'MwSt.',
    rates: [0, 7, 19],
    defaultRate: 19,
    meta: {
      0: { rate: 0, label: '0%', desc: 'Steuerfrei — Befreite Umsätze', color: '#7d8ca0' },
      7: { rate: 7, label: '7%', desc: 'Ermäßigter Satz — Grundnahrungsmittel, Bücher, Kaffee', color: '#2fd6a5' },
      19: { rate: 19, label: '19%', desc: 'Regelsteuersatz — Alkohol, Tabak, Getränke, Waren', color: '#f59e0b' },
    },
    suggestRate: (cat = '') => {
      const c = cat.toLowerCase();
      if (c.includes('kuru yemiş') || c.includes('ekmek') || c.includes('kahve') || c.includes('çay') || c.includes('nut') || c.includes('bread') || c.includes('coffee')) return 7;
      return 19;
    },
  },

  fr: {
    locale: 'fr',
    countryName: 'France',
    vatName: 'TVA',
    rates: [0, 2.1, 5.5, 10, 20],
    defaultRate: 20,
    meta: {
      0: { rate: 0, label: '0%', desc: 'Exonéré — Produits exonérés', color: '#7d8ca0' },
      2.1: { rate: 2.1, label: '2.1%', desc: 'Taux super-réduit — Médicaments, presse', color: '#7d8ca0' },
      5.5: { rate: 5.5, label: '5.5%', desc: 'Taux réduit — Produits alimentaires de base, eau', color: '#2fd6a5' },
      10: { rate: 10, label: '10%', desc: 'Taux intermédiaire — Restauration, café, snacks', color: '#5aa2f0' },
      20: { rate: 20, label: '20%', desc: 'Taux normal — Alcool, tabac, confiseries, général', color: '#f59e0b' },
    },
    suggestRate: (cat = '') => {
      const c = cat.toLowerCase();
      if (c.includes('kuru yemiş') || c.includes('ekmek') || c.includes('bread') || c.includes('pain')) return 5.5;
      if (c.includes('meşrubat') || c.includes('atıştırmalık') || c.includes('kahve') || c.includes('çay') || c.includes('snack') || c.includes('coffee')) return 10;
      return 20;
    },
  },

  it: {
    locale: 'it',
    countryName: 'Italia',
    vatName: 'IVA',
    rates: [0, 4, 5, 10, 22],
    defaultRate: 22,
    meta: {
      0: { rate: 0, label: '0%', desc: 'Esente — Operazioni esenti', color: '#7d8ca0' },
      4: { rate: 4, label: '4%', desc: 'Minima — Pane, pasta, latte, alimenti base', color: '#2fd6a5' },
      5: { rate: 5, label: '5%', desc: 'Ridottissima — Prodotti alimentari speciali', color: '#38bdf8' },
      10: { rate: 10, label: '10%', desc: 'Ridotta — Carne, pesce, ristorazione, bar, caffè', color: '#5aa2f0' },
      22: { rate: 22, label: '22%', desc: 'Ordinaria — Alcolici, tabacchi, bevande, generale', color: '#f59e0b' },
    },
    suggestRate: (cat = '') => {
      const c = cat.toLowerCase();
      if (c.includes('kuru yemiş') || c.includes('ekmek') || c.includes('bread') || c.includes('pane')) return 4;
      if (c.includes('atıştırmalık') || c.includes('kahve') || c.includes('çay') || c.includes('snack') || c.includes('coffee')) return 10;
      return 22;
    },
  },

  pt: {
    locale: 'pt',
    countryName: 'Brasil / Portugal',
    vatName: 'IVA / ICMS',
    rates: [0, 6, 12, 18, 23],
    defaultRate: 18,
    meta: {
      0: { rate: 0, label: '0%', desc: 'Isento / Alíquota Zero', color: '#7d8ca0' },
      6: { rate: 6, label: '6%', desc: 'Taxa Reduzida (PT) — Alimentos essenciais, pão', color: '#2fd6a5' },
      12: { rate: 12, label: '12%', desc: 'Alíquota Intermédia / Interestadual', color: '#5aa2f0' },
      18: { rate: 18, label: '18%', desc: 'Alíquota Padrão Brasil (ICMS geral)', color: '#38bdf8' },
      23: { rate: 23, label: '23%', desc: 'Taxa Normal Portugal — Bebidas alcoólicas, tabaco', color: '#f59e0b' },
    },
    suggestRate: (cat = '') => {
      const c = cat.toLowerCase();
      if (c.includes('bira') || c.includes('viski') || c.includes('raki') || c.includes('sigara') || c.includes('alcohol') || c.includes('tobacco')) return 23;
      if (c.includes('kuru yemiş') || c.includes('ekmek') || c.includes('pão') || c.includes('bread')) return 6;
      if (c.includes('meşrubat') || c.includes('atıştırmalık') || c.includes('kahve') || c.includes('çay') || c.includes('café')) return 12;
      return 18;
    },
  },

  zh: {
    locale: 'zh',
    countryName: '中国',
    vatName: '增值税',
    rates: [0, 3, 6, 9, 13],
    defaultRate: 13,
    meta: {
      0: { rate: 0, label: '0%', desc: '免税 — 农产品及免税货物', color: '#7d8ca0' },
      3: { rate: 3, label: '3%', desc: '征收率 — 小规模纳税人简易征收', color: '#2fd6a5' },
      6: { rate: 6, label: '6%', desc: '低税率 — 现代生活服务、餐饮', color: '#5aa2f0' },
      9: { rate: 9, label: '9%', desc: '优惠税率 — 粮食食品、干果、农产品', color: '#38bdf8' },
      13: { rate: 13, label: '13%', desc: '标准税率 — 制造业、烟酒、饮料、百货', color: '#f59e0b' },
    },
    suggestRate: (cat = '') => {
      const c = cat.toLowerCase();
      if (c.includes('kuru yemiş') || c.includes('ekmek') || c.includes('bread') || c.includes('grain')) return 9;
      if (c.includes('kahve') || c.includes('çay') || c.includes('tea') || c.includes('service')) return 6;
      return 13;
    },
  },

  pl: {
    locale: 'pl',
    countryName: 'Polska',
    vatName: 'VAT',
    rates: [0, 5, 8, 23],
    defaultRate: 23,
    meta: {
      0: { rate: 0, label: '0%', desc: 'Stawka 0% — Eksport, dostawy wewnątrzwspólnotowe', color: '#7d8ca0' },
      5: { rate: 5, label: '5%', desc: 'Stawka obniżona — Chleb, nabiał, owoce, orzechy', color: '#2fd6a5' },
      8: { rate: 8, label: '8%', desc: 'Stawka obniżona — Usługi gastronomiczne, napoje', color: '#5aa2f0' },
      23: { rate: 23, label: '23%', desc: 'Stawka podstawowa — Alkohol, wyroby tytoniowe, ogólne', color: '#f59e0b' },
    },
    suggestRate: (cat = '') => {
      const c = cat.toLowerCase();
      if (c.includes('bira') || c.includes('viski') || c.includes('raki') || c.includes('sigara') || c.includes('alcohol') || c.includes('tobacco')) return 23;
      if (c.includes('kuru yemiş') || c.includes('ekmek') || c.includes('bread') || c.includes('fruit')) return 5;
      if (c.includes('meşrubat') || c.includes('atıştırmalık') || c.includes('kahve') || c.includes('çay') || c.includes('snack')) return 8;
      return 23;
    },
  },

  ro: {
    locale: 'ro',
    countryName: 'România',
    vatName: 'TVA',
    rates: [0, 5, 9, 19],
    defaultRate: 19,
    meta: {
      0: { rate: 0, label: '0%', desc: 'Scutit de TVA — Operațiuni scutite', color: '#7d8ca0' },
      5: { rate: 5, label: '5%', desc: 'Cotă redusă — Cărți, manuale, publicații', color: '#2fd6a5' },
      9: { rate: 9, label: '9%', desc: 'Cotă redusă — Alimente, băuturi nealcoolice, apă, cafea', color: '#5aa2f0' },
      19: { rate: 19, label: '19%', desc: 'Cotă standard — Alcool, tutun, bunuri generale', color: '#f59e0b' },
    },
    suggestRate: (cat = '') => {
      const c = cat.toLowerCase();
      if (c.includes('bira') || c.includes('viski') || c.includes('raki') || c.includes('sigara') || c.includes('alcohol') || c.includes('tutun')) return 19;
      if (c.includes('kuru yemiş') || c.includes('ekmek') || c.includes('meşrubat') || c.includes('atıştırmalık') || c.includes('kahve') || c.includes('çay')) return 9;
      return 19;
    },
  },

  el: {
    locale: 'el',
    countryName: 'Ελλάδα',
    vatName: 'ΦΠΑ',
    rates: [0, 6, 13, 24],
    defaultRate: 24,
    meta: {
      0: { rate: 0, label: '0%', desc: 'Απαλλαγή ΦΠΑ — Εξαιρούμενες πράξεις', color: '#7d8ca0' },
      6: { rate: 6, label: '6%', desc: 'Υπερμειωμένος — Φάρμακα, βιβλία, ηλεκτρικό', color: '#2fd6a5' },
      13: { rate: 13, label: '13%', desc: 'Μειωμένος — Βασικά τρόφιμα, νερό, καφές, τσάι', color: '#5aa2f0' },
      24: { rate: 24, label: '24%', desc: 'Κανονικός — Αλκοολούχα, καπνικά, γενικά εμπορεύματα', color: '#f59e0b' },
    },
    suggestRate: (cat = '') => {
      const c = cat.toLowerCase();
      if (c.includes('bira') || c.includes('viski') || c.includes('raki') || c.includes('sigara') || c.includes('alcohol') || c.includes('tobacco')) return 24;
      if (c.includes('kuru yemiş') || c.includes('ekmek') || c.includes('meşrubat') || c.includes('atıştırmalık') || c.includes('kahve') || c.includes('çay')) return 13;
      return 24;
    },
  },

  nl: {
    locale: 'nl',
    countryName: 'Nederland',
    vatName: 'BTW',
    rates: [0, 9, 21],
    defaultRate: 21,
    meta: {
      0: { rate: 0, label: '0%', desc: 'Nultarief — Vrijgestelde leveringen en diensten', color: '#7d8ca0' },
      9: { rate: 9, label: '9%', desc: 'Laag tarief — Voedingsmiddelen, water, boeken, koffie, thee', color: '#2fd6a5' },
      21: { rate: 21, label: '21%', desc: 'Algemeen tarief — Alcohol, tabak, snacks, overige goederen', color: '#f59e0b' },
    },
    suggestRate: (cat = '') => {
      const c = cat.toLowerCase();
      if (c.includes('bira') || c.includes('viski') || c.includes('raki') || c.includes('sigara') || c.includes('alcohol') || c.includes('tabak')) return 21;
      if (c.includes('kuru yemiş') || c.includes('ekmek') || c.includes('kahve') || c.includes('çay') || c.includes('food') || c.includes('bread')) return 9;
      return 21;
    },
  },

  ar: {
    locale: 'ar',
    countryName: 'المملكة العربية السعودية / الشرق الأوسط',
    vatName: 'ضريبة القيمة المضافة',
    rates: [0, 5, 15],
    defaultRate: 15,
    meta: {
      0: { rate: 0, label: '0%', desc: 'نسبة الصفر / معفى — التوريدات المعفاة', color: '#7d8ca0' },
      5: { rate: 5, label: '5%', desc: 'النسبة الأساسية المخفضة (الإمارات / البحرين)', color: '#5aa2f0' },
      15: { rate: 15, label: '15%', desc: 'النسبة الأساسية القياسية (السعودية)', color: '#f59e0b' },
    },
    suggestRate: () => 15,
  },

  ru: {
    locale: 'ru',
    countryName: 'Россия',
    vatName: 'НДС',
    rates: [0, 10, 20],
    defaultRate: 20,
    meta: {
      0: { rate: 0, label: '0%', desc: 'Ставка 0% — Экспорт, международные перевозки', color: '#7d8ca0' },
      10: { rate: 10, label: '10%', desc: 'Льготная ставка — Продукты питания, детские товары, хлеб', color: '#2fd6a5' },
      20: { rate: 20, label: '20%', desc: 'Основная ставка — Алкоголь, табак, напитки, прочие товары', color: '#f59e0b' },
    },
    suggestRate: (cat = '') => {
      const c = cat.toLowerCase();
      if (c.includes('kuru yemiş') || c.includes('ekmek') || c.includes('bread') || c.includes('хлеб')) return 10;
      if (c.includes('atıştırmalık') || c.includes('kahve') || c.includes('çay')) return 10;
      return 20;
    },
  },
};

export const getCountryVatProfile = (locale: Locale = 'tr'): CountryVatProfile => {
  return COUNTRY_VAT_PROFILES[locale] ?? COUNTRY_VAT_PROFILES.tr;
};

export const getCountryVatRates = (locale: Locale = 'tr'): number[] => {
  return (COUNTRY_VAT_PROFILES[locale] ?? COUNTRY_VAT_PROFILES.tr).rates;
};

export const getCountryVatName = (locale: Locale = 'tr'): string => {
  return (COUNTRY_VAT_PROFILES[locale] ?? COUNTRY_VAT_PROFILES.tr).vatName;
};

export const getCountryVatMeta = (locale: Locale = 'tr'): Record<number, VatRateMeta> => {
  return (COUNTRY_VAT_PROFILES[locale] ?? COUNTRY_VAT_PROFILES.tr).meta;
};

export const suggestCountryVat = (category: string = '', locale: Locale = 'tr'): number => {
  const prof = COUNTRY_VAT_PROFILES[locale] ?? COUNTRY_VAT_PROFILES.tr;
  return prof.suggestRate(category);
};

export const resolveProductVatRate = (name: string, products: Product[], locale: Locale = 'tr'): number => {
  const p = products.find((x) => x.name.toLowerCase() === name.toLowerCase());
  if (p?.vatRate != null) return p.vatRate;
  return suggestCountryVat(p?.category ?? '', locale);
};
