'use client';

import { useMemo } from 'react';
import type { Member } from '@/features/settings/services/members.service';
import {
  ASSIGNEE_ME,
  ASSIGNEE_NONE,
  toggleListItem,
  type InboxFilterState,
} from '../../lib/inbox-filters';
import { CheckRow, ClearButton, FilterSection, scrollListCls, type FilterPatch } from './filter-ui';

/** Atendente (vários): Eu, Sem atendente e os membros ativos. */
export function AssigneeFilterSection({
  value,
  onPatch,
  members,
  disabled,
}: {
  value: InboxFilterState;
  onPatch: FilterPatch;
  members: readonly Member[];
  disabled?: boolean;
}) {
  const options = useMemo(
    () => [
      { id: ASSIGNEE_ME, label: 'Eu' },
      { id: ASSIGNEE_NONE, label: 'Sem atendente' },
      ...members.filter((m) => m.user.isActive).map((m) => ({ id: m.user.id, label: m.user.name })),
    ],
    [members],
  );

  return (
    <FilterSection
      id="inbox-filter-assignee"
      title="Atendente"
      bordered
      action={
        !disabled &&
        value.assignees.length > 0 && (
          <ClearButton label="Limpar atendentes selecionados" onClick={() => onPatch({ assignees: [] })} />
        )
      }
    >
      {disabled && (
        <p className="px-1 pb-1.5 text-xs text-muted-foreground">
          Você vê só as conversas atribuídas a você.
        </p>
      )}
      <div className={scrollListCls}>
        {options.map((o) => (
          <CheckRow
            key={o.id}
            label={o.label}
            disabled={disabled}
            active={value.assignees.includes(o.id)}
            onClick={() => onPatch({ assignees: toggleListItem(value.assignees, o.id) })}
          />
        ))}
      </div>
    </FilterSection>
  );
}
