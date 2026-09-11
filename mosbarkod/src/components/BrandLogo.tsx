import { useState } from 'react';
import { cn } from '../utils/cn';
import { Ic } from '../icons';

/**
 * Marka logosu — sol üst köşe için ortak bileşen.
 *
 * /icons/logo.png dosyası mevcutsa gerçek logo görseli gösterilir;
 * dosya henüz eklenmemişse (404) mevcut gradient ikon kutusuna düşer.
 * Böylece logo dosyası yüklenene kadar arayüz bozulmaz.
 */
export default function BrandLogo({
  size = 'h-9 w-9',
  iconSize = 'h-5 w-5',
  className,
  fallbackIcon = 'flame',
}: {
  size?: string;
  iconSize?: string;
  className?: string;
  fallbackIcon?: string;
}) {
  const [imgOk, setImgOk] = useState(true);

  if (imgOk) {
    return (
      <img
        src="/icons/logo.png"
        alt="MOSBARKODYAZILIM"
        draggable={false}
        onError={() => setImgOk(false)}
        className={cn('shrink-0 select-none rounded-lg object-contain', size, className)}
      />
    );
  }

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-lg border border-amber/50 text-[#180c02] shadow-[0_0_18px_rgba(245,158,11,0.2)]',
        size,
        className
      )}
      style={{ background: 'linear-gradient(135deg, var(--color-amber), var(--color-amber2))' }}
    >
      <Ic n={fallbackIcon} c={iconSize} />
    </div>
  );
}
