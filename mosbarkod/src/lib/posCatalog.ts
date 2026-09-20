/**
 * Ülke Bazlı POS Marka Kataloğu.
 *
 * Her ülkenin yaygın POS cihaz markaları ve modelleri farklıdır. Bu katalog
 * entegrasyon ekranını ülkeye göre filtreler ve her marka için önerilen
 * bağlantı ayarlarını (tür, port, kodlama) sunarak kurulumu kolaylaştırır.
 */

export type PosConnType = 'tcp' | 'serial' | 'usb' | 'mobile' | 'http';

export interface PosCountry {
  id: string; // dil/ülke kodu (tr, en, de, ...) — Flag bileşeniyle eşleşir
  name: string;
  tip: string;
}

export interface PosBrand {
  id: string;
  name: string;
  country: string;
  models: string[];
  /** Bu marka için önerilen bağlantı türü */
  defaultConn: PosConnType;
  defaultPort?: number;
  defaultEncoding?: 'utf8' | 'cp857' | 'cp1254';
  /** Kurulum ipucu */
  tip?: string;
}

export const POS_COUNTRIES: PosCountry[] = [
  { id: 'tr', name: 'Türkiye', tip: 'Türkiye’de banka POS’ları (Ziraat, Garanti, YKB, Akbank…) ile Beko, Ingenico ve Verifone terminalleri yaygındır. Banka cihazları genelde HTTP API (sanal POS) veya banka VPN’i üzerinden TCP ile bağlanır.' },
  { id: 'en', name: 'Birleşik Krallık', tip: 'İngiltere’de SumUp, Zettle ve Dojo gibi bulut tabanlı okuyucuların yanı sıra Barclaycard ve Worldpay terminalleri kullanılır.' },
  { id: 'de', name: 'Almanya', tip: 'Almanya’da Verifone, Ingenico, PAX ve Worldline terminalleri; küçük işletmelerde SumUp / Zettle yaygındır.' },
  { id: 'fr', name: 'Fransa', tip: 'Fransa’da Ingenico (yerli marka) açık ara liderdir; Worldline ve Verifone da sık kullanılır.' },
  { id: 'es', name: 'İspanya', tip: 'İspanya’da Ingenico ve Verifone terminalleri ile Redsys üzerinden çalışan banka POS’ları yaygındır.' },
  { id: 'it', name: 'İtalya', tip: 'İtalya’da Nexi, Ingenico ve Verifone; küçük işletmelerde myPOS ve SumUp sık görülür.' },
  { id: 'pt', name: 'Brezilya', tip: 'Brezilya’da Cielo, Rede, Getnet, Stone ve PagSeguro gibi yerel edinici POS’lar yaygındır; Ingenico/PAX donanımları kullanılır.' },
  { id: 'ru', name: 'Rusya', tip: 'Rusya’da Sberbank (Evotor) ve ATOL kasa-POS sistemleri ile Ingenico/PAX terminalleri yaygındır.' },
  { id: 'ar', name: 'Suudi Arabistan', tip: 'Körfez’de mada şeması üzerinden çalışan Network International, Geidea ve PAX/Ingenico terminalleri yaygındır.' },
  { id: 'zh', name: 'Çin', tip: 'Çin’de Sunmi ve Newland gibi yerli üreticiler öndedir; Alipay / WeChat Pay QR kabulü yaygındır.' },
  { id: 'pl', name: 'Polonya', tip: 'Polonya’da Ingenico, Verifone, PAX terminalleri ile SumUp / myPOS bulut okuyucuları yaygındır.' },
  { id: 'ro', name: 'Romanya', tip: 'Romanya’da Ingenico, Verifone ve PAX; myPOS / SumUp da sık kullanılır.' },
  { id: 'el', name: 'Yunanistan', tip: 'Yunanistan’da Ingenico, Verifone, PAX ve Nexi terminalleri yaygındır.' },
  { id: 'nl', name: 'Hollanda', tip: 'Hollanda’da CCV, Ingenico, Verifone terminalleri ile SumUp / Zettle yaygındır.' },
];

export const POS_BRANDS: PosBrand[] = [
  /* ---------- Türkiye ---------- */
  { id: 'beko', name: 'Beko', country: 'tr', models: ['Beko 400 TR', 'Beko 500 TR', 'Beko 600 TR', 'Beko 400 TR FE'], defaultConn: 'tcp', defaultPort: 2030, defaultEncoding: 'cp857', tip: 'Ethernet üzerinden sabit IP ile bağlanır; cihaz menüsünden TCP portunu 2030 yapın.' },
  { id: 'ziraat', name: 'Ziraat Bankası POS', country: 'tr', models: ['Ziraat Mobil POS', 'Ziraat Sabit POS'], defaultConn: 'http', defaultEncoding: 'cp857', tip: 'Ziraat sanal POS API uç noktasını girin; terminal ID ve anahtar bankadan alınır.' },
  { id: 'garanti', name: 'Garanti BBVA POS', country: 'tr', models: ['Garanti Mobil POS', 'Garanti Sabit POS'], defaultConn: 'http', defaultEncoding: 'cp857', tip: 'Garanti sanal POS (Provizyon) API bilgilerini girin.' },
  { id: 'ykb', name: 'Yapı Kredi POS', country: 'tr', models: ['YKB Mobil POS', 'YKB Sabit POS'], defaultConn: 'http', defaultEncoding: 'cp857', tip: 'Yapı Kredi sanal POS API uç noktasını kullanın.' },
  { id: 'akbank', name: 'Akbank POS', country: 'tr', models: ['Akbank Mobil POS', 'Akbank Sabit POS'], defaultConn: 'http', defaultEncoding: 'cp857', tip: 'Akbank sanal POS (İş Yeri) API bilgilerini girin.' },
  { id: 'isbank', name: 'İş Bankası POS', country: 'tr', models: ['İşbank Mobil POS', 'İşbank Sabit POS'], defaultConn: 'http', defaultEncoding: 'cp857', tip: 'İş Bankası sanal POS API uç noktasını kullanın.' },
  { id: 'vakif', name: 'VakıfBank POS', country: 'tr', models: ['VakıfBank Mobil POS'], defaultConn: 'http', defaultEncoding: 'cp857', tip: 'VakıfBank sanal POS API bilgilerini girin.' },
  { id: 'deniz', name: 'DenizBank POS', country: 'tr', models: ['DenizBank Mobil POS'], defaultConn: 'http', defaultEncoding: 'cp857', tip: 'DenizBank sanal POS API bilgilerini girin.' },
  { id: 'qnb', name: 'QNB Finansbank POS', country: 'tr', models: ['QNB Mobil POS'], defaultConn: 'http', defaultEncoding: 'cp857', tip: 'QNB Finansbank sanal POS API bilgilerini girin.' },
  { id: 'ing', name: 'ING POS', country: 'tr', models: ['ING Mobil POS'], defaultConn: 'http', defaultEncoding: 'cp857', tip: 'ING Türkiye sanal POS API bilgilerini girin.' },
  { id: 'halkbank', name: 'Halkbank POS', country: 'tr', models: ['Halkbank Mobil POS', 'Halkbank Sabit POS'], defaultConn: 'http', defaultEncoding: 'cp857', tip: 'Halkbank sanal POS API bilgilerini girin.' },
  { id: 'datecs', name: 'Datecs', country: 'tr', models: ['MP55', 'MP55S', 'FP-700'], defaultConn: 'serial', defaultEncoding: 'cp857', tip: 'Datecs cihazları genelde seri port (RS232) üzerinden bağlanır.' },

  /* ---------- Uluslararası donanım (birçok ülkede ortak) ---------- */
  { id: 'verifone', name: 'Verifone', country: 'tr', models: ['VX 520', 'VX 680', 'VX 690', 'Engage V400m', 'Engage V600m', 'P400'], defaultConn: 'tcp', defaultPort: 2030, defaultEncoding: 'utf8' },
  { id: 'verifone', name: 'Verifone', country: 'en', models: ['VX 690', 'Engage V400m', 'P400'], defaultConn: 'tcp', defaultPort: 2030, defaultEncoding: 'utf8' },
  { id: 'verifone', name: 'Verifone', country: 'de', models: ['VX 690', 'Engage V400m', 'P400'], defaultConn: 'tcp', defaultPort: 2030, defaultEncoding: 'utf8' },
  { id: 'verifone', name: 'Verifone', country: 'fr', models: ['VX 690', 'P400'], defaultConn: 'tcp', defaultPort: 2030, defaultEncoding: 'utf8' },
  { id: 'verifone', name: 'Verifone', country: 'es', models: ['VX 690', 'Engage V400m'], defaultConn: 'tcp', defaultPort: 2030, defaultEncoding: 'utf8' },
  { id: 'verifone', name: 'Verifone', country: 'it', models: ['VX 690', 'P400'], defaultConn: 'tcp', defaultPort: 2030, defaultEncoding: 'utf8' },
  { id: 'verifone', name: 'Verifone', country: 'ru', models: ['VX 690', 'P400'], defaultConn: 'tcp', defaultPort: 2030, defaultEncoding: 'utf8' },
  { id: 'verifone', name: 'Verifone', country: 'ar', models: ['VX 690', 'Engage V400m'], defaultConn: 'tcp', defaultPort: 2030, defaultEncoding: 'utf8' },
  { id: 'verifone', name: 'Verifone', country: 'pl', models: ['VX 690', 'P400'], defaultConn: 'tcp', defaultPort: 2030, defaultEncoding: 'utf8' },
  { id: 'verifone', name: 'Verifone', country: 'ro', models: ['VX 690', 'P400'], defaultConn: 'tcp', defaultPort: 2030, defaultEncoding: 'utf8' },
  { id: 'verifone', name: 'Verifone', country: 'el', models: ['VX 690', 'P400'], defaultConn: 'tcp', defaultPort: 2030, defaultEncoding: 'utf8' },
  { id: 'verifone', name: 'Verifone', country: 'nl', models: ['VX 690', 'P400'], defaultConn: 'tcp', defaultPort: 2030, defaultEncoding: 'utf8' },

  { id: 'ingenico', name: 'Ingenico', country: 'tr', models: ['iCT220', 'iCT250', 'iWL220', 'iWL250', 'Move 5000', 'Lane 3000'], defaultConn: 'tcp', defaultPort: 2030, defaultEncoding: 'utf8' },
  { id: 'ingenico', name: 'Ingenico', country: 'en', models: ['iCT250', 'Move 5000', 'Lane 3000', 'AXIUM DX8000'], defaultConn: 'tcp', defaultPort: 2030, defaultEncoding: 'utf8' },
  { id: 'ingenico', name: 'Ingenico', country: 'de', models: ['iCT250', 'Move 5000', 'Lane 3000', 'AXIUM'], defaultConn: 'tcp', defaultPort: 2030, defaultEncoding: 'utf8' },
  { id: 'ingenico', name: 'Ingenico', country: 'fr', models: ['iCT250', 'iWL250', 'Move 5000', 'Lane 3000', 'AXIUM'], defaultConn: 'tcp', defaultPort: 2030, defaultEncoding: 'utf8' },
  { id: 'ingenico', name: 'Ingenico', country: 'es', models: ['iCT250', 'Move 5000', 'Lane 3000'], defaultConn: 'tcp', defaultPort: 2030, defaultEncoding: 'utf8' },
  { id: 'ingenico', name: 'Ingenico', country: 'it', models: ['Move 5000', 'iCT250', 'Lane 3000'], defaultConn: 'tcp', defaultPort: 2030, defaultEncoding: 'utf8' },
  { id: 'ingenico', name: 'Ingenico', country: 'ru', models: ['iCT250', 'Move 5000'], defaultConn: 'tcp', defaultPort: 2030, defaultEncoding: 'utf8' },
  { id: 'ingenico', name: 'Ingenico', country: 'ar', models: ['iCT250', 'Move 5000', 'Lane 3000'], defaultConn: 'tcp', defaultPort: 2030, defaultEncoding: 'utf8' },
  { id: 'ingenico', name: 'Ingenico', country: 'zh', models: ['Lane 3000'], defaultConn: 'tcp', defaultPort: 2030, defaultEncoding: 'utf8' },
  { id: 'ingenico', name: 'Ingenico', country: 'pl', models: ['iCT250', 'Move 5000'], defaultConn: 'tcp', defaultPort: 2030, defaultEncoding: 'utf8' },
  { id: 'ingenico', name: 'Ingenico', country: 'ro', models: ['iCT250', 'Move 5000'], defaultConn: 'tcp', defaultPort: 2030, defaultEncoding: 'utf8' },
  { id: 'ingenico', name: 'Ingenico', country: 'el', models: ['iCT250', 'Move 5000'], defaultConn: 'tcp', defaultPort: 2030, defaultEncoding: 'utf8' },
  { id: 'ingenico', name: 'Ingenico', country: 'nl', models: ['iCT250', 'Move 5000'], defaultConn: 'tcp', defaultPort: 2030, defaultEncoding: 'utf8' },

  { id: 'pax', name: 'PAX', country: 'tr', models: ['S80', 'S90', 'A920', 'A920 Pro', 'D210'], defaultConn: 'tcp', defaultPort: 2030, defaultEncoding: 'utf8' },
  { id: 'pax', name: 'PAX', country: 'en', models: ['A920', 'A920 Pro', 'IM30'], defaultConn: 'tcp', defaultPort: 2030, defaultEncoding: 'utf8' },
  { id: 'pax', name: 'PAX', country: 'de', models: ['A920', 'IM30'], defaultConn: 'tcp', defaultPort: 2030, defaultEncoding: 'utf8' },
  { id: 'pax', name: 'PAX', country: 'fr', models: ['A920'], defaultConn: 'tcp', defaultPort: 2030, defaultEncoding: 'utf8' },
  { id: 'pax', name: 'PAX', country: 'es', models: ['A920', 'D210'], defaultConn: 'tcp', defaultPort: 2030, defaultEncoding: 'utf8' },
  { id: 'pax', name: 'PAX', country: 'it', models: ['A920'], defaultConn: 'tcp', defaultPort: 2030, defaultEncoding: 'utf8' },
  { id: 'pax', name: 'PAX', country: 'ru', models: ['S80', 'A920'], defaultConn: 'tcp', defaultPort: 2030, defaultEncoding: 'utf8' },
  { id: 'pax', name: 'PAX', country: 'ar', models: ['A920', 'S80'], defaultConn: 'tcp', defaultPort: 2030, defaultEncoding: 'utf8' },
  { id: 'pax', name: 'PAX', country: 'zh', models: ['S80', 'A920', 'D210'], defaultConn: 'tcp', defaultPort: 2030, defaultEncoding: 'utf8' },
  { id: 'pax', name: 'PAX', country: 'pl', models: ['A920', 'IM30'], defaultConn: 'tcp', defaultPort: 2030, defaultEncoding: 'utf8' },
  { id: 'pax', name: 'PAX', country: 'ro', models: ['A920'], defaultConn: 'tcp', defaultPort: 2030, defaultEncoding: 'utf8' },
  { id: 'pax', name: 'PAX', country: 'el', models: ['A920'], defaultConn: 'tcp', defaultPort: 2030, defaultEncoding: 'utf8' },
  { id: 'pax', name: 'PAX', country: 'nl', models: ['A920'], defaultConn: 'tcp', defaultPort: 2030, defaultEncoding: 'utf8' },

  { id: 'newland', name: 'Newland', country: 'tr', models: ['N95', 'N94', 'N86', 'N7000'], defaultConn: 'tcp', defaultPort: 2030, defaultEncoding: 'utf8' },
  { id: 'newland', name: 'Newland', country: 'zh', models: ['N95', 'N86', 'N7000', 'K310'], defaultConn: 'tcp', defaultPort: 2030, defaultEncoding: 'utf8' },

  { id: 'sunmi', name: 'Sunmi', country: 'tr', models: ['V2', 'V2 Pro', 'P2', 'T2 Pro', 'M2'], defaultConn: 'tcp', defaultPort: 2030, defaultEncoding: 'utf8' },
  { id: 'sunmi', name: 'Sunmi', country: 'zh', models: ['V2', 'V2 Pro', 'P2', 'T2 Pro', 'M2', 'K2'], defaultConn: 'tcp', defaultPort: 2030, defaultEncoding: 'utf8' },

  /* ---------- Bulut / uygulama tabanlı okuyucular ---------- */
  { id: 'sumup', name: 'SumUp', country: 'en', models: ['SumUp Air', 'SumUp Solo'], defaultConn: 'http', defaultEncoding: 'utf8', tip: 'SumUp işlemleri bulut API üzerinden yapılır; cihaz Bluetooth ile eşleştirilir.' },
  { id: 'sumup', name: 'SumUp', country: 'de', models: ['SumUp Air', 'SumUp Solo'], defaultConn: 'http', defaultEncoding: 'utf8' },
  { id: 'sumup', name: 'SumUp', country: 'fr', models: ['SumUp Air'], defaultConn: 'http', defaultEncoding: 'utf8' },
  { id: 'sumup', name: 'SumUp', country: 'it', models: ['SumUp Air'], defaultConn: 'http', defaultEncoding: 'utf8' },
  { id: 'sumup', name: 'SumUp', country: 'pl', models: ['SumUp Air', 'SumUp Solo'], defaultConn: 'http', defaultEncoding: 'utf8' },
  { id: 'sumup', name: 'SumUp', country: 'ro', models: ['SumUp Air'], defaultConn: 'http', defaultEncoding: 'utf8' },
  { id: 'sumup', name: 'SumUp', country: 'nl', models: ['SumUp Air'], defaultConn: 'http', defaultEncoding: 'utf8' },

  { id: 'zettle', name: 'Zettle (PayPal)', country: 'en', models: ['Zettle Reader 2', 'Zettle Terminal'], defaultConn: 'http', defaultEncoding: 'utf8', tip: 'Zettle (eski iZettle) bulut API üzerinden çalışır.' },
  { id: 'zettle', name: 'Zettle (PayPal)', country: 'de', models: ['Zettle Terminal', 'Zettle Reader 2'], defaultConn: 'http', defaultEncoding: 'utf8' },
  { id: 'zettle', name: 'Zettle (PayPal)', country: 'nl', models: ['Zettle Terminal'], defaultConn: 'http', defaultEncoding: 'utf8' },

  { id: 'dojo', name: 'Dojo', country: 'en', models: ['Dojo Go', 'Dojo Compact'], defaultConn: 'http', defaultEncoding: 'utf8' },
  { id: 'barclaycard', name: 'Barclaycard', country: 'en', models: ['Smartpay Touch', 'Smartpay Mini'], defaultConn: 'http', defaultEncoding: 'utf8' },
  { id: 'worldpay', name: 'Worldpay', country: 'en', models: ['V400m'], defaultConn: 'http', defaultEncoding: 'utf8' },

  { id: 'worldline', name: 'Worldline', country: 'de', models: ['Yomani', 'Yoximo'], defaultConn: 'http', defaultEncoding: 'utf8' },
  { id: 'worldline', name: 'Worldline', country: 'fr', models: ['Yomani', 'Yoximo'], defaultConn: 'http', defaultEncoding: 'utf8' },
  { id: 'worldline', name: 'Worldline', country: 'es', models: ['Yomani'], defaultConn: 'http', defaultEncoding: 'utf8' },

  { id: 'mypos', name: 'myPOS', country: 'en', models: ['myPOS Smart', 'myPOS Mini'], defaultConn: 'http', defaultEncoding: 'utf8' },
  { id: 'mypos', name: 'myPOS', country: 'it', models: ['myPOS Smart'], defaultConn: 'http', defaultEncoding: 'utf8' },
  { id: 'mypos', name: 'myPOS', country: 'es', models: ['myPOS Smart'], defaultConn: 'http', defaultEncoding: 'utf8' },
  { id: 'mypos', name: 'myPOS', country: 'pl', models: ['myPOS Smart'], defaultConn: 'http', defaultEncoding: 'utf8' },
  { id: 'mypos', name: 'myPOS', country: 'ro', models: ['myPOS Smart'], defaultConn: 'http', defaultEncoding: 'utf8' },
  { id: 'mypos', name: 'myPOS', country: 'el', models: ['myPOS Smart'], defaultConn: 'http', defaultEncoding: 'utf8' },

  { id: 'nexi', name: 'Nexi', country: 'it', models: ['Nexi SmartPOS', 'Nexi Go'], defaultConn: 'http', defaultEncoding: 'utf8' },
  { id: 'nexi', name: 'Nexi', country: 'el', models: ['Nexi SmartPOS'], defaultConn: 'http', defaultEncoding: 'utf8' },

  /* ---------- Ülkeye özel ediniciler ---------- */
  { id: 'cielo', name: 'Cielo', country: 'pt', models: ['Cielo LIO', 'Cielo LIO On'], defaultConn: 'http', defaultEncoding: 'utf8', tip: 'Cielo bulut API’si ile çalışır; LIO cihazı Wi-Fi/4G üzerinden bağlanır.' },
  { id: 'rede', name: 'Rede', country: 'pt', models: ['Rede Smart', 'Rede MOBI'], defaultConn: 'http', defaultEncoding: 'utf8' },
  { id: 'getnet', name: 'Getnet', country: 'pt', models: ['POS Getnet', 'Getnet S920'], defaultConn: 'http', defaultEncoding: 'utf8' },
  { id: 'stone', name: 'Stone', country: 'pt', models: ['Stone T2', 'Stone P2'], defaultConn: 'http', defaultEncoding: 'utf8' },
  { id: 'pagseguro', name: 'PagSeguro', country: 'pt', models: ['Moderninha Pro', 'Minizinha'], defaultConn: 'http', defaultEncoding: 'utf8' },

  { id: 'sberbank', name: 'Sberbank (Evotor)', country: 'ru', models: ['SberPOS', 'Evotor 5', 'Evotor 10'], defaultConn: 'http', defaultEncoding: 'utf8', tip: 'Evotor ekosistemi bulut API üzerinden çalışır.' },
  { id: 'atol', name: 'ATOL', country: 'ru', models: ['ATOL 15F', 'ATOL Sigma'], defaultConn: 'http', defaultEncoding: 'utf8' },

  { id: 'networkintl', name: 'Network International', country: 'ar', models: ['N-Genius'], defaultConn: 'http', defaultEncoding: 'utf8', tip: 'N-Genius API üzerinden mada şemasıyla çalışır.' },
  { id: 'geidea', name: 'Geidea', country: 'ar', models: ['Geidea POS'], defaultConn: 'http', defaultEncoding: 'utf8' },

  { id: 'ccv', name: 'CCV', country: 'nl', models: ['CCV SmartVend', 'CCV A920'], defaultConn: 'tcp', defaultPort: 2030, defaultEncoding: 'utf8' },
];

/* ---------- Yardımcılar ---------- */

export const countryById = (id: string): PosCountry | undefined => POS_COUNTRIES.find((c) => c.id === id);

/** Ülkeye göre marka listesi (model listesini o ülke için verir). */
export const brandsForCountry = (countryId: string): PosBrand[] =>
  POS_BRANDS.filter((b) => b.country === countryId);

/** Tüm ülkelerdeki tüm markalar (marka kimliği tekrarlı olabilir; ilk eşleşme yeterli). */
export const brandById = (id: string): PosBrand | undefined => POS_BRANDS.find((b) => b.id === id);

/** Belirli bir marka+ülke eşleşmesi. */
export const brandForCountry = (countryId: string, brandId: string): PosBrand | undefined =>
  POS_BRANDS.find((b) => b.country === countryId && b.id === brandId) ?? brandById(brandId);
