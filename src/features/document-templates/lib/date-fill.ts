import type { PlaceholderValues } from '../types';
import { normalizeText, placeholderLabel } from './placeholders';

/**
 * Sem conversa não há autopreenchimento da API, mas a data do dia dá para
 * resolver aqui: "[Dia]" → "15", "[Mês]" → "novembro", "[Ano]" → "2026" e
 * "[Data]" → "15/11/2026". Só rótulos exatos, para não chutar "[Data da viagem]".
 */
type DateFormatter = (date: Date) => string;

const pad2 = (n: number) => String(n).padStart(2, '0');

const monthName: DateFormatter = (date) =>
  new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(date);

const fullDate: DateFormatter = (date) =>
  `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()}`;

const DATE_LABELS: Record<string, DateFormatter> = {
  dia: (date) => pad2(date.getDate()),
  mes: monthName,
  ano: (date) => String(date.getFullYear()),
  data: fullDate,
  'data atual': fullDate,
  'data de hoje': fullDate,
  'data do contrato': fullDate,
};

export function isDatePlaceholder(placeholder: string): boolean {
  return normalizeText(placeholderLabel(placeholder)) in DATE_LABELS;
}

/** Valores de data para os placeholders reconhecidos; os demais ficam de fora. */
export function dateFillValues(placeholders: readonly string[], date: Date = new Date()): PlaceholderValues {
  return placeholders.reduce<PlaceholderValues>((acc, placeholder) => {
    const format = DATE_LABELS[normalizeText(placeholderLabel(placeholder))];
    return format ? { ...acc, [placeholder]: format(date) } : acc;
  }, {});
}
