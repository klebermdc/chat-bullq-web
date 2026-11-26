'use client';

import { useCallback, useMemo } from 'react';
import { useInboxPreferences } from './use-inbox-preferences';
import { sanitizePinnedIds, togglePinned, type TogglePinnedResult } from '../lib/pinned-conversations';

/**
 * Conversas fixadas pelo atendente logado (preferência pessoal, por empresa).
 * A lista manda os ids para a API, que devolve essas conversas no topo.
 */
export function usePinnedConversations() {
  const { preferences, update } = useInboxPreferences();
  const pinnedIds = useMemo(
    () => sanitizePinnedIds(preferences.pinnedConversationIds),
    [preferences.pinnedConversationIds],
  );

  const toggle = useCallback(
    (conversationId: string): TogglePinnedResult => {
      const result = togglePinned(pinnedIds, conversationId);
      if (result.ok) update({ pinnedConversationIds: result.ids });
      return result;
    },
    [pinnedIds, update],
  );

  return { pinnedIds, toggle };
}
