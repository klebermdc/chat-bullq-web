'use client';

import type { Pipeline } from '@/features/pipelines/services/pipelines.service';
import { toggleListItem, type InboxFilterState } from '../../lib/inbox-filters';
import { CheckRow, ClearButton, FilterSection, scrollListCls, type FilterPatch } from './filter-ui';

/**
 * Funil: etapas agrupadas por funil. Só etapas comuns — a API filtra por card
 * ABERTO na etapa, e card em etapa de Ganho/Perdido já foi fechado.
 */
export function StageFilterSection({
  value,
  onPatch,
  pipelines,
}: {
  value: InboxFilterState;
  onPatch: FilterPatch;
  pipelines: readonly Pipeline[];
}) {
  const groups = pipelines
    .map((p) => ({ ...p, stages: (p.stages ?? []).filter((s) => s.type === 'NORMAL') }))
    .filter((p) => p.stages.length > 0);
  if (groups.length === 0) return null;

  return (
    <FilterSection
      id="inbox-filter-stage"
      title="Funil"
      bordered
      action={
        value.stageIds.length > 0 && (
          <ClearButton label="Limpar etapas selecionadas" onClick={() => onPatch({ stageIds: [] })} />
        )
      }
    >
      <div className={scrollListCls}>
        {groups.map((p) => (
          <div key={p.id} role="group" aria-label={`Funil ${p.name}`}>
            {groups.length > 1 && (
              <p className="px-2.5 pb-0.5 pt-1.5 text-xs font-semibold text-muted-foreground">{p.name}</p>
            )}
            {p.stages.map((s) => (
              <CheckRow
                key={s.id}
                label={s.name}
                dotColor={s.color}
                active={value.stageIds.includes(s.id)}
                onClick={() => onPatch({ stageIds: toggleListItem(value.stageIds, s.id) })}
              />
            ))}
          </div>
        ))}
      </div>
    </FilterSection>
  );
}
