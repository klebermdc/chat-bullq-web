/**
 * Período da tela → intervalo `{ from, to }` em instantes ISO para a API.
 * Quem agrupa por dia de São Paulo é a API; aqui só se escolhe o intervalo.
 */
export type PeriodKey = '7d' | '30d' | '90d' | 'month';

export const PERIOD_OPTIONS: ReadonlyArray<{ value: PeriodKey; label: string }> = [
  { value: '7d', label: '7 dias' },
  { value: '30d', label: '30 dias' },
  { value: '90d', label: '90 dias' },
  { value: 'month', label: 'Este mês' },
];

export const DEFAULT_PERIOD: PeriodKey = '30d';

export interface PeriodRange {
  from: string;
  to: string;
}

const ROLLING_DAYS: Record<Exclude<PeriodKey, 'month'>, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;
// São Paulo está em UTC−3 o ano inteiro (o Brasil não tem horário de verão
// desde 2019). Usado só para achar o dia 1º de "Este mês".
const SAO_PAULO_UTC_OFFSET_HOURS = -3;

function startOfSaoPauloMonth(now: Date): Date {
  const offsetMs = SAO_PAULO_UTC_OFFSET_HOURS * MS_PER_HOUR;
  // Relógio de São Paulo lido pelos campos UTC de uma data deslocada.
  const saoPauloClock = new Date(now.getTime() + offsetMs);
  const monthStartOnClock = Date.UTC(saoPauloClock.getUTCFullYear(), saoPauloClock.getUTCMonth(), 1);
  return new Date(monthStartOnClock - offsetMs);
}

export function computePeriod(period: PeriodKey, now: Date): PeriodRange {
  const from =
    period === 'month'
      ? startOfSaoPauloMonth(now)
      : new Date(now.getTime() - ROLLING_DAYS[period] * MS_PER_DAY);
  return { from: from.toISOString(), to: now.toISOString() };
}
