import { describe, expect, it } from 'vitest';
import { forecastCost } from './projection';

const day = (date: string, cost: number) => ({ date, cost });
const novDays = (count: number, cost: number) =>
  Array.from({ length: count }, (_, i) => day(`2026-11-${String(i + 1).padStart(2, '0')}`, cost));

describe('forecastCost', () => {
  it('no mês corrente usa a média dos dias fechados, sem hoje, e diz quanto falta', () => {
    // 12 dias fechados a R$ 10 + hoje parcial R$ 1 → R$ 10/dia × 30 = R$ 300; gasto 121 → faltam 179.
    const daily = [...novDays(12, 10), day('2026-11-13', 1)];
    expect(forecastCost({ daily, periodEnd: '2026-11-13', isCurrentMonth: true, endsToday: true })).toEqual({
      horizon: 'month',
      total: 300,
      dailyAverage: 10,
      remaining: 179,
    });
  });

  it('no dia 1º não prevê', () => {
    const input = { daily: [day('2027-02-01', 2)], periodEnd: '2027-02-01', isCurrentMonth: true, endsToday: true };
    expect(forecastCost(input)).toBeNull();
  });

  it('em período corrido prevê os próximos 30 dias sem contar hoje', () => {
    const daily = [...novDays(6, 20), day('2026-11-07', 3)];
    expect(forecastCost({ daily, periodEnd: '2026-11-07', isCurrentMonth: false, endsToday: true })).toEqual({
      horizon: 'next30',
      total: 600,
      dailyAverage: 20,
      remaining: null,
    });
  });

  it('em período já fechado (mês passado) usa todos os dias', () => {
    const daily = [day('2026-10-30', 10), day('2026-10-31', 30)];
    const result = forecastCost({ daily, periodEnd: '2026-10-31', isCurrentMonth: false, endsToday: false });
    expect(result?.dailyAverage).toBe(20);
    expect(result?.total).toBe(600);
  });

  it('nunca diz que falta valor negativo', () => {
    // Hoje já gastou mais do que a média prevê para o resto do mês.
    const daily = [...novDays(29, 1), day('2026-11-30', 500)];
    expect(forecastCost({ daily, periodEnd: '2026-11-30', isCurrentMonth: true, endsToday: true })?.remaining).toBe(0);
  });

  it('devolve null com data inválida', () => {
    const input = { daily: [day('2026-11-12', 5)], periodEnd: '13/11/2026', isCurrentMonth: true, endsToday: true };
    expect(forecastCost(input)).toBeNull();
  });
});
