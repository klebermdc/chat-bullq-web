/** Quantos caracteres cabem numa linha do eixo de categorias (150px, 11px). */
export const CHART_LABEL_MAX_CHARS = 22;

const ELLIPSIS = '…';

/**
 * Rótulo do eixo em uma linha só: o que passa do limite é cortado com
 * reticências. O texto completo continua na dica do gráfico.
 */
export function shortenChartLabel(value: unknown, maxChars: number = CHART_LABEL_MAX_CHARS): string {
  if (value === null || value === undefined) return '';
  const label = String(value);
  if (label.length <= maxChars) return label;
  return `${label.slice(0, maxChars - ELLIPSIS.length).trimEnd()}${ELLIPSIS}`;
}
