import type { DocumentTemplateSummary } from '../types';
import { normalizeText } from './placeholders';

export const NO_CATEGORY_LABEL = 'Sem categoria';

export interface TemplateGroup<T extends DocumentTemplateSummary = DocumentTemplateSummary> {
  category: string;
  templates: T[];
}

const byPtBr = (a: string, b: string) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' });

/**
 * Agrupa por categoria (ordem alfabética, "Sem categoria" por último) e ordena
 * os modelos de cada grupo pelo título. Não altera a lista recebida.
 */
export function groupByCategory<T extends DocumentTemplateSummary>(templates: readonly T[]): TemplateGroup<T>[] {
  const buckets = templates.reduce<Map<string, T[]>>((map, template) => {
    const category = template.category?.trim() || NO_CATEGORY_LABEL;
    return new Map(map).set(category, [...(map.get(category) ?? []), template]);
  }, new Map());

  return Array.from(buckets.entries())
    .map(([category, items]) => ({
      category,
      templates: [...items].sort((a, b) => byPtBr(a.title, b.title)),
    }))
    .sort((a, b) => {
      if (a.category === NO_CATEGORY_LABEL) return 1;
      if (b.category === NO_CATEGORY_LABEL) return -1;
      return byPtBr(a.category, b.category);
    });
}

/** Busca por título ou categoria, sem diferenciar acento nem maiúscula. */
export function filterTemplates<T extends DocumentTemplateSummary>(templates: readonly T[], query: string): T[] {
  const needle = normalizeText(query);
  if (!needle) return [...templates];
  return templates.filter((t) =>
    normalizeText(`${t.title} ${t.category ?? ''}`).includes(needle),
  );
}

/** Categorias já usadas, para sugerir no editor. */
export function listCategories(templates: readonly DocumentTemplateSummary[]): string[] {
  const names = templates.map((t) => t.category?.trim()).filter((c): c is string => !!c);
  return Array.from(new Set(names)).sort(byPtBr);
}
