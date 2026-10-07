import { DEMO_MAX_SALES } from './buildMode';

/** Separate from business data: importing/deleting sales never refills the trial.
 * Per-installation accounting, not server-side tamper protection. Existing Play
 * installs receive their allowance when first upgraded to this trial model.
 */
export const PLAY_TRIAL_KEY = 'mosbarcode_play_completed_sales_v1';
export type TrialStorage = Pick<Storage, 'getItem' | 'setItem'>;
export function readPlayTrialUsage(storage: TrialStorage = localStorage): number {
  try {
    const raw = storage.getItem(PLAY_TRIAL_KEY);
    if (raw === null) return 0;
    const used = Number(raw);
    return raw.trim() && Number.isSafeInteger(used) && used >= 0 ? Math.min(used, DEMO_MAX_SALES) : DEMO_MAX_SALES;
  } catch { return DEMO_MAX_SALES; }
}
export const playTrialRemaining = (used: number) => Math.max(0, DEMO_MAX_SALES - used);
/** Call ONLY on a validated completed sale, never a refund, draft or cancelled payment. */
export function consumePlayTrialSale(storage: TrialStorage = localStorage, pro = false): {allowed:boolean;used:number;reason?:'limit'|'storage'} {
  const used=readPlayTrialUsage(storage);
  if(pro) return {allowed:true,used};
  if(used>=DEMO_MAX_SALES) return {allowed:false,used,reason:'limit'};
  try {
    storage.setItem(PLAY_TRIAL_KEY,String(used+1));
    if(storage.getItem(PLAY_TRIAL_KEY)!==String(used+1)) throw new Error('Trial usage not persisted');
    return {allowed:true,used:used+1};
  } catch { return {allowed:false,used,reason:'storage'}; }
}
