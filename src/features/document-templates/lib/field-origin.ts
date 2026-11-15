import type { FieldOrigin, FieldSource, PlaceholderValues } from '../types';

/**
 * De onde veio o valor de cada campo do preenchimento, para o selo ao lado do
 * rótulo. Camadas, da mais fraca para a mais forte: data do dia, sugestão da
 * API, IA e o que o atendente digitou. Campo mexido pelo atendente não tem
 * selo: o valor passou a ser dele.
 */

export const ORIGIN_LABEL: Record<FieldOrigin, string> = {
  default: 'padrão da agência',
  agency: 'padrão da agência',
  contact: 'do contato',
  saved: 'salvo no contato',
  date: 'automático',
  ai: 'IA — confira',
};

export interface FillLayers {
  dateValues: PlaceholderValues;
  autofillValues: PlaceholderValues;
  autofillSources: Record<string, FieldSource>;
  aiValues: PlaceholderValues;
  typedValues: PlaceholderValues;
}

const hasText = (value: string | undefined): value is string => !!value && value.trim().length > 0;

/** Valor final de cada campo: cada camada por cima da anterior. */
export function mergeLayers(layers: FillLayers): PlaceholderValues {
  return { ...layers.dateValues, ...layers.autofillValues, ...layers.aiValues, ...layers.typedValues };
}

/** Origem do valor atual de um campo; nulo = digitado, vazio ou desconhecida. */
export function fieldOrigin(placeholder: string, layers: FillLayers): FieldOrigin | null {
  if (placeholder in layers.typedValues) return null;
  if (hasText(layers.aiValues[placeholder])) return 'ai';
  if (hasText(layers.autofillValues[placeholder])) {
    return layers.autofillSources[placeholder] ?? null;
  }
  if (hasText(layers.dateValues[placeholder])) return 'date';
  return null;
}

/** Origem de todos os campos do modelo que têm selo. */
export function fieldOrigins(placeholders: readonly string[], layers: FillLayers): Record<string, FieldOrigin> {
  return placeholders.reduce<Record<string, FieldOrigin>>((acc, placeholder) => {
    const origin = fieldOrigin(placeholder, layers);
    return origin ? { ...acc, [placeholder]: origin } : acc;
  }, {});
}

/**
 * O que a IA devolveu, restrito aos campos do modelo que ainda estão vazios:
 * nunca sobrescreve o que o atendente digitou nem o que já veio sugerido.
 */
export function pickAiValues(
  placeholders: readonly string[],
  current: PlaceholderValues,
  aiValues: PlaceholderValues,
): PlaceholderValues {
  return placeholders.reduce<PlaceholderValues>((acc, placeholder) => {
    const suggestion = aiValues[placeholder];
    if (!hasText(suggestion) || hasText(current[placeholder])) return acc;
    return { ...acc, [placeholder]: suggestion.trim() };
  }, {});
}
