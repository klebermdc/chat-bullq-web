import { daysInMonth } from './period';

const ISO_DAY_OF_MONTH = /^\d{4}-\d{2}-(\d{2})$/;

/**
 * Projeção do mês: custo até hoje ÷ dias corridos × dias do mês.
 * `today` é o último dia contado ('YYYY-MM-DD'); o mês começa no dia 1º.
 * Devolve null quando não dá para projetar (dia inválido ou custo inválido).
 */
export function projectMonthCost(costSoFar: number, today: string): number | null {
  const match = ISO_DAY_OF_MONTH.exec(today);
  if (!match || !Number.isFinite(costSoFar)) return null;
  const daysElapsed = Number(match[1]);
  if (daysElapsed < 1) return null;
  return (costSoFar / daysElapsed) * daysInMonth(today);
}
