import type { Locale } from '../locales/i18n';
import { getCountryVatProfile } from '../locales/countryVat';

/**
 * Donanım entegrasyon kataloğu.
 *
 * Her cihaz tipi; bağlantı protokolü, dünya genelinde yaygın modeller ve
 * seçili ülkeye (locale) özel önerilen modellerle tanımlanır. Böylece
 * her ülkenin bayisinin kendi pazarında bulduğu ekipmanla uyumlu çalışır.
 */

export interface HardwareDevice {
  id: string;
  icon: string;
  name: string;        // Türkçe ad
  protocols: string;   // bağlantı protokolü / teknik özellik
  models: string;      // dünya genelinde yaygın modeller
  regions?: Partial<Record<Locale, string>>; // ülkeye özel yaygın modeller
}

export const HARDWARE_DEVICES: HardwareDevice[] = [
  {
    id: 'reader',
    icon: 'barcode',
    name: 'Barkod Okuyucu',
    protocols: 'USB-HID (klavye) · Bluetooth · RS232',
    models: 'Zebra DS2208 · Honeywell Voyager 1452g · Datalogic QuickScan · Newland HR32',
    regions: {
      tr: 'Newland, Zebra, Honeywell — USB tak-çalıştır (klavye gibi okur)',
      en: 'Zebra DS2208, Honeywell Voyager 1472g, Datalogic',
      de: 'Datalogic Gryphon, Zebra, Honeywell',
      fr: 'Zebra DS2200, Datalogic, Honeywell',
      it: 'Datalogic, Zebra, Honeywell',
      es: 'Zebra, Honeywell, Datalogic',
      pt: 'Elgin, Gertec, Zebra (USB HID)',
      zh: 'Newland, Mindeo, Honeywell',
      ru: 'Honeywell, Zebra, Атол (USB HID)',
      pl: 'Honeywell, Zebra, Datalogic',
      ro: 'Honeywell, Zebra, Datalogic',
      el: 'Honeywell, Zebra, Datalogic',
      nl: 'Zebra, Honeywell, Datalogic',
      ar: 'Zebra, Honeywell, Datalogic',
    },
  },
  {
    id: 'receipt',
    icon: 'print',
    name: 'Fiş / Terminal Yazıcı',
    protocols: 'ESC/POS · 58mm/80mm · USB/Ethernet/Bluetooth',
    models: 'Epson TM-T20 / TM-T88 · Star TSP100 · Bixolon SRP-350 · Custom VKP80',
    regions: {
      tr: 'Epson, Bixolon, Star — ESC/POS ile tam uyumlu',
      en: 'Epson TM-T20, Star TSP650',
      de: 'Epson TM-T88VI, Star, Bixolon',
      fr: 'Epson TM-T88, Star, Bixolon',
      it: 'Epson, Custom, Star',
      es: 'Epson, Star, Bixolon',
      pt: 'Elgin i9, Bematech MP-4200, Epson',
      zh: 'Epson, Xprinter, Gprinter',
      ru: 'Атол, Штрих-М, Epson (ESC/POS)',
      pl: 'Epson, Posnet, Novitus',
      ro: 'Epson, Star, Datecs',
      el: 'Epson, Star, Bixolon',
      nl: 'Epson, Star, Bixolon',
      ar: 'Epson, Star, Bixolon',
    },
  },
  {
    id: 'label',
    icon: 'zap',
    name: 'Barkod Etiket Yazıcısı',
    protocols: 'ZPL · EPL · TSPL · 203/300 dpi termal',
    models: 'Zebra GK420d / ZD421 · TSC TE244 · Argox OS-214 · Godex G500',
    regions: {
      tr: 'Zebra, TSC, Godex — 60x40mm raf etiketi / 40x25mm rulo etiket',
      en: 'Zebra ZD421, TSC TE244',
      de: 'Zebra, TSC, CAB',
      fr: 'Zebra, TSC, CAB',
      it: 'Zebra, TSC, Argox',
      es: 'Zebra, TSC, Godex',
      pt: 'Elgin L42, Argox, Zebra',
      zh: 'TSC, Godex, Postek',
      ru: 'Zebra, TSC, Godex (ZPL)',
      pl: 'Zebra, TSC, Godex',
      ro: 'Zebra, TSC, Godex',
      el: 'Zebra, TSC, Godex',
      nl: 'Zebra, TSC, Godex',
      ar: 'Zebra, TSC, Godex',
    },
  },
  {
    id: 'scale',
    icon: 'scale',
    name: 'Elektronik Terazi',
    protocols: 'RS232 · USB · sürekli / talep modu',
    models: 'CAS · Mettler Toledo · Bizerba · Dibal · Avery Berkel',
    regions: {
      tr: 'CAS, TEM, Dikomsan — RS232 seri port ile kg/lt tartım',
      en: 'Avery Berkel, Mettler Toledo',
      de: 'Bizerba, Mettler Toledo',
      fr: 'Bizerba, Mettler Toledo',
      it: 'Dibal, Bizerba, Mettler Toledo',
      es: 'Dibal, Gram, Mettler Toledo',
      pt: 'Toledo, Filizola',
      zh: '大华 (Dahua), 凯士 (Kingship)',
      ru: 'Масса-К, Штрих-М',
      pl: 'Radwag, CAS',
      ro: 'CAS, Mettler Toledo',
      el: 'CAS, Mettler Toledo',
      nl: 'Mettler Toledo, Bizerba',
      ar: 'CAS, Mettler Toledo',
    },
  },
  {
    id: 'drawer',
    icon: 'wallet',
    name: 'Para Çekmecesi',
    protocols: 'RJ11 · fiş yazıcısı tetikli (kick-out)',
    models: 'APG Vasario · M-S Cash Drawer · Epson · Star',
    regions: {
      tr: 'APG, Epson, Star — fiş yazıcısının RJ11 çıkışından açılır',
      en: 'APG Vasario, M-S Cash Drawer',
      de: 'APG, Epson, Star',
      fr: 'APG, Epson, Star',
      it: 'APG, Epson, Star',
      es: 'APG, Epson, Star',
      pt: 'Elgin, Gertec gaveta',
      zh: 'Posiflex, Partner, APG',
      ru: 'Posiflex, Атол, APG',
      pl: 'Posnet, APG, Epson',
      ro: 'APG, Epson, Star',
      el: 'APG, Epson, Star',
      nl: 'APG, Epson, Star',
      ar: 'APG, Epson, Star',
    },
  },
  {
    id: 'display',
    icon: 'monitor',
    name: 'Müşteri Ekranı (2. Ekran)',
    protocols: 'USB VFD · yerleşik CFD (PWA)',
    models: 'Logic Controls · Partner · Yerleşik Müşteri Bilgi Ekranı',
    regions: {
      tr: 'Logic Controls, Partner — veya yerleşik "2. EKRAN" (CFD) kullanın',
      en: 'Logic Controls, Partner VFD',
      de: 'Logic Controls, Partner',
      fr: 'Logic Controls, Partner',
      it: 'Partner, Logic Controls',
      es: 'Partner, Logic Controls',
      pt: 'Elgin, Gertec visor',
      zh: 'Posiflex, Partner VFD',
      ru: 'Posiflex, Partner VFD',
      pl: 'Posnet, Partner VFD',
      ro: 'Partner, Logic Controls',
      el: 'Partner, Logic Controls',
      nl: 'Partner, Logic Controls',
      ar: 'Partner, Logic Controls',
    },
  },
];

export const DEFAULT_ENABLED_DEVICES = ['reader', 'receipt', 'scale'];

/** Seçili ülke için önerilen modelleri döndürür; ülkeye özel yoksa global listeyi verir. */
export function hardwareRegionModels(device: HardwareDevice, locale: Locale): string {
  return device.regions?.[locale] ?? device.models;
}

/** Seçili ülkenin adını döndürür (ör. "Türkiye", "Deutschland"). */
export function hardwareCountryName(locale: Locale): string {
  return getCountryVatProfile(locale).countryName;
}

/** Aktif donanım listesi — ayarlardan okunur, yoksa varsayılanlar kullanılır. */
export function enabledHardwareDevices(enabledIds: string[] | undefined): HardwareDevice[] {
  const set = enabledIds && enabledIds.length > 0 ? new Set(enabledIds) : new Set(DEFAULT_ENABLED_DEVICES);
  return HARDWARE_DEVICES.filter((d) => set.has(d.id));
}
