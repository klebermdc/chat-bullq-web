// Valores de negócio no funil. O carrinho pode vir em USD, então cada card
// tem a própria moeda; e o operador digita no formato brasileiro ("4.500,00"),
// que o parseFloat antigo lia como 4,5.

const DEFAULT_CURRENCY = 'BRL';
const THOUSANDS_ONLY = /^\d{1,3}(\.\d{3})+$/;

export function parseMoneyBR(input: string): number | null {
  const cleaned = input.replace(/[^\d.,-]/g, '');
  if (!/\d/.test(cleaned)) return null;

  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');
  let normalized: string;
  if (lastComma >= 0 && lastDot >= 0) {
    // O separador que vem por último é o decimal.
    normalized =
      lastComma > lastDot
        ? cleaned.replace(/\./g, '').replace(',', '.')
        : cleaned.replace(/,/g, '');
  } else if (lastComma >= 0) {
    normalized = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (THOUSANDS_ONLY.test(cleaned)) {
    normalized = cleaned.replace(/\./g, '');
  } else {
    normalized = cleaned;
  }
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

function toNumber(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'string' ? Number(v) : v;
  return Number.isFinite(n) ? n : null;
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

export function formatMoney(
  value: number | string | null | undefined,
  currency: string | null | undefined,
): string | null {
  const n = toNumber(value);
  if (n === null) return null;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: safeCurrency(currency),
    maximumFractionDigits: 0,
  }).format(n);
}

interface MoneyItem {
  value: number | string | null | undefined;
  currency?: string | null;
}

/** Total por moeda ("R$ 12.000 · US$ 3.000"), sem misturar moedas. */
export function sumByCurrency(items: MoneyItem[]): string | null {
  const totals = new Map<string, number>();
  for (const item of items) {
    const n = toNumber(item.value);
    if (n === null || n === 0) continue;
    const cur = safeCurrency(item.currency);
    totals.set(cur, (totals.get(cur) ?? 0) + n);
  }
  if (totals.size === 0) return null;
  return [...totals.entries()].map(([cur, total]) => formatMoney(total, cur)).join(' · ');
}
