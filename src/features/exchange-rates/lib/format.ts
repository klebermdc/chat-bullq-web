import type { OperatorRate } from '../service';

/** 6.04 → "6,04" (duas casas, como as operadoras mostram). */
export function formatRate(value: number): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Texto do balão ao passar o mouse. */
export function rateTitle(rate: OperatorRate): string {
  if (rate.manual) return `${rate.name}: consultar no site`;
  if (rate.value === null) return `${rate.name}: ainda sem leitura`;
  const parts = [`${rate.name}: R$ ${formatRate(rate.value)} = US$ 1`];
  if (rate.sourceUpdatedLabel) parts.push(`atualizado pela operadora em ${rate.sourceUpdatedLabel}`);
  if (rate.stale) parts.push('não foi possível conferir nas últimas horas');
  return parts.join(' · ');
}
