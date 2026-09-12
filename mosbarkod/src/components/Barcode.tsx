import { useMemo } from 'react';
import { cn } from '../utils/cn';
import { encodeEan13 } from '../lib/barcode';

/**
 * Gerçek EAN-13 barkod görüntüleyici (SVG).
 * Barkod okuyucularla taranabilir; altta insan tarafından okunabilir numara gösterir.
 */
export default function Barcode({
  value,
  height = 44,
  width = 190,
  showText = true,
  className,
}: {
  value: string;
  height?: number;
  width?: number;
  showText?: boolean;
  className?: string;
}) {
  const bars = useMemo(() => encodeEan13(value), [value]);

  if (bars.length !== 95) {
    return (
      <span className={cn('font-mono text-[10px] text-mut2', className)}>
        {value ? 'Geçersiz barkod' : 'Barkod yok'}
      </span>
    );
  }

  const moduleW = width / 95;
  const guardHeight = height + 4; // koruma çizgileri biraz daha uzun

  const rects: { x: number; h: number }[] = [];
  for (let i = 0; i < bars.length; i++) {
    if (!bars[i]) continue;
    const x = i * moduleW;
    // Başlangıç/orta/bitiş koruma desenleri daha uzun
    const isGuard =
      (i >= 0 && i <= 2) || (i >= 45 && i <= 49) || (i >= 92 && i <= 94);
    rects.push({ x, h: isGuard ? guardHeight : height });
  }

  return (
    <div className={cn('inline-flex flex-col items-center bg-white px-2 py-1', className)}>
      <svg width={width} height={guardHeight} viewBox={`0 0 ${width} ${guardHeight}`} role="img" aria-label={`Barkod ${value}`}>
        <rect x={0} y={0} width={width} height={guardHeight} fill="#ffffff" />
        {rects.map((r, i) => (
          <rect key={i} x={r.x} y={0} width={moduleW} height={r.h} fill="#000000" />
        ))}
      </svg>
      {showText && (
        <span className="mt-0.5 font-mono text-[10px] font-semibold tracking-[0.22em] text-black">
          {value}
        </span>
      )}
    </div>
  );
}
