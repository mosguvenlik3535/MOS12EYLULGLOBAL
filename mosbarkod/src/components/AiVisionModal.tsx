import { useEffect, useRef, useState } from 'react';
import { cn } from '../utils/cn';
import { Ic } from '../icons';
import { Btn, Field, Modal, Sel } from './ui';
import CameraPermissionHint from './CameraPermissionHint';
import { fmt, type Product } from '../data';
import { playBeep } from '../lib/sounds';

/* ==================================================================
   YAPAY ZEKÂ GÖRSEL ÜRÜN TANIMA — GELİŞMİŞ MOTOR (AI Vision v2)
   ------------------------------------------------------------------
   Cihaz üzerinde çalışan (offline) bilgisayarlı görü motoru:
   • 4x4x4 RGB renk histogramı (64 boyut) + renk momentleri
   • Hasler–Süsstrunk "canlılık" metriği
   • Sobel tabanlı doku/kenar yoğunluğu
   • Ortalama parlaklık + baskın ton (hue) sınıflandırıcı
   • N-shot öğrenme: her eğitim karesi çalışan ortalamaya eklenir
   • Kosinüs benzerliği + katalog renk profili hibrit skorlama
   ================================================================== */

type HueBucket = 'red' | 'green' | 'yellow' | 'blue' | 'brown' | 'dark' | 'white' | 'neutral';

interface FeatureVector {
  hist: number[]; // 64 boyutlu normalize RGB histogram
  meanR: number;
  meanG: number;
  meanB: number;
  stdR: number;
  stdG: number;
  stdB: number;
  lum: number; // ortalama parlaklık 0..255
  colorfulness: number; // Hasler–Süsstrunk metriği
  edge: number; // ortalama kenar/doku yoğunluğu
  hue: HueBucket;
}

interface VisualSignature {
  hist: number[];
  colorfulness: number;
  edge: number;
  lum: number;
  samples: number;
}

interface AiCandidate {
  product: Product;
  confidence: number;
  reason: string;
  kind: 'trained' | 'heuristic';
}

const AI_VISION_STORAGE_V1 = 'mosbarkod_ai_vision_models';
const AI_VISION_STORAGE = 'mosbarkod_ai_vision_models_v2';

const HIST_BINS = 64; // 4x4x4
const SAMPLE_W = 128;
const SAMPLE_H = 96;

const HUE_KEYWORDS: Partial<Record<HueBucket, string[]>> = {
  red: ['domates', 'elma', 'çilek', 'kiraz', 'karpuz', 'nar', 'salça', 'biber salça', 'frambuaz', 'vişne suyu', 'red'],
  green: ['biber', 'salatalık', 'marul', 'nane', 'roka', 'ıspanak', 'bezelye', 'yeşil', 'kivi', 'brokoli', 'maydanoz'],
  yellow: ['muz', 'limon', 'portakal', 'patates', 'mısır', 'gold', 'mango', 'kavun', 'şeftali', 'greyfurt'],
  blue: ['su', 'ice', 'blue', 'süt', 'ayran', 'soda', 'maden suyu', 'enerji'],
  brown: ['ekmek', 'kraker', 'bisküvi', 'çikolata', 'fındık', 'fıstık', 'ceviz', 'kahve', 'badem', 'leblebi'],
  dark: ['cola', 'kola', 'viski', 'zeytin', 'kahve', 'çay', 'çikolata', 'kakao', 'enerji', 'rakı', 'şarap'],
  white: ['süt', 'yoğurt', 'beyaz', 'un', 'şeker', 'pirinç', 'tuz', 'ekmek', 'peynir', 'beyaz peynir'],
};

/* ---------- Öznitelik çıkarımı ---------- */

const luma = (r: number, g: number, b: number) => 0.299 * r + 0.587 * g + 0.114 * b;

function classifyHue(r: number, g: number, b: number): HueBucket {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max < 70) return 'dark';
  if (min > 200) return 'white';
  if (r > g * 1.15 && r > b * 1.15) return 'red';
  if (g > r * 1.1 && g > b * 1.1) return 'green';
  if (b > r * 1.1 && b > g * 1.05) return 'blue';
  if (r > 120 && g > 120 && b < 110) return 'yellow';
  if (r > 90 && g > 55 && g < 150 && b < 90) return 'brown';
  return 'neutral';
}

function extractFeatures(data: Uint8ClampedArray, w: number, h: number): FeatureVector {
  const hist = new Array<number>(HIST_BINS).fill(0);
  let sr = 0;
  let sg = 0;
  let sb = 0;
  let sr2 = 0;
  let sg2 = 0;
  let sb2 = 0;
  let srg = 0;
  let syb = 0;
  let srg2 = 0;
  let syb2 = 0;
  const lumArr = new Float32Array(w * h);
  const n = w * h;

  for (let i = 0, p = 0; i < n; i++, p += 4) {
    const r = data[p];
    const g = data[p + 1];
    const b = data[p + 2];
    sr += r;
    sg += g;
    sb += b;
    sr2 += r * r;
    sg2 += g * g;
    sb2 += b * b;
    const rg = r - g;
    const yb = 0.5 * (r + g) - b;
    srg += rg;
    syb += yb;
    srg2 += rg * rg;
    syb2 += yb * yb;
    const hi = ((r >> 6) << 4) | ((g >> 6) << 2) | (b >> 6);
    hist[hi]++;
    lumArr[i] = luma(r, g, b);
  }

  const meanR = sr / n;
  const meanG = sg / n;
  const meanB = sb / n;
  const stdR = Math.sqrt(Math.max(0, sr2 / n - meanR * meanR));
  const stdG = Math.sqrt(Math.max(0, sg2 / n - meanG * meanG));
  const stdB = Math.sqrt(Math.max(0, sb2 / n - meanB * meanB));
  const mRg = srg / n;
  const mYb = syb / n;
  const sRg = Math.sqrt(Math.max(0, srg2 / n - mRg * mRg));
  const sYb = Math.sqrt(Math.max(0, syb2 / n - mYb * mYb));
  const colorfulness = Math.sqrt(sRg * sRg + sYb * sYb) + 0.3 * Math.sqrt(mRg * mRg + mYb * mYb);

  const histN = hist.map((v) => v / n);

  // Sobel kenar/doku yoğunluğu (parlaklık üzerinden)
  let edgeSum = 0;
  let edgeCount = 0;
  for (let y = 1; y < h - 1; y++) {
    const rowU = (y - 1) * w;
    const rowC = y * w;
    const rowD = (y + 1) * w;
    for (let x = 1; x < w - 1; x++) {
      const tl = lumArr[rowU + x - 1];
      const tc = lumArr[rowU + x];
      const tr = lumArr[rowU + x + 1];
      const ml = lumArr[rowC + x - 1];
      const mr = lumArr[rowC + x + 1];
      const bl = lumArr[rowD + x - 1];
      const bc = lumArr[rowD + x];
      const br = lumArr[rowD + x + 1];
      const gx = tr + 2 * mr + br - (tl + 2 * ml + bl);
      const gy = bl + 2 * bc + br - (tl + 2 * tc + tr);
      edgeSum += Math.sqrt(gx * gx + gy * gy);
      edgeCount++;
    }
  }
  const edge = edgeSum / (edgeCount || 1) / 4;

  return {
    hist: histN,
    meanR,
    meanG,
    meanB,
    stdR,
    stdG,
    stdB,
    lum: luma(meanR, meanG, meanB),
    colorfulness,
    edge,
    hue: classifyHue(meanR, meanG, meanB),
  };
}

/* ---------- Benzerlik / skorlama ---------- */

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (!na || !nb) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function hueReason(hue: HueBucket): string {
  switch (hue) {
    case 'red':
      return 'Kırmızı Ton Spektrumu Eşleşmesi';
    case 'green':
      return 'Yeşil / Taze Ton Spektrumu Eşleşmesi';
    case 'yellow':
      return 'Sarı / Altın Ton Spektrumu Eşleşmesi';
    case 'blue':
      return 'Mavi / Soğuk Ton Spektrumu Eşleşmesi';
    case 'brown':
      return 'Kahve / Kahverengi Ton Spektrumu';
    case 'dark':
      return 'Koyu Ton Yoğunluk Tespiti';
    case 'white':
      return 'Beyaz / Açık Ton Spektrumu';
    default:
      return 'Renk Histogramı Eşleşmesi';
  }
}

function scoreProduct(p: Product, f: FeatureVector, sig?: VisualSignature): AiCandidate {
  let score = 50;
  let reason = 'Katalog Renk Analizi';
  let kind: AiCandidate['kind'] = 'heuristic';

  if (sig && sig.samples > 0) {
    const cos = cosine(f.hist, sig.hist);
    const dC = Math.abs(f.colorfulness - sig.colorfulness);
    const dE = Math.abs(f.edge - sig.edge);
    const dL = Math.abs(f.lum - sig.lum);
    const closeness = Math.max(0, 1 - (dC / 60 + dE / 60 + dL / 90) / 3);
    const trainedScore = 100 * (0.72 * cos + 0.28 * closeness);
    if (cos > 0.5) {
      score = Math.round(trainedScore);
      kind = 'trained';
      reason = `Öğrenilmiş Görsel İmza (%${Math.round(cos * 100)} benzerlik · ${sig.samples} örnek)`;
    } else {
      score = Math.round(50 + trainedScore * 0.4);
      reason = 'Kısmi Öğrenilmiş İmza Eşleşmesi';
    }
  }

  const name = p.name.toLocaleLowerCase('tr-TR');
  const hueWords = HUE_KEYWORDS[f.hue] ?? [];
  if (f.hue !== 'neutral' && hueWords.some((k) => name.includes(k))) {
    score += f.hue === 'dark' ? 16 : 22;
    reason = hueReason(f.hue);
  }
  if (p.weighed || p.unit === 'kg' || p.unit === 'lt') score += 12;
  if (!p.barcode) score += 8;

  return { product: p, confidence: Math.min(99, Math.max(35, Math.round(score))), reason, kind };
}

/* ---------- Öğrenme / depolama ---------- */

function avgToHist(r: number, g: number, b: number): number[] {
  const out = new Array<number>(HIST_BINS).fill(0);
  let sum = 0;
  for (let i = 0; i < HIST_BINS; i++) {
    const rr = (i >> 4) * 64 + 32;
    const gg = ((i >> 2) & 3) * 64 + 32;
    const bb = (i & 3) * 64 + 32;
    const d = Math.sqrt((rr - r) ** 2 + (gg - g) ** 2 + (bb - b) ** 2);
    const w = Math.exp(-(d * d) / (2 * 70 * 70));
    out[i] = w;
    sum += w;
  }
  return out.map((v) => v / (sum || 1));
}

function loadSignatures(): Record<string, VisualSignature> {
  try {
    const raw = localStorage.getItem(AI_VISION_STORAGE);
    if (raw) return JSON.parse(raw) as Record<string, VisualSignature>;
  } catch {
    /* ignore */
  }
  // v1 (yalnızca ortalama RGB) → v2'ye göç
  try {
    const raw1 = localStorage.getItem(AI_VISION_STORAGE_V1);
    if (raw1) {
      const v1 = JSON.parse(raw1) as Record<string, { r: number; g: number; b: number }>;
      const out: Record<string, VisualSignature> = {};
      for (const [id, s] of Object.entries(v1)) {
        out[id] = {
          hist: avgToHist(s.r, s.g, s.b),
          colorfulness: 40,
          edge: 30,
          lum: luma(s.r, s.g, s.b),
          samples: 1,
        };
      }
      return out;
    }
  } catch {
    /* ignore */
  }
  return {};
}

function mergeSignature(prev: VisualSignature | undefined, f: FeatureVector): VisualSignature {
  if (!prev) return { hist: [...f.hist], colorfulness: f.colorfulness, edge: f.edge, lum: f.lum, samples: 1 };
  const n = prev.samples + 1;
  return {
    hist: prev.hist.map((v, i) => (v * prev.samples + f.hist[i]) / n),
    colorfulness: (prev.colorfulness * prev.samples + f.colorfulness) / n,
    edge: (prev.edge * prev.samples + f.edge) / n,
    lum: (prev.lum * prev.samples + f.lum) / n,
    samples: n,
  };
}

const HUE_LABEL: Record<HueBucket, string> = {
  red: 'Kırmızı',
  green: 'Yeşil',
  yellow: 'Sarı',
  blue: 'Mavi',
  brown: 'Kahve',
  dark: 'Koyu',
  white: 'Beyaz',
  neutral: 'Nötr',
};

/* ================================================================== */

export default function AiVisionModal({
  products,
  onSelectProduct,
  onClose,
}: {
  products: Product[];
  onSelectProduct: (product: Product) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [streamActive, setStreamActive] = useState(false);
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(true);
  const [candidates, setCandidates] = useState<AiCandidate[]>([]);
  const [top, setTop] = useState<AiCandidate | null>(null);
  const [features, setFeatures] = useState<FeatureVector | null>(null);
  const [trainOpen, setTrainOpen] = useState(false);
  const [trainProductId, setTrainProductId] = useState(products[0]?.id || '');
  const [capturedThumb, setCapturedThumb] = useState<string | null>(null);
  const [signatures, setSignatures] = useState<Record<string, VisualSignature>>(loadSignatures);
  const camRef = useRef<{ stop: () => void } | null>(null);
  const camGenRef = useRef(0);

  const persist = (next: Record<string, VisualSignature>) => {
    setSignatures(next);
    try {
      localStorage.setItem(AI_VISION_STORAGE, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  /* Kamera başlat */
  useEffect(() => {
    let stream: MediaStream | null = null;
    let isMounted = true;
    const gen = ++camGenRef.current;

    const stopStream = () => {
      stream?.getTracks().forEach((t) => t.stop());
      stream = null;
    };
    camRef.current = { stop: stopStream };

    async function initCam() {
      setError('');
      setStreamActive(false);
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setError('Kamera erişimi desteklenmiyor veya güvenli bağlantı (HTTPS) gerekiyor.');
          return;
        }
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (!isMounted || gen !== camGenRef.current) {
          stopStream();
          return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
          setStreamActive(true);
        }
      } catch (e) {
        const name = (e as { name?: string }).name ?? '';
        setError(
          name === 'NotAllowedError'
            ? 'Kamera izni verilmedi. İzin istemi çıkmasına rağmen reddettiyseniz uygulamaya izin vermeniz gerekir.'
            : 'Kamera açılamadı. Başka bir uygulamanın kamerayı kullanmadığını kontrol edin.'
        );
      }
    }

    void initCam();

    return () => {
      isMounted = false;
      if (gen === camGenRef.current) {
        camRef.current = null;
        stopStream();
      }
    };
  }, []);

  const retryCam = () => {
    camRef.current?.stop();
    camGenRef.current += 1;
    // Kamera efektini yeniden çalıştırmak için modalı kapatıp açmak yerine stream'i yenileriz.
    void (async () => {
      try {
        const st = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        camRef.current = { stop: () => st.getTracks().forEach((t) => t.stop()) };
        if (!videoRef.current) {
          st.getTracks().forEach((t) => t.stop());
          return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = st;
          void videoRef.current.play();
        }
        setError('');
        setStreamActive(true);
      } catch {
        setError('Kamera izni hâlâ verilmedi. Android: Ayarlar → Uygulamalar → MOSBARKODYAZILIM → İzinler → Kamera.');
      }
    })();
  };

  /* Gerçek zamanlı öznitelik çıkarımı + skorlama */
  useEffect(() => {
    if (!streamActive || !scanning) return;

    const interval = setInterval(() => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.videoWidth === 0 || video.videoHeight === 0) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = SAMPLE_W;
      canvas.height = SAMPLE_H;
      ctx.drawImage(video, 0, 0, SAMPLE_W, SAMPLE_H);
      const frame = ctx.getImageData(0, 0, SAMPLE_W, SAMPLE_H);
      const feats = extractFeatures(frame.data, SAMPLE_W, SAMPLE_H);
      setFeatures(feats);

      const matches = products
        .map((p) => scoreProduct(p, feats, signatures[p.id]))
        .sort((a, b) => b.confidence - a.confidence);
      setTop(matches[0] ?? null);
      setCandidates(matches.slice(0, 4));
    }, 380);

    return () => clearInterval(interval);
  }, [streamActive, scanning, products, signatures]);

  /* Eğitim: geçerli kareyi N-shot çalışan ortalamaya ekle */
  const handleCaptureTrain = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = SAMPLE_W;
    canvas.height = SAMPLE_H;
    ctx.drawImage(video, 0, 0, SAMPLE_W, SAMPLE_H);

    // Küçük önizleme
    const thumbC = document.createElement('canvas');
    thumbC.width = 160;
    thumbC.height = 120;
    const tctx = thumbC.getContext('2d');
    if (tctx) {
      tctx.drawImage(video, 0, 0, 160, 120);
      setCapturedThumb(thumbC.toDataURL('image/jpeg', 0.8));
    }

    const frame = ctx.getImageData(0, 0, SAMPLE_W, SAMPLE_H);
    const feats = extractFeatures(frame.data, SAMPLE_W, SAMPLE_H);
    const merged = mergeSignature(signatures[trainProductId], feats);
    persist({ ...signatures, [trainProductId]: merged });

    playBeep('posOnay', 70);
    setTrainOpen(false);
  };

  const resetSignature = (id: string) => {
    const next = { ...signatures };
    delete next[id];
    persist(next);
    setCapturedThumb(null);
  };

  const handlePick = (p: Product) => {
    playBeep('kasaDit', 70);
    onSelectProduct(p);
    onClose();
  };

  const trainSig = trainProductId ? signatures[trainProductId] : undefined;

  return (
    <Modal
      title="Yapay Zekâ Görsel Ürün Tanıma (AI Vision v2)"
      icon={<Ic n="sparkles" c="h-5 w-5 text-amber" />}
      onClose={onClose}
      w="max-w-5xl"
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* SOL: Kamera + HUD */}
        <div className="flex flex-col space-y-3 lg:col-span-7">
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border-2 border-amber/40 bg-black shadow-2xl">
            <video ref={videoRef} playsInline muted autoPlay className="h-full w-full object-cover" />
            <canvas ref={canvasRef} className="hidden" />

            {streamActive && !error && (
              <>
                {/* Lazer tarama çizgisi */}
                <div className="pointer-events-none absolute inset-x-0 h-1 animate-[barup_2s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-amber to-transparent shadow-[0_0_16px_rgba(245,158,11,1)]" />

                {/* Nişangâh */}
                <div className="pointer-events-none absolute inset-12 flex flex-col justify-between rounded-2xl border-2 border-dashed border-amber/70 p-3">
                  <div className="flex justify-between">
                    <span className="h-4 w-4 border-l-2 border-t-2 border-amber" />
                    <span className="h-4 w-4 border-r-2 border-t-2 border-amber" />
                  </div>
                  <div className="mx-auto rounded-full bg-black/60 px-3 py-1 text-center font-mono text-[10px] font-bold uppercase tracking-widest text-amber2 backdrop-blur-sm">
                    AI Canlı Nesne Tespiti
                  </div>
                  <div className="flex justify-between">
                    <span className="h-4 w-4 border-l-2 border-b-2 border-amber" />
                    <span className="h-4 w-4 border-r-2 border-b-2 border-amber" />
                  </div>
                </div>

                {/* Canlı en iyi eşleşme etiketi */}
                {top && top.confidence >= 55 && (
                  <div className="pointer-events-none absolute left-3 top-3 max-w-[80%] rounded-lg border border-mint/50 bg-black/70 px-2.5 py-1.5 backdrop-blur-sm">
                    <div className="truncate font-mono text-[11px] font-bold text-mint">{top.product.name}</div>
                    <div className="font-mono text-[9px] text-mint/80">%{top.confidence} · {top.reason}</div>
                  </div>
                )}
              </>
            )}

            {error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/85 p-6 text-center text-red">
                <Ic n="alert" c="mb-2 h-10 w-10" />
                <p className="max-w-sm text-xs">{error}</p>
                <CameraPermissionHint />
                <Btn v="ghost" onClick={retryCam} className="text-xs">
                  <Ic n="reset" c="h-3.5 w-3.5" /> Kamerayı Tekrar Aç
                </Btn>
              </div>
            )}
          </div>

          {/* Gelişmiş öznitelik paneli */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Baskın Ton', val: features ? HUE_LABEL[features.hue] : '—' },
              { label: 'Canlılık', val: features ? String(Math.round(features.colorfulness)) : '—' },
              { label: 'Doku', val: features ? String(Math.round(features.edge)) : '—' },
              { label: 'Parlaklık', val: features ? String(Math.round(features.lum)) : '—' },
            ].map((m) => (
              <div key={m.label} className="rounded-lg border border-line bg-ink/50 px-2 py-1.5 text-center">
                <div className="font-mono text-[8.5px] uppercase tracking-wider text-mut2">{m.label}</div>
                <div className="font-mono text-[12px] font-bold text-amber2 tabular-nums">{m.val}</div>
              </div>
            ))}
          </div>

          {/* Kontroller */}
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-mint">
              <span className="h-2 w-2 animate-pulse rounded-full bg-mint" />
              Görsel Sinir Ağı Analiz Ediyor…
            </span>

            <div className="flex gap-2">
              <Btn v="ghost" onClick={() => setScanning(!scanning)} className="text-xs">
                <Ic n={scanning ? 'clock' : 'zap'} c="h-3.5 w-3.5" /> {scanning ? 'Durdur' : 'Tara'}
              </Btn>
              <Btn
                v="primary"
                onClick={() => setTrainOpen(true)}
                className="gap-1.5 bg-indigo-600 text-xs text-white hover:bg-indigo-500"
              >
                <Ic n="camera" c="h-3.5 w-3.5" /> Ürün Öğret (Eğit)
              </Btn>
            </div>
          </div>
        </div>

        {/* SAĞ: Eşleşmeler */}
        <div className="flex flex-col justify-between space-y-3 lg:col-span-5">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider text-amber2">
                <Ic n="sparkles" c="h-4 w-4" /> En Yüksek AI Eşleşmeleri
              </span>
              <span className="font-mono text-[10px] text-mut2">Tıkla ve Ekle</span>
            </div>

            <div className="space-y-2">
              {candidates.length === 0 ? (
                <div className="rounded-xl border border-dashed border-line2 p-8 text-center text-xs text-mut2">
                  Kamera önüne ürün yerleştirin...
                </div>
              ) : (
                candidates.map(({ product, confidence, reason, kind }, idx) => (
                  <button
                    key={product.id}
                    onClick={() => handlePick(product)}
                    className={cn(
                      'anim-pop group w-full rounded-xl border p-3 text-left transition-all hover:scale-[1.02]',
                      idx === 0
                        ? 'border-mint/60 bg-gradient-to-r from-mint/15 to-transparent hover:border-mint'
                        : 'border-line bg-panel2/70 hover:border-amber/60'
                    )}
                  >
                    <div className="flex w-full items-center gap-3">
                      <div
                        className={cn(
                          'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-mono text-xs font-black shadow-md',
                          idx === 0 ? 'bg-mint text-[#04211a]' : 'border border-line2 bg-panel3 text-txt'
                        )}
                      >
                        %{confidence}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-bold text-txt transition-colors group-hover:text-amber2">
                          {product.name}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1.5 truncate text-[10px] text-mut2">
                          <span className="font-mono text-amber2/80">{fmt(product.p1)} / {product.unit}</span>
                          <span>·</span>
                          <span className="truncate">{reason}</span>
                        </div>
                        {/* Güven çubuğu */}
                        <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-ink/80">
                          <div
                            className={cn('h-full rounded-full transition-all', idx === 0 ? 'bg-mint' : 'bg-amber/70')}
                            style={{ width: `${confidence}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-col items-end gap-1">
                        {kind === 'trained' && (
                          <span className="rounded border border-indigo-500/40 bg-indigo-500/10 px-1.5 py-0.5 font-mono text-[8px] font-bold text-indigo-300">
                            ÖĞRENİLDİ
                          </span>
                        )}
                        {product.weighed && (
                          <span className="rounded border border-blue/40 bg-blue/10 px-1.5 py-0.5 font-mono text-[8px] font-bold text-blue">
                            TARTILI
                          </span>
                        )}
                        <span className="rounded-lg border border-line2 bg-ink/60 px-2 py-1 font-mono text-[10px] font-bold text-mint transition-colors group-hover:bg-mint group-hover:text-[#04211a]">
                          + EKLE
                        </span>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="rounded-xl border border-line bg-ink/40 p-3 text-[10.5px] leading-relaxed text-mut2">
            <b className="text-txt">Nasıl Çalışır?</b> Motor; 64 boyutlu RGB histogram, canlılık, doku ve parlaklık
            özniteliklerini çıkarır. "Ürün Öğret" ile çektiğiniz her kare ürünün görsel imzasına eklenir (N-shot
            öğrenme) ve tanıma doğruluğu her eğitimle artar.
          </div>
        </div>
      </div>

      {/* Eğitim modali */}
      {trainOpen && (
        <Modal
          title="Ürünü Görsel Olarak Eğit (N-Shot Öğrenme)"
          icon={<Ic n="camera" c="h-4.5 w-4.5 text-indigo-400" />}
          onClose={() => setTrainOpen(false)}
          w="max-w-md"
          footer={
            <>
              <Btn v="ghost" onClick={() => setTrainOpen(false)}>
                Vazgeç
              </Btn>
              <Btn v="primary" onClick={handleCaptureTrain} className="gap-2 bg-indigo-600 text-white hover:bg-indigo-500">
                <Ic n="camera" c="h-4 w-4" /> Fotoğrafı Çek & Eğit
              </Btn>
            </>
          }
        >
          <div className="space-y-3">
            <Field label="Eğitilecek Ürünü Seçin">
              <Sel value={trainProductId} onChange={(e) => setTrainProductId(e.target.value)}>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.category}) — {fmt(p.p1)}
                  </option>
                ))}
              </Sel>
            </Field>

            {trainSig && (
              <div className="flex items-center justify-between rounded-lg border border-indigo-500/30 bg-indigo-500/5 px-3 py-2">
                <span className="font-mono text-[10px] text-indigo-300">
                  Kayıtlı örnek sayısı: <b className="text-indigo-200">{trainSig.samples}</b>
                </span>
                <button
                  type="button"
                  onClick={() => resetSignature(trainProductId)}
                  className="font-mono text-[10px] font-bold text-red hover:underline"
                >
                  İmzayı Sıfırla
                </button>
              </div>
            )}

            <p className="text-xs leading-relaxed text-mut">
              Kameranın önüne ürünü tutun ve "Fotoğrafı Çek & Eğit" butonuna basın. Farklı açılardan birkaç kare
              çekerseniz görsel imza ortalaması genişler ve tanıma doğruluğu belirgin şekilde artar.
            </p>

            {capturedThumb && (
              <div className="flex items-center gap-3 rounded-xl border border-line bg-ink/50 p-2.5">
                <img src={capturedThumb} alt="" className="h-12 w-16 rounded-lg object-cover" />
                <span className="text-xs font-medium text-mint">Son çekilen örnek kaydedildi</span>
              </div>
            )}
          </div>
        </Modal>
      )}
    </Modal>
  );
}
