import {
  countActiveFilters,
  sameFilters,
  sanitizeFilters,
  type InboxFilterState,
} from './inbox-filters';

/** Atalho de filtro salvo pelo usuário (preferences.inbox.shortcuts). */
export interface FilterShortcut {
  readonly id: string;
  readonly name: string;
  readonly filters: InboxFilterState;
  readonly createdAt: string;
}

export const MAX_SHORTCUTS = 20;
export const SHORTCUT_NAME_MIN = 1;
export const SHORTCUT_NAME_MAX = 40;

export type ShortcutResult =
  | { ok: true; shortcuts: FilterShortcut[] }
  | { ok: false; error: string };

/**
 * Filtro sem nada marcado (o padrão da inbox). Atalho assim não filtra nada e,
 * pior, "casava" com a lista sem filtro: o botão mostrava "Na fila" com a
 * lista inteira na tela.
 */
export function isEmptyShortcutFilters(filters: InboxFilterState): boolean {
  return countActiveFilters(filters) === 0;
}

export const EMPTY_SHORTCUT_ERROR = 'Escolha pelo menos um filtro antes de salvar o atalho.';

type NameCheck = { ok: true; name: string } | { ok: false; error: string };

function normalizeName(name: string): string {
  return name.trim().toLocaleLowerCase('pt-BR');
}

/** Nome aparado, 1–40 caracteres e sem repetir outro atalho (exceto `exceptId`). */
export function validateShortcutName(
  list: readonly FilterShortcut[],
  rawName: string,
  exceptId?: string,
): NameCheck {
  const name = rawName.trim();
  if (name.length < SHORTCUT_NAME_MIN) return { ok: false, error: 'Dê um nome ao atalho.' };
  if (name.length > SHORTCUT_NAME_MAX) {
    return { ok: false, error: `O nome pode ter até ${SHORTCUT_NAME_MAX} caracteres.` };
  }
  const taken = list.some((s) => s.id !== exceptId && normalizeName(s.name) === normalizeName(name));
  if (taken) return { ok: false, error: `Já existe um atalho chamado "${name}".` };
  return { ok: true, name };
}

export function addShortcut(
  list: readonly FilterShortcut[],
  input: { id: string; name: string; filters: InboxFilterState; createdAt: string },
): ShortcutResult {
  if (list.length >= MAX_SHORTCUTS) {
    return { ok: false, error: `Limite de ${MAX_SHORTCUTS} atalhos. Exclua um para salvar outro.` };
  }
  if (isEmptyShortcutFilters(input.filters)) return { ok: false, error: EMPTY_SHORTCUT_ERROR };
  const check = validateShortcutName(list, input.name);
  if (!check.ok) return check;
  return { ok: true, shortcuts: [...list, { ...input, name: check.name }] };
}

export function renameShortcut(
  list: readonly FilterShortcut[],
  id: string,
  name: string,
): ShortcutResult {
  const check = validateShortcutName(list, name, id);
  if (!check.ok) return check;
  return {
    ok: true,
    shortcuts: list.map((s) => (s.id === id ? { ...s, name: check.name } : s)),
  };
}

/** Troca os filtros do atalho. Filtro vazio é recusado: a lista volta igual. */
export function updateShortcutFilters(
  list: readonly FilterShortcut[],
  id: string,
  filters: InboxFilterState,
): FilterShortcut[] {
  if (isEmptyShortcutFilters(filters)) return [...list];
  return list.map((s) => (s.id === id ? { ...s, filters } : s));
}

export function removeShortcut(list: readonly FilterShortcut[], id: string): FilterShortcut[] {
  return list.filter((s) => s.id !== id);
}

/** Troca o atalho de lugar com o vizinho (-1 = esquerda, 1 = direita). */
export function moveShortcut(
  list: readonly FilterShortcut[],
  id: string,
  direction: -1 | 1,
): FilterShortcut[] {
  const from = list.findIndex((s) => s.id === id);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= list.length) return [...list];
  return list.map((s, i) => {
    if (i === from) return list[to];
    if (i === to) return list[from];
    return s;
  });
}

/** O atalho está valendo agora? Atalho vazio nunca conta como ativo. */
export function isShortcutActive(shortcut: FilterShortcut, state: InboxFilterState): boolean {
  return !isEmptyShortcutFilters(shortcut.filters) && sameFilters(shortcut.filters, state);
}

export function findMatchingShortcut(
  list: readonly FilterShortcut[],
  state: InboxFilterState,
): FilterShortcut | undefined {
  return list.find((s) => isShortcutActive(s, state));
}

function sanitizeOne(raw: unknown): FilterShortcut | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== 'string' || !r.id || typeof r.name !== 'string') return null;
  const name = r.name.trim();
  if (name.length < SHORTCUT_NAME_MIN || name.length > SHORTCUT_NAME_MAX) return null;
  return {
    id: r.id,
    name,
    filters: sanitizeFilters(r.filters),
    createdAt: typeof r.createdAt === 'string' ? r.createdAt : '',
  };
}

/** Lista de atalhos vinda de JSON: descarta inválidos e repetidos, corta no limite. */
export function sanitizeShortcuts(raw: unknown): FilterShortcut[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(sanitizeOne)
    .reduce<FilterShortcut[]>((acc, item) => {
      if (!item || acc.length >= MAX_SHORTCUTS) return acc;
      const dup = acc.some(
        (s) => s.id === item.id || normalizeName(s.name) === normalizeName(item.name),
      );
      return dup ? acc : [...acc, item];
    }, []);
}
