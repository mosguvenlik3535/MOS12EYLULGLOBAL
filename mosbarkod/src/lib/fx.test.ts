import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  __resetFxForTest,
  FX_FALLBACK_RATES,
  fxRate,
  isFxStale,
  parseFxPayload,
  refreshFxForce,
  setFxRates,
} from './fx';

afterEach(() => {
  __resetFxForTest();
  vi.unstubAllGlobals();
});

describe('parseFxPayload', () => {
  it('er-api şeklini ayrıştırır', () => {
    const out = parseFxPayload({ result: 'success', base_code: 'TRY', rates: { USD: 0.024, EUR: 0.022, XXX: 5 } });
    expect(out).toEqual({ USD: 0.024, EUR: 0.022 });
  });
  it('frankfurter şeklini ayrıştırır', () => {
    const out = parseFxPayload({ amount: 1, base: 'TRY', rates: { USD: 0.024, GBP: 0.019 } });
    expect(out).toEqual({ USD: 0.024, GBP: 0.019 });
  });
  it('bozuk/kur içermeyen yanıtları ele', () => {
    expect(parseFxPayload(null)).toBeNull();
    expect(parseFxPayload({})).toBeNull();
    expect(parseFxPayload({ rates: { XXX: 1 } })).toBeNull();
    expect(parseFxPayload({ rates: { USD: -1, EUR: NaN } })).toBeNull();
  });
});

describe('kur mağazası', () => {
  it('bilinmeyen/geçersiz kurda güvenli 1 döner', () => {
    expect(fxRate('XXX')).toBe(1);
    setFxRates({ USD: -5 } as Record<string, number>, 'x');
    expect(fxRate('USD')).toBe(FX_FALLBACK_RATES.USD);
  });
  it('yanıtta olmayan kodların kurunu korur', () => {
    setFxRates({ USD: 0.05 }, 't1');
    setFxRates({ EUR: 0.04 }, 't2');
    expect(fxRate('USD')).toBe(0.05);
    expect(fxRate('EUR')).toBe(0.04);
  });
  it('TRY her zaman 1 kilitlidir', () => {
    setFxRates({ TRY: 99 } as Record<string, number>, 't');
    expect(fxRate('TRY')).toBe(1);
  });
});

describe('bayatlık', () => {
  it('hiç alınmamışsa bayattır, 25 saatlik önbellek bayattır, taze değildir', () => {
    expect(isFxStale()).toBe(true);
    setFxRates({}, new Date(Date.now() - 25 * 3600 * 1000).toISOString());
    expect(isFxStale()).toBe(true);
    setFxRates({}, new Date().toISOString());
    expect(isFxStale()).toBe(false);
  });
});

describe('refreshFxForce', () => {
  it('birincil kaynak yanıt verirse kurları günceller', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => ({ result: 'success', rates: { USD: 0.031 } }) }))
    );
    const r = await refreshFxForce();
    expect(r).toBe('updated');
    expect(fxRate('USD')).toBe(0.031);
  });
  it('birincil ölürse yedeğe düşer', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        String(url).includes('er-api')
          ? { ok: false, json: async () => ({}) }
          : { ok: true, json: async () => ({ base: 'TRY', rates: { USD: 0.032 } }) }
      )
    );
    const r = await refreshFxForce();
    expect(r).toBe('updated');
    expect(fxRate('USD')).toBe(0.032);
  });
  it('tam çevrimdışıyken önbelleği/gömülüyü korur', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('ağ yok');
      })
    );
    const r = await refreshFxForce();
    expect(r).toBe('offline');
    expect(fxRate('USD')).toBe(FX_FALLBACK_RATES.USD);
  });
});
