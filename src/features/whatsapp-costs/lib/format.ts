/**
 * Formatação da tela de custos. Cada conta do WhatsApp cobra na sua moeda,
 * então o valor sempre vem com o código da moeda do canal. O preço por
 * mensagem fica abaixo de um centavo: o total sai com duas casas e o preço
 * unitário com até quatro.
 */
const LOCALE = 'pt-BR';
const EMPTY_VALUE = '—';
const DEFAULT_CURRENCY = 'BRL';
const TOTAL_FRACTION_DIGITS = 2;
const UNIT_PRICE_MAX_FRACTION_DIGITS = 4;
const AVERAGE_MAX_FRACTION_DIGITS = 1;

type MaybeNumber = number | null | undefined;

const isNumber = (value: MaybeNumber): value is number =>
  typeof value === 'number' && Number.isFinite(value);

function currencyFormatter(currency: string | null | undefined, maximumFractionDigits: number) {
  const options = {
    style: 'currency' as const,
    minimumFractionDigits: TOTAL_FRACTION_DIGITS,
    maximumFractionDigits,
  };
  try {
    return new Intl.NumberFormat(LOCALE, { ...options, currency: currency || DEFAULT_CURRENCY });
  } catch {
    // Código de moeda que o Intl não conhece: mostra em real para não quebrar a tela.
    return new Intl.NumberFormat(LOCALE, { ...options, currency: DEFAULT_CURRENCY });
  }
}

/** Total em dinheiro, sempre com duas casas: "R$ 1.234,57". */
export function formatCost(value: MaybeNumber, currency: string | null | undefined): string {
  if (!isNumber(value)) return EMPTY_VALUE;
  return currencyFormatter(currency, TOTAL_FRACTION_DIGITS).format(value);
}

/** Preço por mensagem, de duas a quatro casas: "US$ 0,0068". */
export function formatUnitPrice(value: MaybeNumber, currency: string | null | undefined): string {
  if (!isNumber(value)) return EMPTY_VALUE;
  return currencyFormatter(currency, UNIT_PRICE_MAX_FRACTION_DIGITS).format(value);
}

/** Valor do eixo do gráfico, sem símbolo: 1234.5 → "1.234,5". */
export function formatAxisMoney(value: number): string {
  return value.toLocaleString(LOCALE, { maximumFractionDigits: TOTAL_FRACTION_DIGITS });
}

/** Contagem com ponto de milhar: 12345 → "12.345". */
export function formatCount(value: MaybeNumber): string {
  if (!isNumber(value)) return EMPTY_VALUE;
  return value.toLocaleString(LOCALE, { maximumFractionDigits: 0 });
}

/** Média ou mediana com até uma casa: 4.5 → "4,5"; 4 → "4". */
export function formatAverage(value: MaybeNumber): string {
  if (!isNumber(value)) return EMPTY_VALUE;
  return value.toLocaleString(LOCALE, { maximumFractionDigits: AVERAGE_MAX_FRACTION_DIGITS });
}

const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** "2026-11-01" → "01/11/2026", lido direto da string (o dia já é do fuso da organização). */
export function formatDayFull(value: string): string {
  const match = ISO_DAY.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

/** "01/11/2026 a 13/11/2026"; um dia só quando início e fim coincidem. */
export function formatRange(from: string, to: string): string {
  return from === to ? formatDayFull(from) : `${formatDayFull(from)} a ${formatDayFull(to)}`;
}
