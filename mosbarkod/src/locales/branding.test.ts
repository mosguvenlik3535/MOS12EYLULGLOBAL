import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');
const withoutComments = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, '');

function uiFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? uiFiles(path) : path.endsWith('.tsx') ? [path] : [];
  });
}

describe('Neutral application branding', () => {
  it('does not display Turkish AI branding in UI or application metadata', () => {
    const files = [...uiFiles('src'), 'index.html', 'public/manifest.webmanifest',
      'public/gizlilik-politikasi.html', 'package.json', 'src/locales/tr.ts'];
    for (const file of files) {
      expect(withoutComments(read(file)), file).not.toMatch(/yapay\s+zek[âa]/iu);
    }
  });

  it('retains recognition and product lookup buttons and their handlers', () => {
    expect(read('src/screens/Pos.tsx')).toContain('>AI TANI</span>');
    const products = read('src/screens/Products.tsx');
    expect(products).toContain('>AI</span>');
    expect(products).toContain('onClick={fetchByName}');
    expect(read('src/locales/en.ts')).toContain("'aivision.btn': 'AI SCAN'");
  });
});
