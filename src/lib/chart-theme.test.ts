import { describe, expect, it } from 'vitest';
import { formatChartDay } from './chart-theme';

describe('data do eixo do gráfico', () => {
  it('mostra dia/mês', () => {
    expect(formatChartDay('2026-09-06')).toBe('06/09');
    expect(formatChartDay('2026-10-03T00:00:00.000Z')).toBe('03/10');
  });

  it('devolve o texto original quando não é data ISO', () => {
    expect(formatChartDay('WhatsApp Vendas')).toBe('WhatsApp Vendas');
  });

  it('devolve vazio para valor que não é texto', () => {
    expect(formatChartDay(undefined)).toBe('');
    expect(formatChartDay(12)).toBe('');
  });
});
