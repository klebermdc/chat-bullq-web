import { CHART_MUTED, CHART_SERIES } from '@/lib/chart-theme';
import type { CostDay } from '../services/whatsapp-costs.service';

/**
 * Séries do gráfico por dia. Ordem e cor fixas: cada cor quer dizer sempre a
 * mesma categoria, mesmo quando uma some do período. Categoria nova da Meta
 * entra em "Outros". Grátis aparece só na visão de mensagens, em tom apagado:
 * o que custa dinheiro é que precisa saltar aos olhos.
 */
export type ChartMode = 'cost' | 'volume';
export type SeriesKey = 'SERVICE' | 'MARKETING' | 'UTILITY' | 'AUTHENTICATION' | 'OTHER' | 'FREE';

export interface ChartSeries {
  key: SeriesKey;
  label: string;
  color: string;
}

const FREE_COLOR = 'color-mix(in oklab, var(--chart-seq) 28%, var(--color-card))';

export const CHART_SERIES_DEFS: ReadonlyArray<ChartSeries> = [
  { key: 'SERVICE', label: 'Respostas 24h', color: CHART_SERIES[0] },
  { key: 'MARKETING', label: 'Marketing', color: CHART_SERIES[1] },
  { key: 'UTILITY', label: 'Utilidade', color: CHART_SERIES[2] },
  { key: 'AUTHENTICATION', label: 'Autenticação', color: CHART_SERIES[3] },
  { key: 'OTHER', label: 'Outros', color: CHART_MUTED },
  { key: 'FREE', label: 'Grátis', color: FREE_COLOR },
];

const KNOWN_CATEGORIES = new Set<SeriesKey>(['SERVICE', 'MARKETING', 'UTILITY', 'AUTHENTICATION']);

export type ChartRow = { date: string } & Partial<Record<SeriesKey, number>>;

export interface DailyChart {
  rows: ChartRow[];
  /** Só as séries com valor no período, na ordem fixa. */
  series: ChartSeries[];
}

type Values = Partial<Record<SeriesKey, number>>;

const toNumber = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : 0;

function seriesKeyOf(category: string): SeriesKey {
  const upper = category.toUpperCase() as SeriesKey;
  return KNOWN_CATEGORIES.has(upper) ? upper : 'OTHER';
}

function valuesOfDay(day: CostDay, mode: ChartMode): Values {
  const charged = Object.entries(day.byCategory ?? {}).reduce<Values>((acc, [category, item]) => {
    const key = seriesKeyOf(category);
    const value = toNumber(mode === 'cost' ? item?.cost : item?.volume);
    return { ...acc, [key]: (acc[key] ?? 0) + value };
  }, {});
  return mode === 'volume' ? { ...charged, FREE: toNumber(day.free) } : charged;
}

export function buildDailyChart(daily: ReadonlyArray<CostDay>, mode: ChartMode): DailyChart {
  const perDay = daily.map((day) => ({ date: day.date, values: valuesOfDay(day, mode) }));
  const sumOf = (key: SeriesKey) => perDay.reduce((sum, { values }) => sum + (values[key] ?? 0), 0);

  const series = CHART_SERIES_DEFS.filter((s) => sumOf(s.key) > 0);
  const rows = perDay.map(({ date, values }) => ({
    date,
    ...Object.fromEntries(series.map((s) => [s.key, values[s.key] ?? 0])),
  }));
  return { rows, series };
}

/** Resumo em texto do gráfico, para o `aria-label` (o SVG não diz nada sozinho). */
export function describeChart(
  title: string,
  items: ReadonlyArray<{ label: string; value: string }>,
): string {
  if (items.length === 0) return `${title}. Sem dados no período.`;
  const totals = items.map((item) => `${item.label} ${item.value}`).join('; ');
  return `${title}. Totais do período: ${totals}.`;
}

/** Soma de uma série no período (para o resumo acessível). */
export function seriesTotal(rows: ReadonlyArray<ChartRow>, key: SeriesKey): number {
  return rows.reduce((sum, row) => sum + (row[key] ?? 0), 0);
}
