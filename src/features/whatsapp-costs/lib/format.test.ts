import { describe, expect, it } from 'vitest';
import {
  formatCost,
  formatCount,
  formatDayFull,
  formatRate,
  formatRatioPercent,
  parseRateInput,
  shareOf,
} from './format';

// O Intl separa símbolo e número com espaço não separável; aqui só importa o texto.
const plain = (text: string) => text.replace(/ /g, ' ');

describe('formatCost', () => {
  it('mostra o total com duas casas, sem arredondar para inteiro', () => {
    expect(plain(formatCost(12.3, 'BRL'))).toBe('R$ 12,30');
    expect(plain(formatCost(1234.567, 'BRL'))).toBe('R$ 1.234,57');
  });

  it('mostra zero como valor, não como vazio', () => {
    expect(plain(formatCost(0, 'BRL'))).toBe('R$ 0,00');
  });

  it('usa a moeda informada', () => {
    expect(plain(formatCost(3.5, 'USD'))).toBe('US$ 3,50');
  });

  it('cai em real quando a moeda é inválida ou vazia', () => {
    expect(plain(formatCost(1, 'XX'))).toBe('R$ 1,00');
    expect(plain(formatCost(1, ''))).toBe('R$ 1,00');
    expect(plain(formatCost(1, null))).toBe('R$ 1,00');
  });

  it('devolve travessão quando não há número', () => {
    expect(formatCost(null, 'BRL')).toBe('—');
    expect(formatCost(undefined, 'BRL')).toBe('—');
    expect(formatCost(Number.NaN, 'BRL')).toBe('—');
  });
});

describe('formatRate', () => {
  it('mantém até quatro casas em tarifa abaixo de um centavo', () => {
    expect(plain(formatRate(0.0068, 'USD'))).toBe('US$ 0,0068');
    expect(plain(formatRate(0.0625, 'BRL'))).toBe('R$ 0,0625');
  });

  it('não mostra casas sobrando quando duas bastam', () => {
    expect(plain(formatRate(0.35, 'BRL'))).toBe('R$ 0,35');
    expect(plain(formatRate(0, 'BRL'))).toBe('R$ 0,00');
  });

  it('arredonda na quarta casa', () => {
    expect(plain(formatRate(0.00685, 'BRL'))).toBe('R$ 0,0069');
  });

  it('devolve travessão quando não há número', () => {
    expect(formatRate(undefined, 'BRL')).toBe('—');
  });
});

describe('formatRatioPercent', () => {
  it('formata a fração 0..1 com uma casa e vírgula', () => {
    expect(formatRatioPercent(0.973)).toBe('97,3%');
    expect(formatRatioPercent(0.5)).toBe('50,0%');
    expect(formatRatioPercent(1)).toBe('100,0%');
    expect(formatRatioPercent(0)).toBe('0,0%');
  });

  it('arredonda para uma casa', () => {
    expect(formatRatioPercent(0.12345)).toBe('12,3%');
    expect(formatRatioPercent(0.99999)).toBe('100,0%');
  });

  it('devolve travessão quando não há número', () => {
    expect(formatRatioPercent(null)).toBe('—');
    expect(formatRatioPercent(undefined)).toBe('—');
    expect(formatRatioPercent(Number.NaN)).toBe('—');
  });
});

describe('shareOf', () => {
  it('devolve a fração da parte no total', () => {
    expect(shareOf(25, 100)).toBe(0.25);
  });

  it('devolve zero quando o total é zero', () => {
    expect(shareOf(0, 0)).toBe(0);
    expect(shareOf(5, 0)).toBe(0);
  });
});

describe('formatCount', () => {
  it('usa ponto de milhar', () => {
    expect(formatCount(12345)).toBe('12.345');
    expect(formatCount(0)).toBe('0');
  });

  it('devolve travessão quando não há número', () => {
    expect(formatCount(undefined)).toBe('—');
  });
});

describe('formatDayFull', () => {
  it('lê o dia direto da string, sem passar por fuso', () => {
    expect(formatDayFull('2026-10-01')).toBe('01/10/2026');
    expect(formatDayFull('2026-01-31')).toBe('31/01/2026');
  });

  it('devolve o texto original quando não é uma data', () => {
    expect(formatDayFull('ontem')).toBe('ontem');
  });
});

describe('parseRateInput', () => {
  it('aceita vírgula ou ponto como separador decimal', () => {
    expect(parseRateInput('0,0625')).toBe(0.0625);
    expect(parseRateInput('0.0625')).toBe(0.0625);
    expect(parseRateInput(' 0,35 ')).toBe(0.35);
  });

  it('não confunde tarifa de três casas com milhar', () => {
    expect(parseRateInput('0.123')).toBe(0.123);
    expect(parseRateInput('0,123')).toBe(0.123);
  });

  it('lê vazio como zero (categoria sem tarifa)', () => {
    expect(parseRateInput('')).toBe(0);
    expect(parseRateInput('   ')).toBe(0);
  });

  it('recusa texto, negativo e mais de um separador', () => {
    expect(parseRateInput('abc')).toBeNull();
    expect(parseRateInput('-1')).toBeNull();
    expect(parseRateInput('1.234,56')).toBeNull();
    expect(parseRateInput('R$ 0,35')).toBeNull();
  });
});
