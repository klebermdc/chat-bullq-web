import type { FieldGroups } from '../types';

/**
 * Divide os campos do modelo nas seções do formulário: Cliente, Venda,
 * Agência e, por último, os automáticos (datas). A ordem dentro de cada seção
 * é a do modelo. Sem grupos da API, uma lista só, como antes.
 */

export type FieldSectionId = keyof FieldGroups | 'other' | 'all';

export interface FieldSection {
  id: FieldSectionId;
  /** Nulo na lista única (sem cabeçalho). */
  title: string | null;
  fields: string[];
}

const SECTION_ORDER: readonly { id: keyof FieldGroups | 'other'; title: string }[] = [
  { id: 'client', title: 'Cliente' },
  { id: 'seller', title: 'Venda' },
  { id: 'agency', title: 'Agência' },
  { id: 'other', title: 'Outros campos' },
  { id: 'auto', title: 'Automáticos' },
];

function sectionOf(placeholder: string, groups: FieldGroups): keyof FieldGroups | 'other' {
  if (groups.client.includes(placeholder)) return 'client';
  if (groups.seller.includes(placeholder)) return 'seller';
  if (groups.agency.includes(placeholder)) return 'agency';
  if (groups.auto.includes(placeholder)) return 'auto';
  return 'other';
}

export function groupFields(placeholders: readonly string[], groups: FieldGroups | null): FieldSection[] {
  if (!groups) return placeholders.length ? [{ id: 'all', title: null, fields: [...placeholders] }] : [];
  return SECTION_ORDER.map(({ id, title }) => ({
    id,
    title,
    fields: placeholders.filter((p) => sectionOf(p, groups) === id),
  })).filter((section) => section.fields.length > 0);
}
