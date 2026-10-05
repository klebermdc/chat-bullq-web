/**
 * Cores de gráfico. Os valores vivem em globals.css (--chart-*), com um
 * conjunto para o claro e outro para o escuro, validados para daltonismo.
 *
 * - CHART_SERIES: séries categóricas, sempre nesta ordem (a cor segue a
 *   série, nunca a posição depois de um filtro).
 * - CHART_SEQ: um matiz só, para magnitude (sparkline, barra única, calor).
 */
export const CHART_SERIES = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'var(--chart-6)',
] as const;

export const CHART_SEQ = 'var(--chart-seq)';
export const CHART_GRID = 'var(--chart-grid)';
export const CHART_MUTED = 'var(--chart-muted)';

export const chartTooltipStyle = {
  background: 'var(--color-popover)',
  color: 'var(--color-popover-foreground)',
  border: '1px solid var(--color-border)',
  borderRadius: 8,
  fontSize: 12,
  padding: '6px 10px',
  boxShadow: 'var(--shadow-elevated)',
} as const;

export const chartAxisTick = { fontSize: 11, fill: 'var(--chart-axis)' } as const;

/** "2026-09-06" → "06/09". Devolve o valor original se não for data ISO. */
export function formatChartDay(value: unknown): string {
  if (typeof value !== 'string') return '';
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return match ? `${match[3]}/${match[2]}` : value;
}
