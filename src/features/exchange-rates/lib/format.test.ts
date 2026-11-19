import { describe, expect, it } from 'vitest';
import type { OperatorRate } from '../service';
import { formatRate, rateTitle } from './format';

const base: OperatorRate = {
  code: 'JT',
  name: 'Just Travel',
  url: 'https://x',
  value: 6.04,
  sourceUpdatedLabel: '18/11/2026 23:03',
  fetchedAt: null,
  changedAt: null,
  stale: false,
  manual: false,
};

describe('formatRate', () => {
  it('usa vírgula e duas casas', () => {
    expect(formatRate(6.04)).toBe('6,04');
    expect(formatRate(5.9)).toBe('5,90');
    expect(formatRate(5.8828)).toBe('5,88');
  });
});

describe('rateTitle', () => {
  it('mostra valor e data da operadora', () => {
    expect(rateTitle(base)).toBe('Just Travel: R$ 6,04 = US$ 1 · atualizado pela operadora em 18/11/2026 23:03');
  });

  it('avisa quando a leitura está antiga', () => {
    expect(rateTitle({ ...base, stale: true })).toContain('não foi possível conferir');
  });

  it('operadora manual manda consultar no site', () => {
    expect(rateTitle({ ...base, code: 'AZ', name: 'Azul Viagens', value: null, manual: true })).toBe(
      'Azul Viagens: consultar no site',
    );
  });
});
