'use client';

import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useInboxPreferences } from './use-inbox-preferences';
import {
  DEFAULT_FILTERS,
  countActiveFilters,
  filtersFromPreferences,
  pruneUnknownTags,
  type InboxFilterState,
} from '../lib/inbox-filters';
import {
  addShortcut,
  findMatchingShortcut,
  sanitizeShortcuts,
  type FilterShortcut,
} from '../lib/filter-shortcuts';

function newShortcutId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `sc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Estado do filtro da inbox (um objeto só) + atalhos salvos. Tudo vive em
 * `preferences.inbox.filters` / `.shortcuts`; as chaves planas antigas só são
 * lidas para migrar.
 */
export function useInboxFilters(knownTags: readonly { id: string }[]) {
  const { preferences, isLoaded, update } = useInboxPreferences();
  // null = o usuário ainda não mexeu: vale o que está salvo (ou o padrão
  // enquanto as preferências carregam). Derivar evita setState em efeito.
  const [localFilters, setLocalFilters] = useState<InboxFilterState | null>(null);
  const savedFilters = useMemo(
    () => (isLoaded ? filtersFromPreferences(preferences) : DEFAULT_FILTERS),
    [isLoaded, preferences],
  );
  const rawFilters = localFilters ?? savedFilters;

  // Etiqueta apagada em outra aba some do filtro: não manda id morto para a
  // API. Persiste junto da próxima mudança.
  const filters = useMemo(() => {
    if (!knownTags.length) return rawFilters;
    return pruneUnknownTags(rawFilters, new Set(knownTags.map((t) => t.id)));
  }, [rawFilters, knownTags]);

  const applyFilters = useCallback(
    (next: InboxFilterState) => {
      setLocalFilters(next);
      update({ filters: next });
    },
    [update],
  );

  const shortcuts = useMemo(() => sanitizeShortcuts(preferences.shortcuts), [preferences.shortcuts]);
  const saveShortcuts = useCallback(
    (next: FilterShortcut[]) => update({ shortcuts: next }),
    [update],
  );

  const matchingShortcut = useMemo(
    () => findMatchingShortcut(shortcuts, filters),
    [shortcuts, filters],
  );
  const activeFilterCount = countActiveFilters(filters);

  const saveCurrentAsShortcut = useCallback(
    (name: string): boolean => {
      const result = addShortcut(shortcuts, {
        id: newShortcutId(),
        name,
        filters,
        createdAt: new Date().toISOString(),
      });
      if (!result.ok) {
        toast.error(result.error);
        return false;
      }
      saveShortcuts(result.shortcuts);
      toast.success(`Atalho "${name.trim()}" salvo.`);
      return true;
    },
    [shortcuts, filters, saveShortcuts],
  );

  return {
    preferences,
    isLoaded,
    updatePreferences: update,
    filters,
    applyFilters,
    activeFilterCount,
    shortcuts,
    saveShortcuts,
    matchingShortcut,
    saveCurrentAsShortcut,
  };
}
