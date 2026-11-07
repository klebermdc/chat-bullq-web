'use client';

import type { Segment } from '@/features/segments/services/segments.service';
import type { Channel } from '@/features/channels/services/channels.service';
import { toggleListItem, type InboxFilterState } from '../../lib/inbox-filters';
import {
  CheckRow,
  ClearButton,
  FilterSection,
  filterControlCls,
  labelCls,
  scrollListCls,
  sectionCls,
  type FilterPatch,
} from './filter-ui';

/** Setor (escolha única) e Canais (vários) — um exclui o outro. */
export function ChannelFilterSection({
  value,
  onPatch,
  segments,
  channels,
}: {
  value: InboxFilterState;
  onPatch: FilterPatch;
  segments: readonly Segment[];
  channels: readonly Channel[];
}) {
  return (
    <>
      <div className={sectionCls}>
        <label htmlFor="inbox-filter-segment" className={labelCls}>
          Setor
        </label>
        <select
          id="inbox-filter-segment"
          value={value.segmentId ?? ''}
          onChange={(e) => onPatch({ segmentId: e.target.value || null, channelIds: [] })}
          className={`${filterControlCls} w-full`}
        >
          <option value="">Todos os setores</option>
          {segments.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {channels.length > 0 && (
        <FilterSection
          id="inbox-filter-channel"
          title="Canal"
          action={
            value.channelIds.length > 0 && (
              <ClearButton label="Limpar canais selecionados" onClick={() => onPatch({ channelIds: [] })} />
            )
          }
        >
          <div className={scrollListCls}>
            {channels.map((c) => (
              <CheckRow
                key={c.id}
                label={c.name}
                active={value.channelIds.includes(c.id)}
                onClick={() =>
                  onPatch({ channelIds: toggleListItem(value.channelIds, c.id), segmentId: null })
                }
              />
            ))}
          </div>
        </FilterSection>
      )}
    </>
  );
}
