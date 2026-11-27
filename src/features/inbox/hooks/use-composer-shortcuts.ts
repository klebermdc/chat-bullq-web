'use client';

import { useCallback, useMemo } from 'react';
import { useInboxPreferences } from './use-inbox-preferences';
import { sanitizeComposerShortcuts, type ComposerShortcut } from '../lib/composer-shortcuts';

/**
 * Atalhos da barra do compositor do usuário logado. A preferência é pessoal
 * (por usuário e empresa), então cada gestor vê só os que ele criou.
 */
export function useComposerShortcuts() {
  const { preferences, update } = useInboxPreferences();
  const shortcuts = useMemo(
    () => sanitizeComposerShortcuts(preferences.composerShortcuts),
    [preferences.composerShortcuts],
  );
  const save = useCallback(
    (next: ComposerShortcut[]) => update({ composerShortcuts: next }),
    [update],
  );
  return { shortcuts, save };
}
