'use client';

import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { channelsService } from '@/features/channels/services/channels.service';
import { tagsService } from '@/features/settings/services/tags.service';
import { membersService } from '@/features/settings/services/members.service';
import { controlSmCls } from '@/components/ui/control';
import type { LeadsFilters } from '../services/crm-reports.service';
import { FilterBarShell, FilterField, PeriodPresets } from './filter-controls';

const selectCls = `${controlSmCls} w-full`;

export function LeadsFilterBar({
  filters,
  onChange,
  actions,
}: {
  filters: LeadsFilters;
  onChange: (f: LeadsFilters) => void;
  actions?: ReactNode;
}) {
  const { data: channels } = useQuery({
    queryKey: ['channels'],
    queryFn: () => channelsService.list(),
    retry: false,
  });
  const { data: tags } = useQuery({
    queryKey: ['tags'],
    queryFn: () => tagsService.list(),
    retry: false,
  });
  const { data: members } = useQuery({
    queryKey: ['members'],
    queryFn: () => membersService.list(),
    retry: false,
  });
  const set = (patch: Partial<LeadsFilters>) =>
    onChange({ ...filters, ...patch, page: 1 });

  return (
    <FilterBarShell actions={actions}>
      <PeriodPresets
        from={filters.from}
        to={filters.to}
        onSelect={(from) => set({ from, to: undefined })}
      />

      <FilterField label="Canal">
        <select
          value={filters.channelId ?? ''}
          onChange={(e) => set({ channelId: e.target.value || undefined })}
          className={selectCls}
        >
          <option value="">Todos</option>
          {channels?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </FilterField>

      <FilterField label="Origem / tag">
        <select
          value={filters.tagId ?? ''}
          onChange={(e) => set({ tagId: e.target.value || undefined })}
          className={selectCls}
        >
          <option value="">Todas</option>
          {tags?.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </FilterField>

      <FilterField label="Atendente">
        <select
          value={filters.assignedToId ?? ''}
          onChange={(e) => set({ assignedToId: e.target.value || undefined })}
          className={selectCls}
        >
          <option value="">Todos</option>
          {members?.map((m) => (
            <option key={m.userId} value={m.userId}>
              {m.user.name}
            </option>
          ))}
        </select>
      </FilterField>

      <FilterField label="Temperatura">
        <select
          value={filters.temperatureMin ?? ''}
          onChange={(e) => set({ temperatureMin: e.target.value || undefined })}
          className={selectCls}
        >
          <option value="">Qualquer</option>
          <option value="3">Quente</option>
          <option value="2">Morno ou mais</option>
          <option value="1">Frio ou mais</option>
        </select>
      </FilterField>

      <FilterField label="Tem proposta">
        <select
          value={filters.hasProposal ?? ''}
          onChange={(e) =>
            set({
              hasProposal: (e.target.value || undefined) as
                | 'true'
                | 'false'
                | undefined,
            })
          }
          className={selectCls}
        >
          <option value="">Qualquer</option>
          <option value="true">Sim</option>
          <option value="false">Não</option>
        </select>
      </FilterField>

      <FilterField label="Tem negócio">
        <select
          value={filters.hasDeal ?? ''}
          onChange={(e) =>
            set({
              hasDeal: (e.target.value || undefined) as
                | 'true'
                | 'false'
                | undefined,
            })
          }
          className={selectCls}
        >
          <option value="">Qualquer</option>
          <option value="true">Sim</option>
          <option value="false">Não</option>
        </select>
      </FilterField>
    </FilterBarShell>
  );
}
