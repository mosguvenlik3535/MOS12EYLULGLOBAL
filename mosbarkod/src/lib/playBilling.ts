/**
 * Play Billing köprüsü (cordova-plugin-purchase / CdvPurchase).
 *
 * Yalnızca Android Play derlemesinde (VITE_PLAY=1) kullanılır. `CdvPurchase`
 * global'i native taraftan WebView'e enjekte edilir; masaüstü (Electron),
 * düz web ve sideload APK'larda MEVCUT DEĞİLDİR. Bu yüzden tüm fonksiyonlar
 * güvenle çalışır: store yoksa "yok / aktif değil" döner, asla çökmez.
 */

/** Play Console'da tanımlı PRO (aylık) abonelik ürün kimliği. */
export const PRO_ID = 'mos_pro_aylik';

const PLAY_PLATFORM = 'android-playstore';
const SUBSCRIPTION_TYPE = 'paid subscription';

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyStore = any;

const getStore = (): AnyStore | null => {
  try {
    const w = window as unknown as { CdvPurchase?: { store: AnyStore } };
    return w.CdvPurchase?.store ?? null;
  } catch {
    return null;
  }
};

export const isPlayBillingAvailable = (): boolean => getStore() !== null;

/** PRO (aylık) aboneliğin şu an aktif olup olmadığı. */
export const isProActive = (): boolean => {
  const st = getStore();
  if (!st) return false;
  try {
    return Boolean(st.get(PRO_ID, PLAY_PLATFORM)?.owned);
  } catch {
    return false;
  }
};

/** Store'u başlatır; sahiplik değişince onPro çağrılır. */
export async function initPlayBilling(onPro: (pro: boolean) => void): Promise<boolean> {
  const st = getStore();
  if (!st) return false;
  try {
    st.verbosity = 1; // CdvPurchase.LogLevel.ERROR
    st.register([{ id: PRO_ID, type: SUBSCRIPTION_TYPE, platform: PLAY_PLATFORM }]);
    st.when().approved((tx: AnyStore) => {
      if (!tx.products?.some((p: {id:string})=>p.id===PRO_ID)) return;
      try {
        tx.finish();
      } catch {
        /* yoksay */
      }
      onPro(isProActive());
    });
    st.when().updated(() => onPro(isProActive()));
    const errors = await st.initialize([PLAY_PLATFORM]);
    if (errors?.length) return false;
    onPro(isProActive());
    return true;
  } catch {
    return false;
  }
}

export type PurchaseResult = 'ok' | 'fail' | 'unavailable';

export async function purchasePro(): Promise<PurchaseResult> {
  const st = getStore();
  if (!st) return 'unavailable';
  try {
    const offer = st.get(PRO_ID, PLAY_PLATFORM)?.getOffer();
    if (!offer) return 'fail';
    const error = await st.order(offer);
    return error ? 'fail' : 'ok';
  } catch {
    return 'fail';
  }
}

export async function restorePro(): Promise<boolean> {
  const st = getStore();
  if (!st) return false;
  try {
    const error = await st.restorePurchases();
    if(error) return false;
    return isProActive();
  } catch {
    return false;
  }
}

/** Localized price from the actual Google Play product, never a hard-coded checkout price. */
export function getProPrice(): string | null {
  try { return getStore()?.get(PRO_ID,PLAY_PLATFORM)?.pricing?.price || null; }
  catch { return null; }
}
