import { describe, expect, it } from 'vitest';
import { DEFAULT_PERIOD, PERIOD_OPTIONS, computePeriod, daysInMonth, todayIn } from './period';

describe('todayIn', () => {
  it('usa o dia do fuso da organização, não o de UTC', () => {
    // 14/11 às 01:00 UTC ainda é 13/11 às 22:00 em São Paulo.
    expect(todayIn('America/Sao_Paulo', new Date('2026-11-14T01:00:00.000Z'))).toBe('2026-11-13');
    expect(todayIn('UTC', new Date('2026-11-14T01:00:00.000Z'))).toBe('2026-11-14');
  });
});

describe('computePeriod', () => {
  it('"Este mês" vai do dia 1º até hoje', () => {
    expect(computePeriod('month', '2026-11-13')).toEqual({ from: '2026-11-01', to: '2026-11-13' });
  });

  it('"Mês passado" cobre o mês anterior inteiro', () => {
    expect(computePeriod('lastMonth', '2026-11-13')).toEqual({ from: '2026-10-01', to: '2026-10-31' });
  });

  it('"Mês passado" em janeiro volta para dezembro do ano anterior', () => {
    expect(computePeriod('lastMonth', '2027-01-05')).toEqual({ from: '2026-12-01', to: '2026-12-31' });
  });

  it('"Mês passado" em março acerta fevereiro de ano bissexto', () => {
    expect(computePeriod('lastMonth', '2028-03-10')).toEqual({ from: '2028-02-01', to: '2028-02-29' });
  });

  it('últimos 7 e 30 dias contam hoje como um dos dias', () => {
    expect(computePeriod('7d', '2026-11-13')).toEqual({ from: '2026-11-07', to: '2026-11-13' });
    expect(computePeriod('30d', '2026-11-13')).toEqual({ from: '2026-10-15', to: '2026-11-13' });
  });

  it('recusa dia em formato errado', () => {
    expect(() => computePeriod('month', '13/11/2026')).toThrow('Dia inválido');
  });
});

describe('daysInMonth', () => {
  it('conhece meses de 28, 29, 30 e 31 dias', () => {
    expect(daysInMonth('2027-02-10')).toBe(28);
    expect(daysInMonth('2028-02-10')).toBe(29);
    expect(daysInMonth('2026-11-13')).toBe(30);
    expect(daysInMonth('2026-12-01')).toBe(31);
  });
});

describe('PERIOD_OPTIONS', () => {
  it('oferece os quatro períodos, com "Este mês" como padrão', () => {
    expect(PERIOD_OPTIONS.map((o) => o.label)).toEqual([
      'Este mês',
      'Mês passado',
      'Últimos 7 dias',
      'Últimos 30 dias',
    ]);
    expect(DEFAULT_PERIOD).toBe('month');
  });
});
