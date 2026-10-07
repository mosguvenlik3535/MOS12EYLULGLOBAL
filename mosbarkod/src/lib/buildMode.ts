/**
 * Derleme modu — demo ve Play Store (satış kotası) bayrakları.
 *
 * CI'da demo EXE/APK üretilirken `VITE_DEMO=1` ortam değişkeniyle derlenir.
 * Demo sürümde lisans kapısı açık başlar, görünür "DEMO SÜRÜM" rozeti gösterilir
 * ve belirli satış sayısından sonra tam sürüm lisansı istenir.
 *
 * Play Store sürümü (AAB) `VITE_PLAY=1` ile derlenir: çevrimdışı lisans kapısı
 * yerine 1.000 satışlık demo + Play Billing PRO aboneliği kullanılır.
 */

import { version as PKG_VERSION } from '../../package.json';

export const IS_DEMO = (import.meta.env.VITE_DEMO ?? '') === '1';

export const IS_PLAY = (import.meta.env.VITE_PLAY ?? '') === '1';

/** Demo sürümde izin verilen azami tamamlanmış satış sayısı. */
export const DEMO_MAX_SALES = 1000;

export const DEMO_LABEL = 'DEMO SÜRÜM';

/** PRO abonelik fiyatları (Play Console'da tanımlı ürünlerle aynı olmalı). */
export const PRO_PRICE = '299 TL/ay';
export const PRO_PRICE_ANNUAL = '2.999 TL/yıl';

/**
 * package.json'daki gerçek sürüm — lisans ekranları, raporlar, altbilgiler ve
 * indirilen kurulum dosyalarındaki "Sürüm" satırları bunu kullanır.
 * Sürüm yalnızca package.json'da yükseltilir; ekrandaki yazılar otomatik güncellenir.
 */
export const APP_VERSION: string = PKG_VERSION;

/** Lisans/güncelleme ekranlarındaki "Sürüm" satırı (örn. v1.8.6-PRO / v1.8.6-PLAY / v1.8.6-DEMO). */
export function appVersionLabel(demo = false): string {
  const suffix = IS_PLAY ? '-PLAY' : demo || IS_DEMO ? '-DEMO' : '-PRO';
  return `v${APP_VERSION}${suffix}`;
}

/** Remaining completed sales in the direct-download demo (not Play satış kotası). */
export const demoSalesRemaining = (sales:number, baseline:number) => Math.max(0,DEMO_MAX_SALES-Math.max(0,sales-baseline));
