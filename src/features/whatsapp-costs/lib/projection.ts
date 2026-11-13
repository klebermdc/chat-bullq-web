import { daysInMonth } from './period';

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Projeção do mês pela média dos dias já fechados × dias do mês. Hoje fica de
 * fora porque está pela metade (mesma regra do /custos no Telegram).
 * Null no dia 1º (nenhum dia fechado) ou com data inválida.
 */
export function projectMonthCost(
  daily: ReadonlyArray<{ date: string; cost: number }>,
  today: string,
): number | null {
  if (!ISO_DAY.test(today)) return null;
  const closed = daily.filter((d) => d.date < today && Number.isFinite(d.cost));
  if (closed.length === 0) return null;
  const total = closed.reduce((sum, d) => sum + d.cost, 0);
  return (total / closed.length) * daysInMonth(today);
}
