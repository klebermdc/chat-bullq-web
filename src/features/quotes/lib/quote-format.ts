/**
 * Formatadores da cotação (pt-BR). A página é renderizada no servidor, que
 * roda em UTC: todo instante é convertido para o horário de Brasília de
 * propósito, e as datas de calendário ('YYYY-MM-DD') nunca passam por fuso.
 */

const TIME_ZONE = 'America/Sao_Paulo';
const DEFAULT_CURRENCY = 'BRL';
const DAY_MS = 86_400_000;
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const MONTHS_LONG = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

interface CalendarDay {
  year: number;
  month: number; // 0-11
  day: number;
  weekday: number; // 0 = domingo
  /** Dias desde a época — para contar intervalos sem fuso. */
  serial: number;
}

export function parseCalendarDay(iso: string | null | undefined): CalendarDay | null {
  const m = iso ? DATE_ONLY.exec(iso) : null;
  if (!m) return null;
  const utc = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const date = new Date(utc);
  if (date.getUTCDate() !== Number(m[3])) return null; // 31/02 e afins
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth(),
    day: date.getUTCDate(),
    weekday: date.getUTCDay(),
    serial: Math.round(utc / DAY_MS),
  };
}

function safeCurrency(currency: string | null | undefined): string {
  if (!currency) return DEFAULT_CURRENCY;
  try {
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency });
    return currency;
  } catch {
    return DEFAULT_CURRENCY;
  }
}

/** "R$ 17.971,62" — com centavos: é cotação, o cliente confere o valor exato. */
export function formatQuoteMoney(value: number | null | undefined, currency: string): string | null {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: safeCurrency(currency),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function resolveRange(start: string | null, end: string | null) {
  const from = parseCalendarDay(start);
  if (!from) return null;
  const parsedEnd = parseCalendarDay(end);
  const to = parsedEnd && parsedEnd.serial >= from.serial ? parsedEnd : from;
  return { from, to };
}

const lower = (s: string) => s.toLowerCase();

/** "Sex, 1 jan" · "Ter e qua, 5 e 6 jan" · "Sáb a seg, 2 a 4 jan" · "30 dez a 2 jan". */
export function formatDayShort(start: string | null, end: string | null): string | null {
  const range = resolveRange(start, end);
  if (!range) return null;
  const { from, to } = range;
  const fromWd = WEEKDAYS[from.weekday];
  if (from.serial === to.serial) return `${fromWd}, ${from.day} ${MONTHS_SHORT[from.month]}`;
  if (from.month !== to.month || from.year !== to.year) {
    return `${from.day} ${MONTHS_SHORT[from.month]} a ${to.day} ${MONTHS_SHORT[to.month]}`;
  }
  const joiner = to.serial - from.serial === 1 ? 'e' : 'a';
  return `${fromWd} ${joiner} ${lower(WEEKDAYS[to.weekday])}, ${from.day} ${joiner} ${to.day} ${MONTHS_SHORT[to.month]}`;
}

/** Como `formatDayShort`, sem o dia da semana: "1 a 6 jan". Para espaços curtos. */
export function formatDayCompact(start: string | null, end: string | null): string | null {
  return formatDayShort(start, end)?.replace(/^[^,]+, /, '') ?? null;
}

/** "Sex, 1 de janeiro de 2027" e variações de intervalo — o chip do bilhete. */
export function formatDayLong(start: string | null, end: string | null): string | null {
  const range = resolveRange(start, end);
  if (!range) return null;
  const { from, to } = range;
  const tail = `de ${MONTHS_LONG[to.month]} de ${to.year}`;
  if (from.serial === to.serial) return `${WEEKDAYS[from.weekday]}, ${from.day} ${tail}`;
  if (from.year !== to.year) {
    return `${from.day} de ${MONTHS_LONG[from.month]} de ${from.year} a ${to.day} ${tail}`;
  }
  if (from.month !== to.month) return `${from.day} de ${MONTHS_LONG[from.month]} a ${to.day} ${tail}`;
  if (to.serial - from.serial === 1) {
    return `${WEEKDAYS[from.weekday]} e ${lower(WEEKDAYS[to.weekday])}, ${from.day} e ${to.day} ${tail}`;
  }
  return `${from.day} a ${to.day} ${tail}`;
}

/** Partes de um instante no horário de Brasília. */
function zonedParts(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour'), minute: get('minute') };
}

/** "28/10, às 18h" · "28/10, às 18h30" · com ano: "28/10/2026, às 18h". */
export function formatValidUntil(iso: string, opts: { withYear?: boolean } = {}): string | null {
  const p = zonedParts(iso);
  if (!p) return null;
  const date = opts.withYear ? `${p.day}/${p.month}/${p.year}` : `${p.day}/${p.month}`;
  const minutes = p.minute === '00' ? '' : p.minute;
  return `${date}, às ${Number(p.hour)}h${minutes}`;
}

/** Nº da cotação como o cliente vê: 152 → "0152". */
export function formatQuoteNumber(n: number): string {
  return String(n).padStart(4, '0');
}

/** "28/10 14:32" em Brasília. */
export function formatDateTimeShort(iso: string): string | null {
  const p = zonedParts(iso);
  return p ? `${p.day}/${p.month} ${p.hour}:${p.minute}` : null;
}

/** "26/10/2026" em Brasília. */
export function formatDateBR(iso: string): string | null {
  const p = zonedParts(iso);
  return p ? `${p.day}/${p.month}/${p.year}` : null;
}

/** Dias de calendário de hoje (em Brasília) até a data. Hoje = 0. */
export function daysUntil(dateOnly: string, now: Date): number | null {
  const target = parseCalendarDay(dateOnly);
  const p = zonedParts(now.toISOString());
  if (!target || !p) return null;
  const today = parseCalendarDay(`${p.year}-${p.month}-${p.day}`);
  return today ? target.serial - today.serial : null;
}

export function firstName(name: string | null | undefined): string | null {
  const first = name?.trim().split(/\s+/)[0];
  if (!first) return null;
  return first.charAt(0).toLocaleUpperCase('pt-BR') + first.slice(1);
}

export function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** "3 adultos e 1 criança"; null quando não há ninguém. */
export function formatPeople(adults: number, children: number): string | null {
  const parts = [
    adults > 0 ? plural(adults, 'adulto', 'adultos') : null,
    children > 0 ? plural(children, 'criança', 'crianças') : null,
  ].filter((p): p is string => p !== null);
  return parts.length > 0 ? parts.join(' e ') : null;
}
