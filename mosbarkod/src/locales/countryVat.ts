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

/* ------------------------------------------------------------------ */
/*  Kategori normalizasyonu                                            */
/*  Ürün kategorileri uygulamada sabit (Türkçe) listeyle saklanır.     */
/*  Her ülkenin doğru oranını bulmak için kategori adı önce kanonik    */
/*  anahtara çevrilir; sonra o ülkenin oran tablosundan okunur.        */
/* ------------------------------------------------------------------ */

const C = {
  bira: 'bira',
  raki: 'raki',
  viski: 'viski',
  sigara: 'sigara',
  mesrubat: 'mesrubat',
  atistirmalik: 'atistirmalik',
  kuruyemis: 'kuruyemis',
  kahvecay: 'kahvecay',
} as const;

type CatKey = keyof typeof C;
type CatRates = Record<CatKey, number>;

const CATEGORY_KEYWORDS: Record<CatKey, string[]> = {
  bira: ['bira', 'beer', 'bier', 'cerveza', 'bière', 'biere', 'cerveja', 'birra', 'пиво'],
  raki: ['raki', 'rakı', 'schnaps', 'spirit', 'vodka', 'wódka', 'aguardente', 'rakija', 'водка'],
  viski: ['viski', 'whisky', 'whiskey', 'uísque', 'uisque', 'scotch', 'bourbon', 'виски'],
  sigara: [
    'sigara', 'tütün', 'tutun', 'cigarette', 'cigarettes', 'tobacco', 'tabac',
    'cigarro', 'tabak', 'zigarette', 'zigaretten', 'сигар', 'сигарет', 'папир',
  ],
  mesrubat: [
    'meşrubat', 'mesrubat', 'içecek', 'icecek', 'drink', 'beverage', 'boisson',
    'bebida', 'getränk', 'getraenk', 'напит', 'напиток',
  ],
  atistirmalik: [
    'atıştırmalık', 'atistirmalik', 'cips', 'snack', 'snacks', 'aperitivo',
    'knabber', 'snackbar', 'закуск', 'снэк', 'снек',
  ],
  kuruyemis: [
    'kuru yemiş', 'kuru yemis', 'kuruyemis', 'kuruyemiş', 'fıstık', 'fistik',
    'fındık', 'findik', 'nut', 'nuts', 'nuez', 'noix', 'dried', 'trockenfrucht',
    'trockenfr', 'орех', 'орехи',
  ],
  kahvecay: [
    'kahve', 'çay', 'cay', 'coffee', 'tea', 'koffie', 'thee', 'thé', 'the',
    'café', 'cafe', 'kaffee', 'herbata', 'ceai', 'кофе', 'чай',
  ],
};

const normalizeCategory = (cat: string): CatKey | null => {
  const c = cat.toLocaleLowerCase('tr-TR').trim();
  if (!c) return null;
  for (const key of Object.keys(CATEGORY_KEYWORDS) as CatKey[]) {
    if (CATEGORY_KEYWORDS[key].some((w) => c.includes(w))) return key;
  }
  return null;
};

/** Profil üretici — suggestRate her zaman o ülkenin geçerli oranlarından döner. */
const profile = (
  locale: Locale,
  countryName: string,
  vatName: string,
  rates: number[],
  defaultRate: number,
  meta: Record<number, VatRateMeta>,
  catRates: CatRates
): CountryVatProfile => ({
  locale,
  countryName,
  vatName,
  rates,
  defaultRate,
  meta,
  suggestRate: (category = '') => {
    const key = normalizeCategory(category);
    const rate = key ? catRates[key] : defaultRate;
    // Güvence: önerilen oran ülkenin geçerli listesinde olmalı.
    return rates.includes(rate) ? rate : defaultRate;
  },
});

export const COUNTRY_VAT_PROFILES: Record<Locale, CountryVatProfile> = {
  tr: profile(
    'tr', 'Türkiye', 'KDV', [0, 1, 10, 18, 20], 20,
    {
      0: { rate: 0, label: '%0', desc: 'İstisna / KDV Muafiyeti', color: '#7d8ca0' },
      1: { rate: 1, label: '%1', desc: 'Temel gıda, ekmek, un, unlu mamul', color: '#2fd6a5' },
      10: { rate: 10, label: '%10', desc: 'Gıda, meşrubat, atıştırmalık, temizlik', color: '#5aa2f0' },
      18: { rate: 18, label: '%18', desc: 'Eski genel oran (arşiv kayıtlar)', color: '#c084fc' },
      20: { rate: 20, label: '%20', desc: 'Genel oran — alkol, tütün, genel ürünler', color: '#f59e0b' },
    },
    {
      bira: 20, raki: 20, viski: 20, sigara: 20,
      mesrubat: 10, atistirmalik: 10, kuruyemis: 1, kahvecay: 10,
    }
  ),

  en: profile(
    'en', 'United Kingdom', 'VAT', [0, 5, 20], 20,
    {
      0: { rate: 0, label: '0%', desc: 'Zero Rate — Basic food, nuts, coffee, tea, water', color: '#7d8ca0' },
      5: { rate: 5, label: '5%', desc: 'Reduced Rate — Domestic fuel, child seats', color: '#5aa2f0' },
      20: { rate: 20, label: '20%', desc: 'Standard Rate — Alcohol, tobacco, snacks, drinks', color: '#f59e0b' },
    },
    {
      bira: 20, raki: 20, viski: 20, sigara: 20,
      mesrubat: 20, atistirmalik: 20, kuruyemis: 0, kahvecay: 0,
    }
  ),

  es: profile(
    'es', 'España', 'IVA', [0, 4, 10, 21], 21,
    {
      0: { rate: 0, label: '0%', desc: 'Exento — Operaciones exentas', color: '#7d8ca0' },
      4: { rate: 4, label: '4%', desc: 'Superreducido — Pan, leche, huevos, frutas, verduras, frutos secos', color: '#2fd6a5' },
      10: { rate: 10, label: '10%', desc: 'Reducido — Alimentos, agua, café, té, hostelería', color: '#5aa2f0' },
      21: { rate: 21, label: '21%', desc: 'General — Alcohol, tabaco, refrescos, general', color: '#f59e0b' },
    },
    {
      bira: 21, raki: 21, viski: 21, sigara: 21,
      mesrubat: 10, atistirmalik: 10, kuruyemis: 4, kahvecay: 10,
    }
  ),

  de: profile(
    'de', 'Deutschland', 'MwSt.', [0, 7, 19], 19,
    {
      0: { rate: 0, label: '0%', desc: 'Steuerfrei — Befreite Umsätze', color: '#7d8ca0' },
      7: { rate: 7, label: '7%', desc: 'Ermäßigter Satz — Grundnahrungsmittel, Bücher, Kaffee, Nüsse', color: '#2fd6a5' },
      19: { rate: 19, label: '19%', desc: 'Regelsteuersatz — Alkohol, Tabak, Getränke, Waren', color: '#f59e0b' },
    },
    {
      bira: 19, raki: 19, viski: 19, sigara: 19,
      mesrubat: 19, atistirmalik: 19, kuruyemis: 7, kahvecay: 7,
    }
  ),

  fr: profile(
    'fr', 'France', 'TVA', [0, 2.1, 5.5, 10, 20], 20,
    {
      0: { rate: 0, label: '0%', desc: 'Exonéré — Produits exonérés', color: '#7d8ca0' },
      2.1: { rate: 2.1, label: '2.1%', desc: 'Taux super-réduit — Médicaments, presse', color: '#7d8ca0' },
      5.5: { rate: 5.5, label: '5.5%', desc: 'Taux réduit — Produits alimentaires de base, eau, fruits secs', color: '#2fd6a5' },
      10: { rate: 10, label: '10%', desc: 'Taux intermédiaire — Restauration, café, snacks', color: '#5aa2f0' },
      20: { rate: 20, label: '20%', desc: 'Taux normal — Alcool, tabac, confiseries, général', color: '#f59e0b' },
    },
    {
      bira: 20, raki: 20, viski: 20, sigara: 20,
      mesrubat: 10, atistirmalik: 10, kuruyemis: 5.5, kahvecay: 10,
    }
  ),

  it: profile(
    'it', 'Italia', 'IVA', [0, 4, 5, 10, 22], 22,
    {
      0: { rate: 0, label: '0%', desc: 'Esente — Operazioni esenti', color: '#7d8ca0' },
      4: { rate: 4, label: '4%', desc: 'Minima — Pane, pasta, latte, frutta secca, alimenti base', color: '#2fd6a5' },
      5: { rate: 5, label: '5%', desc: 'Ridottissima — Prodotti alimentari speciali', color: '#38bdf8' },
      10: { rate: 10, label: '10%', desc: 'Ridotta — Carne, pesce, ristorazione, bar, caffè, snack', color: '#5aa2f0' },
      22: { rate: 22, label: '22%', desc: 'Ordinaria — Alcolici, tabacchi, bevande, generale', color: '#f59e0b' },
    },
    {
      bira: 22, raki: 22, viski: 22, sigara: 22,
      mesrubat: 22, atistirmalik: 10, kuruyemis: 4, kahvecay: 10,
    }
  ),

  pt: profile(
    'pt', 'Brasil', 'ICMS / IVA', [0, 7, 12, 18, 25], 18,
    {
      0: { rate: 0, label: '0%', desc: 'Isento / Alíquota zero', color: '#7d8ca0' },
      7: { rate: 7, label: '7%', desc: 'Reduzida — Interestadual (N/NE) e produtos essenciais', color: '#2fd6a5' },
      12: { rate: 12, label: '12%', desc: 'Reduzida — Interestadual, alimentos e frutas secas', color: '#5aa2f0' },
      18: { rate: 18, label: '18%', desc: 'Padrão — ICMS geral (SP, MG, RJ)', color: '#38bdf8' },
      25: { rate: 25, label: '25%', desc: 'Seletiva — Bebidas alcoólicas, cigarros, artigos de luxo', color: '#f59e0b' },
    },
    {
      bira: 25, raki: 25, viski: 25, sigara: 25,
      mesrubat: 18, atistirmalik: 18, kuruyemis: 12, kahvecay: 12,
    }
  ),

  zh: profile(
    'zh', '中国', '增值税', [0, 3, 6, 9, 13], 13,
    {
      0: { rate: 0, label: '0%', desc: '免税 — 农产品及免税货物', color: '#7d8ca0' },
      3: { rate: 3, label: '3%', desc: '征收率 — 小规模纳税人简易征收', color: '#2fd6a5' },
      6: { rate: 6, label: '6%', desc: '低税率 — 现代生活服务、餐饮、咖啡茶饮', color: '#5aa2f0' },
      9: { rate: 9, label: '9%', desc: '优惠税率 — 粮食食品、干果、农产品', color: '#38bdf8' },
      13: { rate: 13, label: '13%', desc: '标准税率 — 制造业、烟酒、饮料、百货', color: '#f59e0b' },
    },
    {
      bira: 13, raki: 13, viski: 13, sigara: 13,
      mesrubat: 13, atistirmalik: 13, kuruyemis: 9, kahvecay: 6,
    }
  ),

  pl: profile(
    'pl', 'Polska', 'VAT', [0, 5, 8, 23], 23,
    {
      0: { rate: 0, label: '0%', desc: 'Stawka 0% — Eksport, dostawy wewnątrzwspólnotowe', color: '#7d8ca0' },
      5: { rate: 5, label: '5%', desc: 'Stawka obniżona — Chleb, nabiał, owoce, orzechy', color: '#2fd6a5' },
      8: { rate: 8, label: '8%', desc: 'Stawka obniżona — Usługi gastronomiczne, napoje, kawa, herbata', color: '#5aa2f0' },
      23: { rate: 23, label: '23%', desc: 'Stawka podstawowa — Alkohol, wyroby tytoniowe, ogólne', color: '#f59e0b' },
    },
    {
      bira: 23, raki: 23, viski: 23, sigara: 23,
      mesrubat: 8, atistirmalik: 8, kuruyemis: 5, kahvecay: 8,
    }
  ),

  ro: profile(
    'ro', 'România', 'TVA', [0, 5, 9, 19], 19,
    {
      0: { rate: 0, label: '0%', desc: 'Scutit de TVA — Operațiuni scutite', color: '#7d8ca0' },
      5: { rate: 5, label: '5%', desc: 'Cotă redusă — Cărți, manuale, publicații', color: '#2fd6a5' },
      9: { rate: 9, label: '9%', desc: 'Cotă redusă — Alimente, băuturi nealcoolice, apă, cafea', color: '#5aa2f0' },
      19: { rate: 19, label: '19%', desc: 'Cotă standard — Alcool, tutun, bunuri generale', color: '#f59e0b' },
    },
    {
      bira: 19, raki: 19, viski: 19, sigara: 19,
      mesrubat: 9, atistirmalik: 9, kuruyemis: 9, kahvecay: 9,
    }
  ),

  el: profile(
    'el', 'Ελλάδα', 'ΦΠΑ', [0, 6, 13, 24], 24,
    {
      0: { rate: 0, label: '0%', desc: 'Απαλλαγή ΦΠΑ — Εξαιρούμενες πράξεις', color: '#7d8ca0' },
      6: { rate: 6, label: '6%', desc: 'Υπερμειωμένος — Φάρμακα, βιβλία, ηλεκτρικό', color: '#2fd6a5' },
      13: { rate: 13, label: '13%', desc: 'Μειωμένος — Βασικά τρόφιμα, νερό, καφές, τσάι, ξηροί καρποί', color: '#5aa2f0' },
      24: { rate: 24, label: '24%', desc: 'Κανονικός — Αλκοολούχα, καπνικά, γενικά εμπορεύματα', color: '#f59e0b' },
    },
    {
      bira: 24, raki: 24, viski: 24, sigara: 24,
      mesrubat: 13, atistirmalik: 13, kuruyemis: 13, kahvecay: 13,
    }
  ),

  nl: profile(
    'nl', 'Nederland', 'BTW', [0, 9, 21], 21,
    {
      0: { rate: 0, label: '0%', desc: 'Nultarief — Vrijgestelde leveringen en diensten', color: '#7d8ca0' },
      9: { rate: 9, label: '9%', desc: 'Laag tarief — Voedingsmiddelen, water, boeken, koffie, thee, noten', color: '#2fd6a5' },
      21: { rate: 21, label: '21%', desc: 'Algemeen tarief — Alcohol, tabak, snacks, overige goederen', color: '#f59e0b' },
    },
    {
      bira: 21, raki: 21, viski: 21, sigara: 21,
      mesrubat: 21, atistirmalik: 21, kuruyemis: 9, kahvecay: 9,
    }
  ),

  ar: profile(
    'ar', 'المملكة العربية السعودية / الشرق الأوسط', 'ضريبة القيمة المضافة', [0, 5, 15], 15,
    {
      0: { rate: 0, label: '0%', desc: 'نسبة الصفر / معفى — التوريدات المعفاة', color: '#7d8ca0' },
      5: { rate: 5, label: '5%', desc: 'النسبة الأساسية المخفضة (الإمارات / البحرين)', color: '#5aa2f0' },
      15: { rate: 15, label: '15%', desc: 'النسبة الأساسية القياسية (السعودية)', color: '#f59e0b' },
    },
    {
      bira: 15, raki: 15, viski: 15, sigara: 15,
      mesrubat: 15, atistirmalik: 15, kuruyemis: 15, kahvecay: 15,
    }
  ),

  ru: profile(
    'ru', 'Россия', 'НДС', [0, 10, 20], 20,
    {
      0: { rate: 0, label: '0%', desc: 'Ставка 0% — Экспорт, международные перевозки', color: '#7d8ca0' },
      10: { rate: 10, label: '10%', desc: 'Льготная ставка — Продукты питания, детские товары, хлеб, орехи, кофе, чай', color: '#2fd6a5' },
      20: { rate: 20, label: '20%', desc: 'Основная ставка — Алкоголь, табак, напитки, прочие товары', color: '#f59e0b' },
    },
    {
      bira: 20, raki: 20, viski: 20, sigara: 20,
      mesrubat: 20, atistirmalik: 10, kuruyemis: 10, kahvecay: 10,
    }
  ),
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

/**
 * Ürünün geçerli KDV oranını döndürür.
 * 1) Ürün kartında açıkça girilmiş bir oran varsa YALNIZCA seçili ülkenin
 *    geçerli oranlarından biriyse kullanılır (yabancı/geçersiz oran sızmasın).
 * 2) Aksi halde ürün kategorisine göre seçili ülkenin oranı önerilir.
 * 3) Ürün bulunamazsa ülkenin varsayılan oranı kullanılır.
 */
export const resolveProductVatRate = (name: string, products: Product[], locale: Locale = 'tr'): number => {
  const prof = COUNTRY_VAT_PROFILES[locale] ?? COUNTRY_VAT_PROFILES.tr;
  const p = products.find((x) => x.name.toLowerCase() === name.toLowerCase());

  if (p?.vatRate != null && prof.rates.includes(p.vatRate)) return p.vatRate;

  const rate = prof.suggestRate(p?.category ?? '');
  return prof.rates.includes(rate) ? rate : prof.defaultRate;
};
