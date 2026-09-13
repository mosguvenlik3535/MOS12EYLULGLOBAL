import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser';
import { cn } from '../utils/cn';
import { Ic } from '../icons';
import CameraPermissionHint from './CameraPermissionHint';

export default function CameraScanner({
  onDetected,
  onClose,
}: {
  onDetected: (code: string) => boolean;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const doneRef = useRef(false);
  const [status, setStatus] = useState('Arka kamera açılıyor...');
  const [error, setError] = useState('');
  const [torch, setTorch] = useState(false);
  const [torchReady, setTorchReady] = useState(false);
  const startRef = useRef<(() => void) | null>(null);
  const [attempt, setAttempt] = useState(0);

  const stop = () => {
    try {
      controlsRef.current?.stop();
    } catch {
      /* yoksay */
    }
    controlsRef.current = null;
    const stream = videoRef.current?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((t) => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  useEffect(() => {
    let mounted = true;
    const reader = new BrowserMultiFormatReader(undefined, {
      delayBetweenScanAttempts: 120,
      delayBetweenScanSuccess: 900,
    });

    const start = async () => {
      setError('');
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        setError('Kamera için güvenli bağlantı (HTTPS) gerekir. Uygulamayı HTTPS adresinden veya kurulu PWA/APK içinden açın.');
        setStatus('Kamera kullanılamıyor');
        return;
      }
      try {
        const controls = await reader.decodeFromConstraints(
          {
            audio: false,
            video: {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
          },
          videoRef.current ?? undefined,
          (result) => {
            if (!result || doneRef.current) return;
            const text = result.getText().trim();
            if (!text) return;
            const ok = onDetected(text);
            if (ok) {
              doneRef.current = true;
              setStatus(`Okundu: ${text}`);
              setTimeout(() => {
                stop();
                onClose();
              }, 250);
            } else {
              setStatus(`${text} okundu ancak ürün bulunamadı. Başka barkod deneyin.`);
            }
          }
        );
        if (!mounted) {
          controls.stop();
          return;
        }
        controlsRef.current = controls;
        setTorchReady(Boolean(controls.switchTorch));
        setStatus('Barkodu çerçevenin içine hizalayın');
      } catch (e) {
        const name = (e as { name?: string }).name ?? '';
        const msg =
          name === 'NotAllowedError'
            ? 'Kamera izni verilmedi. İzin istemi çıkmasına rağmen reddettiyseniz uygulamaya izin vermeniz gerekir.'
            : name === 'NotFoundError'
              ? 'Bu cihazda kullanılabilir kamera bulunamadı.'
              : 'Kamera başlatılamadı. Başka bir uygulamanın kamerayı kullanmadığını kontrol edin.';
        if (mounted) {
          setError(msg);
          setStatus('Kamera açılamadı');
        }
      }
    };

    startRef.current = () => void start();
    void start();
    return () => {
      mounted = false;
      startRef.current = null;
      stop();
    };
    // Scanner açıldığı anda bir kez başlatılır; "Tekrar dene" attempt'ı artırır.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  const switchTorch = async () => {
    if (!controlsRef.current?.switchTorch) return;
    try {
      const next = !torch;
      await controlsRef.current.switchTorch(next);
      setTorch(next);
    } catch {
      setTorchReady(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-3 backdrop-blur-sm">
      <div className="anim-pop w-full max-w-md overflow-hidden rounded-2xl border border-line2 bg-panel shadow-2xl">
        <div className="flex items-center gap-2 border-b border-line px-4 py-3">
          <span className="rounded-lg border border-blue/30 bg-blue/10 p-2 text-blue">
            <Ic n="camera" c="h-5 w-5" />
          </span>
          <div>
            <h3 className="font-mono text-[13px] font-bold">KAMERA İLE BARKOD OKUT</h3>
            <p className="text-[10.5px] text-mut2">EAN-8/13, UPC, Code 128 ve QR desteklenir</p>
          </div>
          <button
            onClick={() => {
              stop();
              onClose();
            }}
            className="ml-auto rounded-lg border border-line2 p-2 text-mut hover:border-red/50 hover:text-red"
          >
            <Ic n="x" c="h-4 w-4" />
          </button>
        </div>

        <div className="relative aspect-[4/3] overflow-hidden bg-black">
          <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
          {!error && (
            <>
              <div className="pointer-events-none absolute inset-[15%] rounded-xl border-2 border-blue/90 shadow-[0_0_0_999px_rgba(0,0,0,0.38)]" />
              <div className="pointer-events-none absolute left-[15%] right-[15%] top-1/2 h-0.5 bg-red shadow-[0_0_10px_rgba(239,83,80,0.9)]" />
            </>
          )}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-8 text-center">
              <Ic n="alert" c="h-10 w-10 text-red" />
              <p className="text-[12px] leading-relaxed text-red">{error}</p>
            </div>
          )}
        </div>

        <div className="p-4">
          <div className={cn('rounded-lg border px-3 py-2 text-center font-mono text-[11px]', error ? 'border-red/30 bg-red/5 text-red' : 'border-blue/25 bg-blue/5 text-blue')}>
            {status}
          </div>
          {error && (
            <div className="mt-2 flex flex-col items-center">
              <CameraPermissionHint compact />
            </div>
          )}
          <div className="mt-3 flex gap-2">
            {error && (
              <button
                onClick={() => {
                  doneRef.current = false;
                  setAttempt((a) => a + 1);
                }}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-blue/45 bg-blue/10 px-3 py-2.5 text-[12px] font-semibold text-blue hover:bg-blue/20"
              >
                <Ic n="reset" c="h-4 w-4" /> Tekrar Dene
              </button>
            )}
            {torchReady && (
              <button
                onClick={switchTorch}
                className={cn(
                  'flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-[12px] font-semibold',
                  torch ? 'border-amber bg-amber/15 text-amber2' : 'border-line2 bg-ink/50 text-mut'
                )}
              >
                <Ic n="zap" c="h-4 w-4" /> {torch ? 'Feneri Kapat' : 'Feneri Aç'}
              </button>
            )}
            <button
              onClick={() => {
                stop();
                onClose();
              }}
              className="flex flex-1 items-center justify-center rounded-lg border border-line2 bg-ink/50 px-3 py-2.5 text-[12px] font-semibold text-txt"
            >
              İptal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
