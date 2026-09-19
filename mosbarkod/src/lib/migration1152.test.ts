import { describe, it, expect, beforeEach, vi } from 'vitest';
import { defaultProducts, defaultState, loadState, saveState } from '../data';
import { resolveProductImage } from './seedImages';

function mockStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => {
      store.set(k, String(v));
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => store.clear(),
  });
}

/** GÖRSELSİZ eski kayıt: 40 ürün var ama hiçbirinde resim yok (1.15.1 öncesi). */
function seedImageLessState() {
  const old = defaultState();
  old.products = defaultProducts().map((p) => ({ ...p, image: undefined }));
  old.settings.update.seedMigration = '1.14.1';
  saveState(old);
}

describe('v1.15.2 ürün görseli göçü', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    mockStorage();
  });

  it('görseli boş olan TÜM örnek ürünlere resim işler', () => {
    seedImageLessState();
    const loaded = loadState();
    expect(loaded.products).toHaveLength(40);
    const withImg = loaded.products.filter((p) => (p.image || '').trim().length > 0);
    expect(withImg).toHaveLength(40);
    expect(loaded.settings.update.seedMigration).toBe('1.15.2');
    // barkodlar bozulmamalı
    expect(loaded.products.map((p) => p.barcode)).toEqual(
      defaultProducts().map((p) => p.barcode),
    );
  });

  it("kısa 'seed:' anahtarları gerçek görsele çözülür", () => {
    seedImageLessState();
    const loaded = loadState();
    const domates = loaded.products.find((p) => p.barcode === '8691041033331');
    expect(domates?.image).toBe('seed:domates');
    const cozulen = resolveProductImage(domates?.image);
    expect(cozulen).toBeTruthy();
    expect(cozulen!.startsWith('data:image/')).toBe(true);
  });

  it("kullanıcının kendi görseline (data:) dokunmaz", () => {
    seedImageLessState();
    const once = loadState();
    const kendi = 'data:image/jpeg;base64,BENIMGORSELIM';
    once.products[0].image = kendi;
    saveState(once);

    const twice = loadState();
    expect(twice.products[0].image).toBe(kendi);
  });

  it('eski internet adresli (pexels) görselleri gömülü görselle değiştirir', () => {
    seedImageLessState();
    const once = loadState();
    once.products[1].image = 'https://images.pexels.com/photos/99999999/pexels-photo.jpeg';
    saveState(once);
    // göç bayrağı bir kez işlediği için bayrağı geri alıp yeniden çalıştırıyoruz
    const raw = JSON.parse(localStorage.getItem('mosbarkod_v15_state')!);
    raw.settings.update.seedMigration = '1.14.1';
    localStorage.setItem('mosbarkod_v15_state', JSON.stringify(raw));

    const fixed = loadState();
    expect(fixed.products[1].image).toBeTruthy();
    expect(fixed.products[1].image!.startsWith('http')).toBe(false);
    expect(resolveProductImage(fixed.products[1].image)!.startsWith('data:image/')).toBe(true);
  });
});
