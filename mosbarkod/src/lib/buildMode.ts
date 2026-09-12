/**
 * Derleme modu — demo sürüm bayrağı.
 *
 * CI'da demo EXE/APK üretilirken `VITE_DEMO=1` ortam değişkeniyle derlenir.
 * Demo sürümde lisans kapısı açık başlar, görünür "DEMO SÜRÜM" rozeti gösterilir
 * ve belirli satış sayısından sonra tam sürüm lisansı istenir.
 */

export const IS_DEMO = (import.meta.env.VITE_DEMO ?? '') === '1';

/** Demo sürümde izin verilen azami tamamlanmış satış sayısı. */
export const DEMO_MAX_SALES = 50;

export const DEMO_LABEL = 'DEMO SÜRÜM';
