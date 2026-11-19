import type { OperatorRate } from '../service';

/** 6.04 → "6,04" (duas casas, como as operadoras mostram). */
export function formatRate(value: number): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Texto do balão ao passar o mouse. */
export function rateTitle(rate: OperatorRate): string {
  if (rate.manual && rate.value === null) return `${rate.name}: ainda não lançado hoje`;
  if (rate.value === null) return `${rate.name}: ainda sem leitura`;
  const parts = [`${rate.name}: R$ ${formatRate(rate.value)} = US$ 1`];
  if (rate.sourceUpdatedLabel) parts.push(`atualizado pela operadora em ${rate.sourceUpdatedLabel}`);
  if (rate.manual) parts.push(manualLabel(rate));
  if (rate.stale) parts.push('não foi possível conferir nas últimas horas');
  return parts.join(' · ');
}

const MIN_RATE = 1;
const MAX_RATE = 20;

/** "5,88" ou "5.88" → 5.88; null se não for um câmbio plausível. */
export function parseRateInput(raw: string): number | null {
  const n = Number(raw.trim().replace(',', '.'));
  if (raw.trim() === '' || !Number.isFinite(n) || n < MIN_RATE || n > MAX_RATE) return null;
  return Math.round(n * 10_000) / 10_000;
}

/** "lançado por Kleber às 10:32" (ou com a data, se não for hoje). */
export function manualLabel(rate: OperatorRate, now: Date = new Date()): string {
  if (!rate.changedAt) return 'ainda não lançado';
  const at = new Date(rate.changedAt);
  const sameDay = at.toDateString() === now.toDateString();
  const when = sameDay
    ? `às ${at.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
    : `em ${at.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`;
  return rate.updatedByName ? `lançado por ${rate.updatedByName} ${when}` : `lançado ${when}`;
}
