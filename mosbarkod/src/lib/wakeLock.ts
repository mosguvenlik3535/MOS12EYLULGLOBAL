/**
 * Ekran uyanık tutma (Screen Wake Lock).
 *
 * POS olarak kullanılan telefonda ekran 30 saniyede kapanıyor; her satışta
 * ekranı uyandırmak zorunda kalmamak için uygulama açıkken ekran açık kalır.
 * Ayarlar → Mobil (Telefon) Ayarları'ndan kapatılabilir.
 *
 * Yalnızca uygulama ön plandayken çalışır; desteklemeyen tarayıcılarda
 * (ör. iOS Safari) sessizce hiçbir şey yapmaz.
 */

import { useEffect } from 'react';

type Sentinel = {
  release: () => Promise<void>;
  addEventListener?: (type: 'release', handler: () => void) => void;
};

type NavigatorWithWakeLock = Navigator & {
  wakeLock?: { request: (type: 'screen') => Promise<Sentinel> };
};

export function useWakeLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const n = navigator as NavigatorWithWakeLock;
    if (!n.wakeLock) return;
    let cancelled = false;
    let sentinel: Sentinel | null = null;
    let timer: number | undefined;

    const request = async () => {
      if (cancelled || document.visibilityState !== 'visible') return;
      try {
        const s = await n.wakeLock!.request('screen');
        sentinel = s;
        s.addEventListener?.('release', () => {
          sentinel = null;
          schedule();
        });
      } catch {
        /* izin yok / desteklenmiyor — sessizce geç */
      }
    };
    const schedule = () => {
      if (cancelled) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void request(), 3000);
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') void request();
    };

    void request();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
      try {
        void sentinel?.release();
      } catch {
        /* yoksay */
      }
    };
  }, [enabled]);
}
