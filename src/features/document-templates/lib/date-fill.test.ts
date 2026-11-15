import { describe, expect, it } from 'vitest';
import { dateFillValues, isDatePlaceholder } from './date-fill';

const NOV_5_2026 = new Date(2026, 10, 5);

describe('dateFillValues', () => {
  it('fills day, month name and year in pt-BR', () => {
    expect(dateFillValues(['[Dia]', '[Mês]', '[Ano]'], NOV_5_2026)).toEqual({
      '[Dia]': '05',
      '[Mês]': 'novembro',
      '[Ano]': '2026',
    });
  });

  it('fills a full date and accepts labels without accent or with other casing', () => {
    expect(dateFillValues(['[data]', '[MES]', '[Data de hoje]'], NOV_5_2026)).toEqual({
      '[data]': '05/11/2026',
      '[MES]': 'novembro',
      '[Data de hoje]': '05/11/2026',
    });
  });

  it('leaves other placeholders out, including other dates', () => {
    expect(dateFillValues(['[Nome do Cliente]', '[Data da viagem]'], NOV_5_2026)).toEqual({});
  });
});

describe('isDatePlaceholder', () => {
  it('recognizes only the exact date labels', () => {
    expect(isDatePlaceholder('[Mês]')).toBe(true);
    expect(isDatePlaceholder('[Data da viagem]')).toBe(false);
  });
});
