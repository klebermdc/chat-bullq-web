import type { FieldDefaults } from '../types';
import { normalizeText, placeholderLabel } from './placeholders';

export interface AgencyDefaultsForm {
  /** Chaves dos campos, na ordem: os sugeridos e depois os extras já salvos. */
  fields: string[];
  /** Valor inicial de cada campo. */
  draft: Record<string, string>;
}

const labelKey = (key: string) => normalizeText(placeholderLabel(key));

/**
 * Monta o formulário "Dados da agência". Casa sugeridos e salvos pelo rótulo
 * (com ou sem colchetes, sem acento), para um mesmo campo não aparecer duas
 * vezes.
 */
export function buildAgencyDefaultsForm(defaults: FieldDefaults): AgencyDefaultsForm {
  const savedByLabel = new Map(Object.entries(defaults.values).map(([key, value]) => [labelKey(key), value]));
  const suggestedLabels = new Set(defaults.suggestedFields.map(labelKey));
  const extras = Object.keys(defaults.values).filter((key) => !suggestedLabels.has(labelKey(key)));
  const fields = [...defaults.suggestedFields, ...extras];
  const draft = Object.fromEntries(fields.map((key) => [key, savedByLabel.get(labelKey(key)) ?? '']));
  return { fields, draft };
}
