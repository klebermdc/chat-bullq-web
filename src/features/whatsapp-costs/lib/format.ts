/**
 * Formatação da tela de custos do WhatsApp. `formatMoney` de `lib/money`
 * arredonda para a unidade inteira (serve para valor de negócio no funil); a
 * tarifa da Meta por mensagem fica abaixo de um centavo, então aqui o total
 * sai com duas casas e a tarifa com até quatro.
 */
const LOCALE = 'pt-BR';
const EMPTY_VALUE = '—';
const DEFAULT_CURRENCY = 'BRL';
const TOTAL_FRACTION_DIGITS = 2;
const RATE_MAX_FRACTION_DIGITS = 4;
const PERCENT_FRACTION_DIGITS = 1;

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
    // Código de moeda inválido vindo da tabela de tarifas.
    return new Intl.NumberFormat(LOCALE, { ...options, currency: DEFAULT_CURRENCY });
  }
}

/** Total em dinheiro, sempre com duas casas: "R$ 1.234,57". */
export function formatCost(value: MaybeNumber, currency: string | null | undefined): string {
  if (!isNumber(value)) return EMPTY_VALUE;
  return currencyFormatter(currency, TOTAL_FRACTION_DIGITS).format(value);
}

/** Tarifa por mensagem, de duas a quatro casas: "US$ 0,0068". */
export function formatRate(value: MaybeNumber, currency: string | null | undefined): string {
  if (!isNumber(value)) return EMPTY_VALUE;
  return currencyFormatter(currency, RATE_MAX_FRACTION_DIGITS).format(value);
}

/** Fração 0..1 como percentual com uma casa: 0.973 → "97,3%". */
export function formatRatioPercent(ratio: MaybeNumber): string {
  if (!isNumber(ratio)) return EMPTY_VALUE;
  const percent = (ratio * 100).toLocaleString(LOCALE, {
    minimumFractionDigits: PERCENT_FRACTION_DIGITS,
    maximumFractionDigits: PERCENT_FRACTION_DIGITS,
  });
  return `${percent}%`;
}

/** Fração da parte no total; zero quando o total é zero. */
export function shareOf(part: number, total: number): number {
  return total > 0 ? part / total : 0;
}

/** Contagem com ponto de milhar: 12345 → "12.345". */
export function formatCount(value: MaybeNumber): string {
  if (!isNumber(value)) return EMPTY_VALUE;
  return value.toLocaleString(LOCALE, { maximumFractionDigits: 0 });
}

const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})/;

/** "2026-10-01" → "01/10/2026", lido direto da string (o dia é de São Paulo). */
export function formatDayFull(value: string): string {
  const match = ISO_DAY.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

const RATE_INPUT = /^\d+(?:[.,]\d+)?$/;

/**
 * Lê a tarifa digitada: vírgula ou ponto como decimal, sem separador de
 * milhar (tarifa nunca chega a mil, e "0.123" não pode virar 123). Vazio é
 * zero, que é como a API guarda categoria sem tarifa. Devolve null no que não
 * é um valor válido.
 */
export function parseRateInput(input: string): number | null {
  const trimmed = input.trim();
  if (trimmed === '') return 0;
  if (!RATE_INPUT.test(trimmed)) return null;
  const parsed = Number(trimmed.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}
