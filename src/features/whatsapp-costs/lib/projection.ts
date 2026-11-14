import { daysInMonth } from './period';

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const NEXT_DAYS_HORIZON = 30;

type DailyCost = { date: string; cost: number };

/**
 * Previsão de gasto pelo ritmo dos dias já fechados.
 * - `month`: fechamento do mês corrente (média × dias do mês) e quanto ainda falta.
 * - `next30`: próximos 30 dias, para períodos que não são o mês corrente.
 */
export interface CostForecast {
  horizon: 'month' | 'next30';
  total: number;
  dailyAverage: number;
  /** Só em `month`: o que ainda deve entrar até o fim do mês. */
  remaining: number | null;
}

export interface ForecastInput {
  daily: ReadonlyArray<DailyCost>;
  /** Último dia do período ('YYYY-MM-DD'). */
  periodEnd: string;
  isCurrentMonth: boolean;
  /** O período termina hoje: o último dia está pela metade e fica fora da média. */
  endsToday: boolean;
}

const sumCost = (days: ReadonlyArray<DailyCost>) => days.reduce((sum, d) => sum + d.cost, 0);

/**
 * Hoje fica de fora da média porque está pela metade (mesma regra do /custos
 * no Telegram). Null sem nenhum dia fechado (ex.: dia 1º) ou com data inválida.
 */
export function forecastCost({ daily, periodEnd, isCurrentMonth, endsToday }: ForecastInput): CostForecast | null {
  if (!ISO_DAY.test(periodEnd)) return null;
  const valid = daily.filter((d) => Number.isFinite(d.cost));
  const closed = endsToday || isCurrentMonth ? valid.filter((d) => d.date < periodEnd) : valid;
  if (closed.length === 0) return null;

  const dailyAverage = sumCost(closed) / closed.length;
  if (!isCurrentMonth) {
    return { horizon: 'next30', total: dailyAverage * NEXT_DAYS_HORIZON, dailyAverage, remaining: null };
  }
  const total = dailyAverage * daysInMonth(periodEnd);
  return { horizon: 'month', total, dailyAverage, remaining: Math.max(0, total - sumCost(valid)) };
}
