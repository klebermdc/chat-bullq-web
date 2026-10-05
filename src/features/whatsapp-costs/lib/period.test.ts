import { describe, expect, it } from 'vitest';
import { DEFAULT_PERIOD, PERIOD_OPTIONS, computePeriod } from './period';

const NOW = new Date('2026-10-05T15:30:00.000Z');

describe('computePeriod', () => {
  it('termina sempre no instante atual', () => {
    for (const option of PERIOD_OPTIONS) {
      expect(computePeriod(option.value, NOW).to).toBe('2026-10-05T15:30:00.000Z');
    }
  });

  it('volta 7, 30 e 90 dias corridos a partir de agora', () => {
    expect(computePeriod('7d', NOW).from).toBe('2026-09-28T15:30:00.000Z');
    expect(computePeriod('30d', NOW).from).toBe('2026-09-05T15:30:00.000Z');
    expect(computePeriod('90d', NOW).from).toBe('2026-07-07T15:30:00.000Z');
  });

  it('"Este mês" começa à meia-noite do dia 1º em São Paulo (03:00 UTC)', () => {
    expect(computePeriod('month', NOW).from).toBe('2026-10-01T03:00:00.000Z');
  });

  it('"Este mês" usa o mês de São Paulo quando em UTC o mês já virou', () => {
    // 01/11 às 01:00 UTC ainda é 31/10 às 22:00 em São Paulo.
    const lateOctober = new Date('2026-11-01T01:00:00.000Z');

    expect(computePeriod('month', lateOctober).from).toBe('2026-10-01T03:00:00.000Z');
  });

  it('"Este mês" em janeiro não volta para o ano anterior', () => {
    const january = new Date('2027-01-15T12:00:00.000Z');

    expect(computePeriod('month', january).from).toBe('2027-01-01T03:00:00.000Z');
  });

  it('não altera a data recebida', () => {
    const now = new Date(NOW);

    computePeriod('90d', now);

    expect(now.toISOString()).toBe(NOW.toISOString());
  });
});

describe('PERIOD_OPTIONS', () => {
  it('oferece os quatro períodos, na ordem da tela, com 30 dias como padrão', () => {
    expect(PERIOD_OPTIONS.map((o) => o.label)).toEqual(['7 dias', '30 dias', '90 dias', 'Este mês']);
    expect(DEFAULT_PERIOD).toBe('30d');
  });
});
