import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { LOCALES } from './i18n';
import { TIP_PHRASES } from './tooltipPhrases';

const NON_TR_LOCALES = LOCALES.filter((l) => l.id !== 'tr').map((l) => l.id);

/** Sözlük dosyalarındaki Türkçe anahtarları (string literal veya identifier) toplar. */
function extractKeys(src: string): Set<string> {
  const keys = new Set<string>();
  const re = /(?:^|\n)\s*('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|[A-Za-z0-9_İĞÜŞÖÇığüşöç]+)\s*:/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    let k = m[1];
    if ((k.startsWith("'") && k.endsWith("'")) || (k.startsWith('"') && k.endsWith('"'))) {
      k = k.slice(1, -1).replace(/\\'/g, "'").replace(/\\"/g, '"');
    }
    keys.add(k);
  }
  return keys;
}

function dictionaryKeys(): Set<string> {
  const root = process.cwd();
  const files = ['src/locales/phrases.ts', 'src/locales/extendedPhrases.ts', 'src/locales/tooltipPhrases.ts'];
  const keys = new Set<string>();
  for (const f of files) {
    for (const k of extractKeys(fs.readFileSync(path.join(root, f), 'utf8'))) keys.add(k);
  }
  return keys;
}

function titleLiterals(): string[] {
  const root = process.cwd();
  const out = execSync('grep -rlE "title=" src --include=*.tsx --include=*.ts', { cwd: root })
    .toString().trim().split('\n').filter(Boolean);
  const found: string[] = [];
  for (const f of out) {
    const src = fs.readFileSync(path.join(root, f), 'utf8');
    const re = /title=(?:"([^"\n]+)"|'([^'\n]+)'|\{\s*(?:'([^'\n]+)'|"([^"\n]+)")\s*\})/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(src))) {
      const val = m[1] ?? m[2] ?? m[3] ?? m[4];
      if (!val || /\{|\}/.test(val)) continue;
      if (!/[\p{L}]/u.test(val)) continue;
      found.push(val);
    }
  }
  return found;
}

describe('TIP_PHRASES (kutu ipuçları çeviri paketi)', () => {
  it('her kayıt 13 dilin tamamını içerir', () => {
    for (const [key, tx] of Object.entries(TIP_PHRASES)) {
      for (const locale of NON_TR_LOCALES) {
        expect(tx[locale as keyof typeof tx], `${key} için ${locale} eksik`).toBeTruthy();
      }
    }
  });

  it('bilinen ipuçlarını doğru çevirir', () => {
    expect(TIP_PHRASES['Bugünkü satış işlemi sayısı'].en).toBe('Number of sales transactions today');
    expect(TIP_PHRASES['Sepete ekle']).toBeUndefined(); // ana sözlükte olanlar burada yok
    expect(TIP_PHRASES['Kaldır'].de).toBe('Entfernen');
    expect(TIP_PHRASES['Yedeği Sil'].zh).toBe('删除备份');
  });

  it('kaynaktaki tüm title metinleri sözlükte karşılık bulur', () => {
    const keys = dictionaryKeys();
    const missing = titleLiterals().filter((t) => !keys.has(t));
    expect(missing, `Sözlükte karşılığı olmayan title metinleri: ${JSON.stringify(missing)}`).toEqual([]);
  });
});
