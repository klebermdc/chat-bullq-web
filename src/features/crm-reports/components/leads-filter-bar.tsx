'use client';

import { useQuery } from '@tanstack/react-query';
import { channelsService } from '@/features/channels/services/channels.service';
import { tagsService } from '@/features/settings/services/tags.service';
import { membersService } from '@/features/settings/services/members.service';
import type { LeadsFilters } from '../services/crm-reports.service';

const PRESETS: { label: string; days: number | 'month' }[] = [
  { label: 'Hoje', days: 0 },
  { label: '7 dias', days: 7 },
  { label: '30 dias', days: 30 },
  { label: 'Mês', days: 'month' },
];

function presetFrom(p: number | 'month'): string {
  const now = new Date();
  if (p === 'month')
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const d = new Date(now);
  d.setDate(d.getDate() - (p as number));
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

const selectCls =
  'mt-0.5 rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100';

export function LeadsFilterBar({
  filters,
  onChange,
}: {
  filters: LeadsFilters;
  onChange: (f: LeadsFilters) => void;
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
    <div className="flex flex-wrap items-end gap-3 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex gap-1 self-center">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            onClick={() => set({ from: presetFrom(p.days), to: undefined })}
            className="rounded-md bg-zinc-100 px-2.5 py-1 text-xs text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
          >
            {p.label}
          </button>
        ))}
      </div>

      <label className="flex flex-col text-[11px] text-zinc-500">
        Canal
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
      </label>

      <label className="flex flex-col text-[11px] text-zinc-500">
        Origem / tag
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
      </label>

      <label className="flex flex-col text-[11px] text-zinc-500">
        Atendente
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
      </label>

      <label className="flex flex-col text-[11px] text-zinc-500">
        Temperatura
        <select
          value={filters.temperatureMin ?? ''}
          onChange={(e) => set({ temperatureMin: e.target.value || undefined })}
          className={selectCls}
        >
          <option value="">Qualquer</option>
          <option value="3">🔥 Quente</option>
          <option value="2">🌤️ Morno+</option>
          <option value="1">🧊 Frio+</option>
        </select>
      </label>

      <label className="flex flex-col text-[11px] text-zinc-500">
        Tem proposta
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
      </label>

      <label className="flex flex-col text-[11px] text-zinc-500">
        Tem deal
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
      </label>
    </div>
  );
}
