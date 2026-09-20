/**
 * Play Billing köprüsü (cordova-plugin-purchase / CdvPurchase).
 *
 * Yalnızca Android Play derlemesinde (VITE_PLAY=1) kullanılır. `CdvPurchase`
 * global'i native taraftan WebView'e enjekte edilir; masaüstü (Electron),
 * düz web ve sideload APK'larda MEVCUT DEĞİLDİR. Bu yüzden tüm fonksiyonlar
 * güvenle çalışır: store yoksa "yok / aktif değil" döner, asla çökmez.
 */

/** Play Console'da tanımlı PRO (aylık) abonelik ürün kimliği. */
const PRO_ID = 'mos_pro_aylik';

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
    return Boolean(st.get(PRO_ID, st.GOOGLE_PLAY)?.owned);
  } catch {
    return false;
  }
};

/** Store'u başlatır; sahiplik değişince onPro çağrılır. */
export async function initPlayBilling(onPro: (pro: boolean) => void): Promise<boolean> {
  const st = getStore();
  if (!st) return false;
  try {
    st.verbosity = st.ERROR;
    st.register([{ id: PRO_ID, type: st.PAID_SUBSCRIPTION }]);
    st.when().approved((tx: AnyStore) => {
      try {
        tx.finish();
      } catch {
        /* yoksay */
      }
      onPro(true);
    });
    st.when().updated(() => onPro(isProActive()));
    await st.initialize([st.GOOGLE_PLAY]);
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
    const offer = st.get(PRO_ID, st.GOOGLE_PLAY)?.getOffer();
    if (!offer) return 'fail';
    await st.order(offer);
    return 'ok';
  } catch {
    return 'fail';
  }
}

export async function restorePro(): Promise<boolean> {
  const st = getStore();
  if (!st) return false;
  try {
    await st.restorePurchases();
    return isProActive();
  } catch {
    return false;
  }
}
