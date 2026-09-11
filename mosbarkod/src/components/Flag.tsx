/**
 * Ülke bayrakları — satır içi SVG bileşeni.
 *
 * Emoji bayraklar (🇹🇷 🇬🇧 ...) Windows/Electron'da bayrak yerine "TR", "GB"
 * gibi harf çifti olarak görünür. Bu yüzden her platformda aynı görünen
 * gerçek SVG bayraklar kullanılır (flag-icons, MIT lisansı).
 */
import { cn } from '../utils/cn';

import trSvg from '../flags/tr.svg?raw';
import gbSvg from '../flags/gb.svg?raw';
import esSvg from '../flags/es.svg?raw';
import deSvg from '../flags/de.svg?raw';
import frSvg from '../flags/fr.svg?raw';
import itSvg from '../flags/it.svg?raw';
import brSvg from '../flags/br.svg?raw';
import cnSvg from '../flags/cn.svg?raw';
import plSvg from '../flags/pl.svg?raw';
import roSvg from '../flags/ro.svg?raw';
import grSvg from '../flags/gr.svg?raw';
import nlSvg from '../flags/nl.svg?raw';
import saSvg from '../flags/sa.svg?raw';
import ruSvg from '../flags/ru.svg?raw';

/** Dil kodu → bayrak SVG eşlemesi (bilinmeyen kod Türkçe bayrağa düşer). */
export const FLAG_SVG: Record<string, string> = {
  tr: trSvg,
  en: gbSvg,
  es: esSvg,
  de: deSvg,
  fr: frSvg,
  it: itSvg,
  pt: brSvg,
  zh: cnSvg,
  pl: plSvg,
  ro: roSvg,
  el: grSvg,
  nl: nlSvg,
  ar: saSvg,
  ru: ruSvg,
};

/**
 * Bayrak görseli. `code` bir dil kodu (tr, en, es, ...) alır; `className` ile
 * boyut verilir (ör. 'h-3.5 w-[18px]' veya 'h-6 w-8'). Oran 4:3 kabul edilir.
 */
export default function Flag({ code, className }: { code: string; className?: string }) {
  const svg = FLAG_SVG[code] ?? trSvg;
  return (
    <span
      className={cn(
        'inline-block shrink-0 overflow-hidden rounded-[3px] bg-ink ring-1 ring-white/15 [&>svg]:block [&>svg]:h-full [&>svg]:w-full',
        className
      )}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
