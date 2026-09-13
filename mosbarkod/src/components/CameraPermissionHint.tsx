import { Ic } from '../icons';

/* ==================================================================
   KAMERA İZNİ YÖNLENDİRİCİSİ
   ------------------------------------------------------------------
   getUserMedia "NotAllowedError" döndüğünde (Android APK / mobil tarayıcı)
   kullanıcının izin vermesi gereken yeri tek tuşla açar.

   Android tarafında izin akışı:
   1) AndroidManifest.xml → <uses-permission android:name="android.permission.CAMERA" />
   2) Capacitor'un BridgeWebChromeClient'ı istemi kullanıcıya gösterir
   3) Kullanıcı "Engelle" seçerse Android yeniden sormaz → bu panel Ayarlar'ı açar.
   ================================================================== */

type CapacitorLike = {
  isNativePlatform?: () => boolean;
  get?: (pluginId: string) => { openAppSettings?: () => Promise<void> } | undefined;
};

/** Capacitor köprüsü varsa uygulamanın Android "İzinler" ekranını açar. */
export async function openAppPermissionSettings(): Promise<boolean> {
  try {
    const cap = (window as unknown as { Capacitor?: CapacitorLike }).Capacitor;
    if (cap?.isNativePlatform?.()) {
      await cap.get?.('App')?.openAppSettings?.();
      return true;
    }
  } catch {
    /* köprü yoksa veya çağrı patlarsa metin yönergesine düşülür */
  }
  return false;
}

export default function CameraPermissionHint({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={
        compact
          ? 'mt-2 w-full rounded-lg border border-line2 bg-ink/50 px-3 py-2 text-left'
          : 'mt-1 w-full max-w-sm rounded-lg border border-line2 bg-ink/50 p-3'
      }
    >
      <p className={compact ? 'text-[10.5px] leading-relaxed text-mut' : 'text-[11px] leading-relaxed text-mut'}>
        <b className="text-txt">Android:</b> Ayarlar → Uygulamalar → MOSBARKODYAZILIM → İzinler → Kamera →
        “Yalnızca bu uygulamayı kullanırken izin ver”.
        <br />
        <b className="text-txt">Tarayıcı:</b> adres çubuğundaki kilit/ayar simgesi → İzinler → Kamera → İzin ver.
      </p>
      <button
        type="button"
        onClick={() => void openAppPermissionSettings()}
        className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-blue/40 bg-blue/10 px-2.5 py-1.5 font-mono text-[10.5px] font-bold text-blue hover:bg-blue/20"
      >
        <Ic n="gear" c="h-3.5 w-3.5" /> Uygulama Ayarlarını Aç
      </button>
    </div>
  );
}
