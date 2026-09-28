import { describe, expect, it } from 'vitest';
import { formatMoney, parseMoneyBR, sumByCurrency } from './money';

describe('parseMoneyBR', () => {
  it('lê milhar com ponto e centavos com vírgula', () => {
    expect(parseMoneyBR('4.500,00')).toBe(4500);
    expect(parseMoneyBR('R$ 12.345,67')).toBe(12345.67);
  });

  it('lê valores sem milhar', () => {
    expect(parseMoneyBR('4500')).toBe(4500);
    expect(parseMoneyBR('4500,5')).toBe(4500.5);
  });

  it('entende ponto como milhar quando vem em grupos de três', () => {
    expect(parseMoneyBR('4.500')).toBe(4500);
    expect(parseMoneyBR('1.250.000')).toBe(1250000);
  });

  it('entende ponto como decimal no formato americano', () => {
    expect(parseMoneyBR('4500.50')).toBe(4500.5);
    expect(parseMoneyBR('US$ 1,250.75')).toBe(1250.75);
  });

  it('devolve null para vazio ou texto sem número', () => {
    expect(parseMoneyBR('')).toBeNull();
    expect(parseMoneyBR('   ')).toBeNull();
    expect(parseMoneyBR('abc')).toBeNull();
  });
});

describe('formatMoney', () => {
  it('usa a moeda do card', () => {
    expect(formatMoney(4500, 'USD')).toMatch(/US\$\s?4\.500/);
    expect(formatMoney('4500', 'BRL')).toMatch(/R\$\s?4\.500/);
  });

  it('cai em real quando a moeda é vazia ou inválida', () => {
    expect(formatMoney(10, '')).toMatch(/R\$/);
    expect(formatMoney(10, 'XX')).toMatch(/R\$/);
  });

  it('devolve null sem valor', () => {
    expect(formatMoney(null, 'BRL')).toBeNull();
    expect(formatMoney('', 'BRL')).toBeNull();
  });
});

describe('sumByCurrency', () => {
  it('não soma moedas diferentes', () => {
    const label = sumByCurrency([
      { value: '1000', currency: 'BRL' },
      { value: 500, currency: 'USD' },
      { value: '2000', currency: 'BRL' },
    ]);
    expect(label).toMatch(/R\$\s?3\.000/);
    expect(label).toMatch(/US\$\s?500/);
  });

  it('devolve null quando não há valor', () => {
    expect(sumByCurrency([{ value: null, currency: 'BRL' }])).toBeNull();
  });
});
