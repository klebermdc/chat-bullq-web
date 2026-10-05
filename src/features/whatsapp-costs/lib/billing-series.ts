import { CHART_MUTED, CHART_SERIES } from '@/lib/chart-theme';
import type { BillingDay } from '../services/whatsapp-costs.service';

/**
 * Séries do gráfico "Cobráveis e grátis por dia". A ordem e a cor são fixas:
 * cada cor quer dizer sempre a mesma coisa, mesmo quando uma categoria some
 * do período. O que não tem série própria (categoria nova da Meta, template
 * de utilidade grátis, etc.) entra em "Outros"; o detalhe exato fica na
 * tabela "Por categoria".
 */
export type BillingSeriesKey =
  | 'billableMarketing'
  | 'billableUtility'
  | 'billableAuthentication'
  | 'billableService'
  | 'freeService'
  | 'freeReferral'
  | 'other';

export interface BillingSeries {
  key: BillingSeriesKey;
  label: string;
  color: string;
}

export const BILLING_SERIES: ReadonlyArray<BillingSeries> = [
  { key: 'billableMarketing', label: 'Marketing', color: CHART_SERIES[0] },
  { key: 'billableUtility', label: 'Utilidade', color: CHART_SERIES[1] },
  { key: 'billableAuthentication', label: 'Autenticação', color: CHART_SERIES[2] },
  { key: 'billableService', label: 'Atendimento (cobrado)', color: CHART_SERIES[3] },
  { key: 'freeService', label: 'Atendimento (grátis)', color: CHART_SERIES[4] },
  { key: 'freeReferral', label: 'Lead de anúncio (grátis)', color: CHART_SERIES[5] },
  { key: 'other', label: 'Outros', color: CHART_MUTED },
];

const OTHER_KEY: BillingSeriesKey = 'other';

const BILLABLE_SERIES_BY_CATEGORY: Record<string, BillingSeriesKey> = {
  marketing: 'billableMarketing',
  utility: 'billableUtility',
  authentication: 'billableAuthentication',
  service: 'billableService',
};

const FREE_SERIES_BY_CATEGORY: Record<string, BillingSeriesKey> = {
  service: 'freeService',
  referral_conversion: 'freeReferral',
};

export type BillingChartRow = { date: string } & Partial<Record<BillingSeriesKey, number>>;

export interface BillingChart {
  /** Uma linha por dia, com zero nas séries presentes que faltam no dia. */
  rows: BillingChartRow[];
  /** Só as séries com alguma mensagem no período, na ordem fixa. */
  series: BillingSeries[];
  totals: Partial<Record<BillingSeriesKey, number>>;
}

type Counts = Partial<Record<BillingSeriesKey, number>>;

const toCount = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : 0;

function addCounts(
  counts: Counts,
  byCategory: Record<string, number> | undefined,
  seriesByCategory: Record<string, BillingSeriesKey>,
): Counts {
  return Object.entries(byCategory ?? {}).reduce<Counts>((acc, [category, value]) => {
    const key = seriesByCategory[category] ?? OTHER_KEY;
    return { ...acc, [key]: (acc[key] ?? 0) + toCount(value) };
  }, counts);
}

function countDay(day: BillingDay): Counts {
  const billable = addCounts({}, day.billable, BILLABLE_SERIES_BY_CATEGORY);
  return addCounts(billable, day.free, FREE_SERIES_BY_CATEGORY);
}

export function buildBillingChart(daily: ReadonlyArray<BillingDay>): BillingChart {
  const perDay = daily.map((day) => ({ date: day.date, counts: countDay(day) }));

  const sumOf = (key: BillingSeriesKey) =>
    perDay.reduce((sum, { counts }) => sum + (counts[key] ?? 0), 0);

  const series = BILLING_SERIES.filter((s) => sumOf(s.key) > 0);
  const totals = Object.fromEntries(series.map((s) => [s.key, sumOf(s.key)]));
  const rows = perDay.map(({ date, counts }) => ({
    date,
    ...Object.fromEntries(series.map((s) => [s.key, counts[s.key] ?? 0])),
  }));

  return { rows, series, totals };
}

const CATEGORY_LABELS: Record<string, string> = {
  marketing: 'Marketing',
  utility: 'Utilidade',
  authentication: 'Autenticação',
  service: 'Atendimento',
  referral_conversion: 'Lead de anúncio',
};
const OTHER_CATEGORY_LABEL = 'Outros';

/** Categoria de cobrança da Meta em português; o que é desconhecido vira "Outros". */
export function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? OTHER_CATEGORY_LABEL;
}

/** Resumo em texto de um gráfico, para o `aria-label` (leitor de tela). */
export function describeTotals(
  title: string,
  items: ReadonlyArray<{ label: string; value: string }>,
): string {
  if (items.length === 0) return `${title}. Sem dados no período.`;
  const totals = items.map((item) => `${item.label} ${item.value}`).join('; ');
  return `${title}. Totais do período: ${totals}.`;
}
