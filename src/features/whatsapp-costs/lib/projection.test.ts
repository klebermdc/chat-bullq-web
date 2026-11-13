import { describe, expect, it } from 'vitest';
import { projectMonthCost } from './projection';

describe('projectMonthCost', () => {
  it('estende a média por dia até o fim do mês', () => {
    // R$ 130 em 13 dias de novembro (30 dias) → R$ 10/dia → R$ 300.
    expect(projectMonthCost(130, '2026-11-13')).toBe(300);
  });

  it('no último dia do mês a projeção é o próprio custo', () => {
    expect(projectMonthCost(412.5, '2026-10-31')).toBe(412.5);
  });

  it('no dia 1º multiplica pelo mês inteiro', () => {
    expect(projectMonthCost(2, '2027-02-01')).toBe(56);
  });

  it('custo zero projeta zero', () => {
    expect(projectMonthCost(0, '2026-11-13')).toBe(0);
  });

  it('devolve null com dia ou custo inválido', () => {
    expect(projectMonthCost(10, '2026-11-00')).toBeNull();
    expect(projectMonthCost(10, '13/11/2026')).toBeNull();
    expect(projectMonthCost(Number.NaN, '2026-11-13')).toBeNull();
  });
});
