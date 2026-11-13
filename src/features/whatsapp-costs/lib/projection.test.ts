import { describe, expect, it } from 'vitest';
import { projectMonthCost } from './projection';

const day = (date: string, cost: number) => ({ date, cost });

describe('projectMonthCost', () => {
  it('usa a média dos dias fechados, sem o dia de hoje', () => {
    // 12 dias fechados a R$ 10 + hoje parcial R$ 1 → R$ 10/dia × 30 = R$ 300.
    const daily = [...Array.from({ length: 12 }, (_, i) => day(`2026-11-${String(i + 1).padStart(2, '0')}`, 10)), day('2026-11-13', 1)];
    expect(projectMonthCost(daily, '2026-11-13')).toBe(300);
  });

  it('no dia 1º não projeta', () => {
    expect(projectMonthCost([day('2027-02-01', 2)], '2027-02-01')).toBeNull();
  });

  it('custo zero projeta zero', () => {
    expect(projectMonthCost([day('2026-11-12', 0)], '2026-11-13')).toBe(0);
  });

  it('devolve null com data inválida', () => {
    expect(projectMonthCost([day('2026-11-12', 5)], '13/11/2026')).toBeNull();
  });
});
