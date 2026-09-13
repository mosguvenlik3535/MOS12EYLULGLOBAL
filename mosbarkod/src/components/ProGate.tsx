import { Ic } from '../icons';
import { Btn } from './ui';
import { PRO_PRICE } from '../lib/buildMode';

/* ==================================================================
   PRO KİLİT PANELLERİ (Play Store ücretsiz sürüm)
   ------------------------------------------------------------------
   Ücretsiz sürümde kilitli özelliklerin yerine gösterilen paneller.
   Kilit mantığı App.tsx'te tek yerden hesaplanır:
     proLocked = IS_PLAY && !licensed && !pro
   (yalnızca Play derlemesinin ücretsiz katmanında true olur;
   masaüstü, demove lisanslı APK'lar etkilenmez.)
   ================================================================== */

export function ProLockedPanel({
  icon,
  title,
  desc,
  features,
  onUpgrade,
}: {
  icon: string;
  title: string;
  desc: string;
  features: string[];
  onUpgrade: () => void;
}) {
  return (
    <div className="flex h-full items-center justify-center overflow-y-auto p-4">
      <div className="anim-pop w-full max-w-md rounded-2xl border border-amber/30 bg-panel p-6 text-center shadow-2xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-amber/40 bg-amber/10 text-amber2">
          <Ic n={icon} c="h-7 w-7" />
        </div>
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-amber/50 bg-amber/10 px-3 py-1 font-mono text-[10px] font-black tracking-[0.2em] text-amber2">
          <Ic n="lock" c="h-3 w-3" /> PRO'YA ÖZEL
        </div>
        <h2 className="mt-2 font-mono text-[16px] font-bold">{title}</h2>
        <p className="mt-1 text-[12px] leading-relaxed text-mut">{desc}</p>
        <ul className="mt-4 space-y-1.5 text-left">
          {features.map((f) => (
            <li key={f} className="flex items-center gap-2 text-[12.5px] text-txt">
              <Ic n="check" c="h-4 w-4 shrink-0 text-mint" />
              {f}
            </li>
          ))}
        </ul>
        <Btn v="mint" onClick={onUpgrade} className="mt-5 w-full gap-2 py-3 font-bold">
          <Ic n="star" c="h-4 w-4" /> PRO'ya Yükselt — {PRO_PRICE}
        </Btn>
      </div>
    </div>
  );
}

/** Analiz ekranı içi gibi dar alanlara gömülen kompakt kilit kutusu. */
export function ProLockedMini({
  title,
  desc,
  onUpgrade,
}: {
  title: string;
  desc: string;
  onUpgrade: () => void;
}) {
  return (
    <button
      onClick={onUpgrade}
      className="group flex w-full items-center gap-3 rounded-xl border border-dashed border-amber/50 bg-amber/5 p-4 text-left transition-colors hover:border-amber hover:bg-amber/10"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber/40 bg-amber/10 text-amber2">
        <Ic n="lock" c="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-mono text-[12.5px] font-bold text-txt">
          {title} <span className="ml-1 rounded bg-amber/20 px-1.5 py-0.5 font-mono text-[9px] font-black text-amber2">PRO</span>
        </span>
        <span className="mt-0.5 block text-[11.5px] leading-snug text-mut">{desc}</span>
      </span>
      <Ic n="chevR" c="h-5 w-5 shrink-0 text-amber2 transition-transform group-hover:translate-x-0.5" />
    </button>
  );
}
