import { describe, expect, it } from 'vitest';
import { EXPENSE_CATS } from '../data';
import { TIP_PHRASES } from '../locales/tooltipPhrases';

describe('vehicle fuel expense category', () => {
  it('offers a single vehicle fuel category without removing existing categories', () => {
    expect(EXPENSE_CATS.filter(c => c.name === 'Araç Yakıt')).toHaveLength(1);
    expect(EXPENSE_CATS.map(c => c.name)).toContain('Kira');
    expect(EXPENSE_CATS.map(c => c.name)).toContain('Diğer Harcamalar');
    expect(EXPENSE_CATS.find(c => c.name === 'Araç Yakıt')?.color).toMatch(/^#[a-f0-9]{6}$/);
  });
  it('has translations in all thirteen other application languages', () => {
    expect(Object.keys(TIP_PHRASES['Araç Yakıt'])).toHaveLength(13);
    expect(TIP_PHRASES['Araç Yakıt'].en).toBe('Vehicle Fuel');
  });
});
