/**
 * Período da tela → `{ from, to }` em dias 'YYYY-MM-DD' (os dois inclusive),
 * contados no fuso da organização. A API agrupa por dia nesse mesmo fuso.
 */
export type PeriodKey = 'month' | 'lastMonth' | '7d' | '30d';

/** `shortLabel` é o que cabe no celular, com os quatro botões lado a lado. */
export const PERIOD_OPTIONS: ReadonlyArray<{ value: PeriodKey; label: string; shortLabel: string }> = [
  { value: 'month', label: 'Este mês', shortLabel: 'Este mês' },
  { value: 'lastMonth', label: 'Mês passado', shortLabel: 'Mês passado' },
  { value: '7d', label: 'Últimos 7 dias', shortLabel: '7 dias' },
  { value: '30d', label: 'Últimos 30 dias', shortLabel: '30 dias' },
];

export const DEFAULT_PERIOD: PeriodKey = 'month';

/**
 * A API devolve o fuso da organização só junto com os dados; para montar a
 * primeira consulta usamos o de São Paulo, que é o das contas atuais.
 */
export const DEFAULT_TIME_ZONE = 'America/Sao_Paulo';

export interface PeriodRange {
  from: string;
  to: string;
}

const ROLLING_DAYS: Record<'7d' | '30d', number> = { '7d': 7, '30d': 30 };
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Dia de hoje ('YYYY-MM-DD') no fuso informado. */
export function todayIn(timeZone: string, now: Date): string {
  // en-CA formata como YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

function parseDay(day: string): { year: number; month: number; date: number } {
  const match = ISO_DAY.exec(day);
  if (!match) throw new Error(`Dia inválido: ${day}`);
  return { year: Number(match[1]), month: Number(match[2]), date: Number(match[3]) };
}

const toIsoDay = (utcMs: number): string => new Date(utcMs).toISOString().slice(0, 10);

function addDays(day: string, amount: number): string {
  const { year, month, date } = parseDay(day);
  return toIsoDay(Date.UTC(year, month - 1, date) + amount * MS_PER_DAY);
}

/** Quantos dias tem o mês do dia informado. */
export function daysInMonth(day: string): number {
  const { year, month } = parseDay(day);
  // Dia 0 do mês seguinte é o último deste.
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function firstOfMonth(day: string): string {
  const { year, month } = parseDay(day);
  return toIsoDay(Date.UTC(year, month - 1, 1));
}

/** Intervalo do período a partir do dia de hoje (já no fuso da organização). */
export function computePeriod(period: PeriodKey, today: string): PeriodRange {
  if (period === 'month') return { from: firstOfMonth(today), to: today };
  if (period === 'lastMonth') {
    const lastDayOfPreviousMonth = addDays(firstOfMonth(today), -1);
    return { from: firstOfMonth(lastDayOfPreviousMonth), to: lastDayOfPreviousMonth };
  }
  return { from: addDays(today, -(ROLLING_DAYS[period] - 1)), to: today };
}
