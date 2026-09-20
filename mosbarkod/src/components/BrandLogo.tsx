import { useState } from 'react';
import { cn } from '../utils/cn';
import { Ic } from '../icons';
import logoUrl from '../assets/logo.png';

/**
 * Marka logosu — sol üst köşe için ortak bileşen.
 *
 * Gerçek logo görseli (`src/assets/logo.png`) gösterilir; görsel bir sebepten
 * yüklenemezse mevcut gradient ikon kutusuna düşer (arayüz bozulmaz).
 *
 * Logo tek dosyalık (single-file) derlemede base64 olarak gömüldüğü için
 * Electron (file://), PWA ve mobilde sorunsuz çalışır.
 */
export default function BrandLogo({
  imgClassName,
  boxClassName = 'h-9 w-9',
  iconSize = 'h-5 w-5',
  fallbackIcon = 'flame',
}: {
  imgClassName?: string;
  boxClassName?: string;
  iconSize?: string;
  fallbackIcon?: string;
}) {
  const [imgOk, setImgOk] = useState(true);

  if (imgOk) {
    return (
      <img
        src={logoUrl}
        alt="MOSBARKODYAZILIM"
        draggable={false}
        onError={() => setImgOk(false)}
        className={cn('shrink-0 select-none object-contain', imgClassName ?? 'h-9 w-auto max-w-[168px]')}
      />
    );
  }

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-lg border border-amber/50 text-[#180c02] shadow-[0_0_18px_rgba(245,158,11,0.2)]',
        boxClassName
      )}
      style={{ background: 'linear-gradient(135deg, var(--color-amber), var(--color-amber2))' }}
    >
      <Ic n={fallbackIcon} c={iconSize} />
    </div>
  );
}
