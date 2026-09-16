import { describe, it, expect, beforeEach, vi } from 'vitest';
import { defaultProducts, defaultState, loadState, saveState } from '../data';

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

/** v1.13 görünümünde eski kayıt üretir: 20 eski ürün + POS açık + göç bayrağı yok. */
function seedLegacyState() {
  const old = defaultState();
  old.products = defaultProducts().slice(0, 20);
  old.settings.modules = { imkart: true, delivery: true, posint: true };
  delete (old.settings.update as Record<string, unknown>).seedMigration;
  saveState(old);
}

describe('v1.14.1 seed migration', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    mockStorage();
  });

  it('eski kayda 20 yeni ürünü ekler ve POS modülünü kapatır', () => {
    seedLegacyState();
    const loaded = loadState();
    expect(loaded.products).toHaveLength(40);
    expect(loaded.settings.modules.posint).toBe(false);
    expect(loaded.settings.update.seedMigration).toBe('1.14.1');
    const cats = new Set(loaded.products.map((p) => p.category));
    expect(cats.has('Dondurma')).toBe(true);
    expect(cats.has('Manav')).toBe(true);
    expect(cats.has('Çikolata & Gofret')).toBe(true);
    // barkodlar tekil kalmalı
    const codes = loaded.products.map((p) => p.barcode);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('ikinci açılışta ürünleri yinelemez, kullanıcı tercihine dokunmaz', () => {
    seedLegacyState();
    const once = loadState();
    // kullanıcı POS modülünü tekrar açar + bir yeni ürünü siler
    once.settings.modules.posint = true;
    once.products = once.products.filter((p) => p.barcode !== '8691041021211');
    saveState(once);

    const twice = loadState();
    expect(twice.products).toHaveLength(39);
    expect(twice.settings.modules.posint).toBe(true);
  });

  it('sıfır kurulumda 40 ürün + kapalı POS ile başlar', () => {
    const fresh = loadState();
    expect(fresh.products).toHaveLength(40);
    expect(fresh.settings.modules.posint).toBe(false);
  });
});
