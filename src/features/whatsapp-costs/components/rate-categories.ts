/** Categorias que têm tarifa na tabela da organização, na ordem em que aparecem. */
export const RATE_CATEGORIES = [
  { key: 'marketing', label: 'Marketing' },
  { key: 'utility', label: 'Utilidade' },
  { key: 'authentication', label: 'Autenticação' },
  { key: 'service', label: 'Atendimento' },
] as const;

export type RateCategory = (typeof RATE_CATEGORIES)[number]['key'];
