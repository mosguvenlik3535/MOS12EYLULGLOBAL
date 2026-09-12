/**
 * Derleme modu — demo ve Play Store (freemium) bayrakları.
 *
 * CI'da demo EXE/APK üretilirken `VITE_DEMO=1` ortam değişkeniyle derlenir.
 * Demo sürümde lisans kapısı açık başlar, görünür "DEMO SÜRÜM" rozeti gösterilir
 * ve belirli satış sayısından sonra tam sürüm lisansı istenir.
 *
 * Play Store sürümü (AAB) `VITE_PLAY=1` ile derlenir: çevrimdışı lisans kapısı
 * yerine ücretsiz başlangıç katmanı + Play Billing PRO aboneliği kullanılır.
 */

export const IS_DEMO = (import.meta.env.VITE_DEMO ?? '') === '1';

export const IS_PLAY = (import.meta.env.VITE_PLAY ?? '') === '1';

/** Demo sürümde izin verilen azami tamamlanmış satış sayısı. */
export const DEMO_MAX_SALES = 50;

export const DEMO_LABEL = 'DEMO SÜRÜM';

/** Play ücretsiz katmanında izin verilen azami ürün sayısı. */
export const FREE_MAX_PRODUCTS = 100;

/** PRO abonelik fiyatları (Play Console'da tanımlı ürünlerle aynı olmalı). */
export const PRO_PRICE = '299 TL/ay';
export const PRO_PRICE_ANNUAL = '2.999 TL/yıl';
