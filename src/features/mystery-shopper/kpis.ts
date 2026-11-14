import type { CriticalReason, SellerTrend } from './api';

/** Abaixo disso o critério está em falta grave (escala 0–2). */
export const HEAT_URGENT_BELOW = 0.75;
/** Abaixo disso o critério precisa de atenção (escala 0–2). */
export const HEAT_WARNING_BELOW = 1.5;
/** Nota mínima (0–100) para a visita contar como aprovada. */
export const APPROVED_MIN_SCORE = 70;

const MONTH_RE = /^(\d{4})-(\d{2})$/;
const NO_DATA = '—';

const pad = (n: number) => String(n).padStart(2, '0');

/** Mês corrente no fuso local, no formato YYYY-MM. */
export function currentMonth(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
}

function parseMonth(month: string): { year: number; month: number } {
  const match = MONTH_RE.exec(month);
  if (!match) throw new Error(`Mês inválido: ${month}`);
  return { year: Number(match[1]), month: Number(match[2]) };
}

/** Soma (ou subtrai) meses de um YYYY-MM. */
export function shiftMonth(month: string, delta: number): string {
  const parsed = parseMonth(month);
  const index = parsed.year * 12 + (parsed.month - 1) + delta;
  return `${Math.floor(index / 12)}-${pad((index % 12) + 1)}`;
}

/** "novembro de 2026". */
export function monthLabel(month: string): string {
  const parsed = parseMonth(month);
  const date = new Date(Date.UTC(parsed.year, parsed.month - 1, 1));
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date);
}

/** Só avança até o mês corrente: futuro não tem visita. */
export function canGoNext(month: string, now: Date = new Date()): boolean {
  return month < currentMonth(now);
}

export type HeatLevel = 'urgent' | 'warning' | 'success' | 'none';

export function heatLevel(average: number | null): HeatLevel {
  if (average === null) return 'none';
  if (average < HEAT_URGENT_BELOW) return 'urgent';
  if (average < HEAT_WARNING_BELOW) return 'warning';
  return 'success';
}

const HEAT_CLASS: Record<HeatLevel, string> = {
  urgent: 'bg-urgent-wash text-urgent-ink',
  warning: 'bg-warning-wash text-warning-ink',
  success: 'bg-success-wash text-success-ink',
  none: 'text-muted-foreground',
};

/** Classe de mapa de calor para a média de um critério (0–2). */
export function heatClass(average: number | null): string {
  return HEAT_CLASS[heatLevel(average)];
}

const TREND_SYMBOL: Record<SellerTrend, string> = { UP: '▲', DOWN: '▼', SAME: '=' };
const TREND_LABEL: Record<SellerTrend, string> = {
  UP: 'subiu em relação ao mês anterior',
  DOWN: 'caiu em relação ao mês anterior',
  SAME: 'igual ao mês anterior',
};
const TREND_CLASS: Record<SellerTrend, string> = {
  UP: 'text-success-ink',
  DOWN: 'text-urgent-ink',
  SAME: 'text-muted-foreground',
};

export function trendView(trend: SellerTrend | null): { symbol: string; label: string; className: string } | null {
  if (!trend) return null;
  return { symbol: TREND_SYMBOL[trend], label: TREND_LABEL[trend], className: TREND_CLASS[trend] };
}

/** Diferença da nota média contra o mês anterior: "▲ 5 vs mês anterior". */
export function scoreDelta(current: number | null, previous: number | null): string | null {
  if (current === null || previous === null) return null;
  const diff = Math.round(current - previous);
  if (diff === 0) return '= mês anterior';
  return `${diff > 0 ? '▲' : '▼'} ${Math.abs(diff)} vs mês anterior`;
}

export function formatPct(value: number | null): string {
  return value === null ? NO_DATA : `${value}%`;
}

export function formatMinutes(value: number | null): string {
  return value === null ? NO_DATA : `${Math.round(value)} min`;
}

export function formatScore(value: number | null): string {
  return value === null ? NO_DATA : String(Math.round(value));
}

/** Média de critério (0–2) com uma casa, em vírgula decimal. */
export function formatAverage(value: number | null): string {
  return value === null ? NO_DATA : value.toFixed(1).replace('.', ',');
}

export const CRITICAL_REASON_LABEL: Record<CriticalReason, string> = {
  NO_REPLY: 'Não respondeu',
  WRONG_INFO: 'Informação errada',
};
