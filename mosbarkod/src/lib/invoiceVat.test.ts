import { describe, it, expect, beforeEach, vi } from 'vitest';
import { defaultState, loadState, saveState, invoiceVatSummary, type Invoice } from '../data';

/* Alış faturası KDV DAHİL (brüt) esası:
   Mal alınırken KDV bedeli de fiilen ödendiği için birim maliyet KDV DAHİL
   tutulur. Fatura TOPLAMI değişmez; yalnızca matrah/KDV kırılımı ve stok
   kartına yazılan maliyet brüt olur. */

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

const URUN = 'Efes Malt Şişe 50cl';

function fatura(over: Partial<Invoice> = {}): Invoice {
  return {
    id: 'i1',
    no: 'AF1',
    date: new Date().toISOString(),
    supplier: 'Test Tedarikçi',
    payType: 'nakit',
    lines: [{ name: URUN, qty: 10, cost: 50, sale: 72, vatRate: 20 }],
    total: 600,
    status: 'odendi',
    vatIncluded: true,
    ...over,
  };
}

describe('alış faturasında KDV DAHİL hesap', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    mockStorage();
  });

  it('KDV dahil girilen birim fiyattan matrah ve KDV ayrışır', () => {
    // 10 adet × 50 TL = 500 TL brüt (KDV dahil)
    const s = invoiceVatSummary(fatura());
    expect(s.gross).toBe(500);
    expect(s.base).toBeCloseTo(416.67, 1);
    expect(s.vat).toBeCloseTo(83.33, 1);
    expect(s.rows[0].rate).toBe(20);
  });

  it('bayrak taşımayan eski kayıtlar da KDV DAHİL yorumlanır', () => {
    const inv = fatura();
    delete inv.vatIncluded;
    expect(invoiceVatSummary(inv).gross).toBe(500);
  });

  it('KDV oranı %1 olan kalemde de brüt esas geçerlidir', () => {
    const s = invoiceVatSummary(
      fatura({ lines: [{ name: URUN, qty: 10, cost: 101, sale: 120, vatRate: 1 }] }),
    );
    expect(s.gross).toBe(1010);
    expect(s.base).toBe(1000);
    expect(s.vat).toBe(10);
  });

  it('eski (KDV HARİÇ) kayıt açılışta brüte çevrilir, toplam korunur', () => {
    const st = defaultState();
    st.invoices = [fatura({ vatIncluded: false, subtotal: 500, vatTotal: 100, total: 600 })];
    const urun = st.products.find((p) => p.name === URUN)!;
    urun.cost = 50; // faturadan gelmiş NET maliyet
    delete st.settings.update.invoiceVatMigration;
    saveState(st);

    const y = loadState();
    // 50 net × 1,20 = 60 brüt
    expect(y.invoices[0].vatIncluded).toBe(true);
    expect(y.invoices[0].lines[0].cost).toBe(60);
    // stok kartındaki maliyet de brüte çekilir
    expect(y.products.find((p) => p.name === URUN)!.cost).toBe(60);
    // fatura toplamı DEĞİŞMEZ (matrah 500 + KDV 100 = 600)
    const s = invoiceVatSummary(y.invoices[0]);
    expect(s.base).toBe(500);
    expect(s.vat).toBe(100);
    expect(s.gross).toBe(600);
  });

  it('kullanıcının elle girdiği maliyetlere dokunulmaz', () => {
    const st = defaultState();
    st.invoices = [fatura({ vatIncluded: false })];
    const urun = st.products.find((p) => p.name === URUN)!;
    urun.cost = 47.5; // faturadan GELMEYEN, elle girilmiş maliyet
    delete st.settings.update.invoiceVatMigration;
    saveState(st);

    const y = loadState();
    expect(y.products.find((p) => p.name === URUN)!.cost).toBe(47.5);
  });

  it('göç ikinci açılışta tekrar çalışmaz (maliyet iki kez şişmez)', () => {
    const st = defaultState();
    st.invoices = [fatura({ vatIncluded: false })];
    delete st.settings.update.invoiceVatMigration;
    saveState(st);

    const bir = loadState();
    expect(bir.invoices[0].lines[0].cost).toBe(60);
    saveState(bir);

    const iki = loadState();
    expect(iki.invoices[0].lines[0].cost).toBe(60);
  });
});
