import { describe, expect, it } from 'vitest';
import {
  formatAverage,
  formatAxisMoney,
  formatCost,
  formatCount,
  formatDayFull,
  formatRange,
  formatUnitPrice,
} from './format';

// O Intl usa espaço não separável entre símbolo e número.
const normalize = (text: string) => text.replace(/\s/g, ' ');

describe('formatCost', () => {
  it('formata na moeda de cada canal, com duas casas', () => {
    expect(normalize(formatCost(1234.567, 'BRL'))).toBe('R$ 1.234,57');
    expect(normalize(formatCost(12.5, 'USD'))).toBe('US$ 12,50');
  });

  it('cai para real quando a moeda vem vazia ou é desconhecida', () => {
    expect(normalize(formatCost(3, null))).toBe('R$ 3,00');
    expect(normalize(formatCost(3, 'XX'))).toBe('R$ 3,00');
  });

  it('mostra travessão quando não há valor', () => {
    expect(formatCost(null, 'BRL')).toBe('—');
    expect(formatCost(Number.NaN, 'BRL')).toBe('—');
  });
});

describe('formatUnitPrice', () => {
  it('mostra até quatro casas para preço por mensagem', () => {
    expect(normalize(formatUnitPrice(0.3217, 'BRL'))).toBe('R$ 0,3217');
    expect(normalize(formatUnitPrice(0.035, 'BRL'))).toBe('R$ 0,035');
    expect(normalize(formatUnitPrice(0.0068, 'USD'))).toBe('US$ 0,0068');
  });
});

describe('formatCount, formatAverage e formatAxisMoney', () => {
  it('usa ponto de milhar e vírgula decimal', () => {
    expect(formatCount(12345)).toBe('12.345');
    expect(formatCount(undefined)).toBe('—');
    expect(formatAverage(4.56)).toBe('4,6');
    expect(formatAverage(4)).toBe('4');
    expect(formatAxisMoney(1234.5)).toBe('1.234,5');
  });
});

describe('formatDayFull e formatRange', () => {
  it('lê o dia direto da string', () => {
    expect(formatDayFull('2026-11-01')).toBe('01/11/2026');
    expect(formatDayFull('ontem')).toBe('ontem');
  });

  it('junta início e fim, ou mostra um dia só', () => {
    expect(formatRange('2026-11-01', '2026-11-13')).toBe('01/11/2026 a 13/11/2026');
    expect(formatRange('2026-11-13', '2026-11-13')).toBe('13/11/2026');
  });
});
