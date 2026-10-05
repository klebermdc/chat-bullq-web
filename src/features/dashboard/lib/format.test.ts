import { describe, expect, it } from 'vitest';
import { formatNumber, formatPercent } from './format';

describe('formatNumber', () => {
  it('uses a comma as the decimal separator', () => {
    expect(formatNumber(6.4)).toBe('6,4');
  });

  it('uses a dot as the thousands separator', () => {
    expect(formatNumber(12345)).toBe('12.345');
  });

  it('keeps an integer without decimals', () => {
    expect(formatNumber(87)).toBe('87');
  });

  it('rounds to one decimal place', () => {
    expect(formatNumber(4.26)).toBe('4,3');
  });

  it('returns a dash when there is no value', () => {
    expect(formatNumber(null)).toBe('—');
    expect(formatNumber(undefined)).toBe('—');
    expect(formatNumber(Number.NaN)).toBe('—');
  });
});

describe('formatPercent', () => {
  it('appends the percent sign to a pt-BR number', () => {
    expect(formatPercent(87.3)).toBe('87,3%');
  });

  it('returns a dash when there is no value', () => {
    expect(formatPercent(null)).toBe('—');
  });
});
