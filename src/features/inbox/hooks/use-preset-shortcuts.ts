'use client';

import { useEffect, useRef } from 'react';
import type { Member } from '@/features/settings/services/members.service';
import type { FilterShortcut } from '../lib/filter-shortcuts';
import { buildPresetShortcuts } from '../lib/preset-shortcuts';
import type { InboxPreferences } from '../services/preferences.service';
import { newShortcutId } from './use-inbox-filters';

interface Options {
  /** Só ADM/Owner ganham os atalhos prontos. */
  enabled: boolean;
  prefsLoaded: boolean;
  preferences: InboxPreferences;
  shortcuts: readonly FilterShortcut[];
  members: readonly Member[];
  update: (patch: InboxPreferences) => void;
}

/**
 * Na primeira abertura da inbox de um ADM/Owner, acrescenta os atalhos
 * prontos (Com a IA, Na fila, Atendimento <nome>) e marca que já fez — quem
 * excluir um atalho não o vê voltar.
 */
export function usePresetShortcuts({ enabled, prefsLoaded, preferences, shortcuts, members, update }: Options) {
  const doneRef = useRef(false);
  useEffect(() => {
    if (!enabled || !prefsLoaded || doneRef.current) return;
    if (preferences.presetShortcutsSeeded || members.length === 0) return;
    doneRef.current = true;
    const presets = buildPresetShortcuts(
      shortcuts,
      members.map((m) => ({ id: m.user.id, name: m.user.name, isActive: m.user.isActive })),
      newShortcutId,
      new Date().toISOString(),
    );
    update({ shortcuts: [...shortcuts, ...presets], presetShortcutsSeeded: true });
  }, [enabled, prefsLoaded, preferences.presetShortcutsSeeded, shortcuts, members, update]);
}
