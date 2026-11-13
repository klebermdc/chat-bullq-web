import { createElement } from 'react';
import { CHART_GRID, chartAxisTick, chartTooltipStyle, formatChartDay } from '@/lib/chart-theme';

/**
 * Props comuns aos gráficos da tela, para espalhar nos componentes do
 * Recharts (`<XAxis {...dayAxisProps} />`): mesma grade, eixos e dica.
 */
export const gridProps = { strokeDasharray: '3 3', stroke: CHART_GRID, vertical: false } as const;

export const dayAxisProps = {
  dataKey: 'date',
  tick: chartAxisTick,
  tickFormatter: formatChartDay,
  minTickGap: 16,
} as const;

export const tooltipBaseProps = {
  contentStyle: chartTooltipStyle,
  labelFormatter: formatChartDay,
} as const;

export const barCursor = { fill: 'var(--color-muted)', opacity: 0.6 } as const;

/** Legenda em cor de texto: o quadradinho carrega a cor da série, o nome não. */
export const legendProps = {
  wrapperStyle: { fontSize: 11 },
  iconSize: 8,
  formatter: (value: string) =>
    createElement('span', { style: { color: 'var(--color-muted-foreground)' } }, value),
} as const;

export const MAX_BAR_SIZE = 32;
export const VALUE_AXIS_WIDTH = 48;
