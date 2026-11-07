import type { InboxFilterState } from './inbox-filter-types';

export * from './inbox-filter-types';
export { filtersToParams, resolveDateRange } from './inbox-filter-params';
export { filtersFromPreferences, sanitizeFilters } from './inbox-filter-storage';
export {
  countActiveFilters,
  describeActiveFilters,
  idleLabel,
  EMPTY_LOOKUPS,
  type ActiveFilterChip,
  type FilterLookups,
} from './inbox-filter-chips';

const LIST_FIELDS = [
  'channelIds',
  'assignees',
  'statuses',
  'tagIds',
  'excludeTagIds',
  'stageIds',
  'lostReasons',
] as const;

/** Chave estável (listas ordenadas, campos em ordem fixa) para query keys. */
export function filtersKey(state: InboxFilterState): string {
  const sortedLists = Object.fromEntries(
    LIST_FIELDS.map((field) => [field, [...state[field]].sort()]),
  );
  const normalized = { ...state, ...sortedLists };
  const keys = Object.keys(normalized).sort();
  return JSON.stringify(normalized, keys);
}

/** Mesmo filtro, sem ligar para a ordem das listas. */
export function sameFilters(a: InboxFilterState, b: InboxFilterState): boolean {
  return filtersKey(a) === filtersKey(b);
}

/** Liga/desliga um item numa lista, devolvendo uma lista nova. */
export function toggleListItem(list: readonly string[], id: string): string[] {
  return list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
}

export type TagFilterMode = 'none' | 'include' | 'exclude';

export function tagFilterState(state: InboxFilterState, tagId: string): TagFilterMode {
  if (state.tagIds.includes(tagId)) return 'include';
  if (state.excludeTagIds.includes(tagId)) return 'exclude';
  return 'none';
}

/** Gira a etiqueta: nada → incluir → excluir → nada. */
export function cycleTag(state: InboxFilterState, tagId: string): InboxFilterState {
  const mode = tagFilterState(state, tagId);
  const tagIds = mode === 'none' ? [...state.tagIds, tagId] : state.tagIds.filter((id) => id !== tagId);
  const excludeTagIds =
    mode === 'include'
      ? [...state.excludeTagIds, tagId]
      : state.excludeTagIds.filter((id) => id !== tagId);
  const tagMatch = tagIds.length < 2 ? 'any' : state.tagMatch;
  return { ...state, tagIds, excludeTagIds, tagMatch };
}

/**
 * Tira etiquetas que não existem mais (apagadas em outra aba). Devolve o
 * MESMO objeto quando nada mudou, para o chamador saber que não precisa salvar.
 */
export function pruneUnknownTags(
  state: InboxFilterState,
  validIds: ReadonlySet<string>,
): InboxFilterState {
  const tagIds = state.tagIds.filter((id) => validIds.has(id));
  const excludeTagIds = state.excludeTagIds.filter((id) => validIds.has(id));
  const unchanged =
    tagIds.length === state.tagIds.length && excludeTagIds.length === state.excludeTagIds.length;
  if (unchanged) return state;
  return { ...state, tagIds, excludeTagIds, tagMatch: tagIds.length < 2 ? 'any' : state.tagMatch };
}
