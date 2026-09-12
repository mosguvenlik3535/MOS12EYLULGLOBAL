/**
 * Otomatik DOM çeviri motoru (v2).
 *
 * 1) Tam eşleşme (hızlı yol)
 * 2) Noktalama toleranslı tam eşleşme (… vs ..., — vs -, ’ vs ')
 * 3) Alt-dize eşleşmesi — en uzundan en kısaya, kelime sınırlı.
 *    Böylece "Satış tamamlandı: F-2026-0001" gibi dinamik metinlerin
 *    sabit kısımları da çevrilir, sayılar/tarihler korunur.
 */

import { PHRASES } from './phrases';
import { EXTENDED_PHRASES } from './extendedPhrases';
import { TIP_PHRASES } from './tooltipPhrases';
import type { Locale } from './i18n';

let observer: MutationObserver | null = null;
let entries: { key: string; val: string }[] = [];
let normIndex: Map<string, string> = new Map();
let active = false;
let rafId = 0;

const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'CODE', 'PRE', 'SVG', 'PATH']);

const normalize = (s: string): string =>
  s
    .replace(/[…]/g, '...')
    .replace(/[‘’‚‛`´]/g, "'")
    .replace(/[“”„‟]/g, '"')
    .replace(/[—–]/g, '-')
    .replace(/→/g, '->')
    .replace(/\s+/g, ' ')
    .trim();

const isLetter = (ch: string | undefined): boolean =>
  !!ch && /[\p{L}]/u.test(ch);

const replaceBounded = (hay: string, needle: string, val: string): string => {
  if (!hay.includes(needle)) return hay;
  let out = '';
  let i = 0;
  let idx = hay.indexOf(needle, i);
  while (idx >= 0) {
    const before = idx > 0 ? hay[idx - 1] : undefined;
    const after = idx + needle.length < hay.length ? hay[idx + needle.length] : undefined;
    const okBefore = !isLetter(before) || !isLetter(needle[0]);
    const okAfter = !isLetter(after) || !isLetter(needle[needle.length - 1]);
    out += hay.slice(i, idx) + (okBefore && okAfter ? val : needle);
    i = idx + needle.length;
    idx = hay.indexOf(needle, i);
  }
  out += hay.slice(i);
  return out;
};

const translateText = (raw: string): string | null => {
  if (!active) return null;
  const s = raw.trim();
  if (!s || s.length < 2) return null;

  // 1) Tam eşleşme
  const direct = (PHRASES as Record<string, { en: string }>)[s];
  void direct;

  for (const e of entries) {
    if (e.key === s) return raw.replace(s, e.val);
  }
  // 2) Normalize tam eşleşme
  const nd = normIndex.get(normalize(s));
  if (nd) return raw.replace(s, nd);
  // 3) Alt-dize (uzundan kısaya)
  let out = raw;
  for (const e of entries) {
    if (e.key.length < 3) continue;
    if (!out.includes(e.key)) continue;
    out = replaceBounded(out, e.key, e.val);
  }
  return out !== raw ? out : null;
};

const walk = (root: Node) => {
  if (!active) return;
  const win = root.ownerDocument?.defaultView ?? window;
  const walker = win.document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (SKIP_TAGS.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
      if (parent.closest('[data-no-translate]')) return NodeFilter.FILTER_REJECT;
      return node.nodeValue && node.nodeValue.trim().length > 1
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT;
    },
  });

  const jobs: { node: Text; value: string }[] = [];
  let n = walker.nextNode();
  while (n) {
    const txt = n as Text;
    const next = translateText(txt.nodeValue ?? '');
    if (next && next !== txt.nodeValue) jobs.push({ node: txt, value: next });
    n = walker.nextNode();
  }
  for (const j of jobs) j.node.nodeValue = j.value;

  const el = root instanceof Element ? root : (root as Document).documentElement;
  if (el && el.querySelectorAll) {
    el.querySelectorAll<HTMLElement>('[placeholder],[title]').forEach((node) => {
      if (node.closest('[data-no-translate]')) return;
      const ph = node.getAttribute('placeholder');
      if (ph) {
        const t = translateText(ph);
        if (t && t !== ph) node.setAttribute('placeholder', t);
      }
      const ti = node.getAttribute('title');
      if (ti) {
        const t = translateText(ti);
        if (t && t !== ti) node.setAttribute('title', t);
      }
    });
    el.querySelectorAll('option').forEach((opt) => {
      const t = translateText(opt.textContent ?? '');
      if (t && t !== opt.textContent) opt.textContent = t;
    });
  }
};

const schedule = () => {
  if (rafId) return;
  rafId = requestAnimationFrame(() => {
    rafId = 0;
    walk(document.body);
  });
};

/** Dil değiştiğinde çağrılır. 'tr' seçilirse çeviri kapatılır. */
export const applyAutoTranslate = (locale: Locale) => {
  observer?.disconnect();
  observer = null;

  if (locale === 'tr') {
    active = false;
    entries = [];
    normIndex = new Map();
    return;
  }
  // Sözlüğü olmayan dilde çeviri yapma (mevcut tüm diller destekli)

  const list: { key: string; val: string }[] = [];
  for (const [tr, tx] of Object.entries(PHRASES)) {
    const row = tx as Record<string, string | undefined>;
    // Yerel pakette eksik kalan ifadeler Türkçe yerine İngilizce gösterilir.
    const val = row[locale] ?? row.en;
    if (val) list.push({ key: tr, val });
  }
  // Yeni pazar paketleri temel ifadelerde İngilizce yedeğin üzerine yazılır.
  for (const [key, val] of Object.entries(EXTENDED_PHRASES[locale] ?? {})) {
    const existing = list.find((item) => item.key === key);
    if (existing) existing.val = val;
    else list.push({ key, val });
  }
  // Kutu ipuçları (title) ve ek başlıklar — her dil için tam çeviri.
  for (const [key, tx] of Object.entries(TIP_PHRASES)) {
    const row = tx as Record<string, string | undefined>;
    const val = row[locale] ?? row.en;
    if (!val) continue;
    const existing = list.find((item) => item.key === key);
    if (existing) existing.val = val;
    else list.push({ key, val });
  }
  // Dil mevcut değilse tamamen Türkçe bırak (boş çeviri olmasın)
  // En uzun önce (alt-dize çakışmalarında doğru kazansın)
  list.sort((a, b) => b.key.length - a.key.length);
  entries = list;

  normIndex = new Map();
  for (const e of list) {
    const nk = normalize(e.key);
    if (!normIndex.has(nk)) normIndex.set(nk, e.val);
  }

  active = true;
  walk(document.body);

  observer = new MutationObserver((muts) => {
    let need = false;
    for (const m of muts) {
      if (m.type === 'childList' && m.addedNodes.length) need = true;
      if (m.type === 'characterData') need = true;
      if (need) break;
    }
    if (need) schedule();
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });
};

export const stopAutoTranslate = () => {
  observer?.disconnect();
  observer = null;
  active = false;
  entries = [];
  normIndex = new Map();
};
