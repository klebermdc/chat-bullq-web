import { fold } from './quick-reply-match';

/** Nome da aba das mensagens sem categoria. */
export const OTHER_CATEGORY = 'Outras';

export interface CatalogItem {
  id: string;
  shortcut: string;
  title: string;
  content: string;
  category?: string | null;
}

export interface CategoryCount {
  name: string;
  count: number;
}

export function categoryOf(item: CatalogItem): string {
  return item.category?.trim() || OTHER_CATEGORY;
}

/** Categorias em ordem alfabética, "Outras" sempre por último. */
export function listCategories(list: CatalogItem[]): CategoryCount[] {
  const counts = list.reduce<Map<string, number>>((acc, item) => {
    const name = categoryOf(item);
    return new Map(acc).set(name, (acc.get(name) ?? 0) + 1);
  }, new Map());
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => {
      if (a.name === OTHER_CATEGORY) return 1;
      if (b.name === OTHER_CATEGORY) return -1;
      return a.name.localeCompare(b.name, 'pt-BR');
    });
}

/**
 * Busca da janela de mensagens rápidas: sem limite de itens, olha atalho,
 * título e texto (sem acento). Atalhos que começam com a busca vêm antes.
 * `category` nula = todas.
 */
export function searchCatalog<T extends CatalogItem>(list: T[], query: string, category: string | null): T[] {
  const inCategory = category === null ? list : list.filter((item) => categoryOf(item) === category);
  const q = fold(query.trim().replace(/^\/+/, ''));
  if (!q) return inCategory;
  const starts = inCategory.filter((item) => fold(item.shortcut).startsWith(q));
  const rest = inCategory.filter(
    (item) =>
      !starts.includes(item) &&
      [item.shortcut, item.title, item.content].some((field) => fold(field).includes(q)),
  );
  return [...starts, ...rest];
}
