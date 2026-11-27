/**
 * Ordem dos cards dentro de cada coluna do quadro.
 * - `manual`: a ordem do próprio quadro (a do arraste), padrão;
 * - `newest` / `oldest`: pela data em que o card entrou no quadro.
 */
export type CardSortOrder = 'manual' | 'newest' | 'oldest';

export const CARD_SORT_LABEL: Record<CardSortOrder, string> = {
  manual: 'Ordem do quadro',
  newest: 'Mais novo primeiro',
  oldest: 'Mais antigo primeiro',
};

/** Clique no botão: do padrão vai para "mais novo"; depois alterna. */
export function nextCardSort(current: CardSortOrder): CardSortOrder {
  return current === 'newest' ? 'oldest' : 'newest';
}

/** Devolve uma cópia ordenada; nunca mexe no array recebido. */
export function sortCards<T extends { createdAt: string }>(
  cards: readonly T[],
  order: CardSortOrder,
): T[] {
  if (order === 'manual') return [...cards];
  const direction = order === 'newest' ? -1 : 1;
  return [...cards].sort(
    (a, b) => direction * (timeOf(a.createdAt) - timeOf(b.createdAt)),
  );
}

function timeOf(iso: string): number {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? 0 : t;
}
