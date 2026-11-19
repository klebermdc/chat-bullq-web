import { describe, expect, it } from 'vitest';
import type { OperatorRate } from '../service';
import { formatRate, manualLabel, parseRateInput, rateTitle } from './format';

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
  updatedByName: null,
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

  it('operadora manual sem valor avisa que não foi lançado', () => {
    expect(rateTitle({ ...base, code: 'AZ', name: 'Azul Viagens', value: null, manual: true })).toBe(
      'Azul Viagens: ainda não lançado hoje',
    );
  });
});

describe('parseRateInput', () => {
  it('aceita vírgula ou ponto', () => {
    expect(parseRateInput('5,88')).toBe(5.88);
    expect(parseRateInput(' 5.8828 ')).toBe(5.8828);
  });

  it('recusa vazio e valor fora da faixa', () => {
    expect(parseRateInput('')).toBeNull();
    expect(parseRateInput('58,8')).toBeNull();
    expect(parseRateInput('abc')).toBeNull();
  });
});

describe('manualLabel', () => {
  const now = new Date('2026-11-19T15:00:00');
  it('mostra quem lançou e a hora quando é hoje', () => {
    const at = new Date('2026-11-19T10:32:00').toISOString();
    expect(manualLabel({ ...base, manual: true, changedAt: at, updatedByName: 'Kleber' }, now)).toBe(
      'lançado por Kleber às 10:32',
    );
  });

  it('mostra a data quando não é hoje', () => {
    const at = new Date('2026-11-18T10:32:00').toISOString();
    expect(manualLabel({ ...base, manual: true, changedAt: at, updatedByName: null }, now)).toBe('lançado em 18/11');
  });
});
