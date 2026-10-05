/**
 * Números do Painel em pt-BR: vírgula decimal ("6,4"), ponto de milhar
 * ("12.345"). O backend já manda os valores arredondados; aqui só se escolhe
 * o separador, com teto de uma casa decimal.
 */
const EMPTY_VALUE = '—';
const MAX_FRACTION_DIGITS = 1;

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return EMPTY_VALUE;
  return value.toLocaleString('pt-BR', { maximumFractionDigits: MAX_FRACTION_DIGITS });
}

export function formatPercent(value: number | null | undefined): string {
  const formatted = formatNumber(value);
  return formatted === EMPTY_VALUE ? EMPTY_VALUE : `${formatted}%`;
}
