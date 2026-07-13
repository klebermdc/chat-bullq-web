'use client';

import { useQuery } from '@tanstack/react-query';
import { pipelinesService } from '@/features/pipelines/services/pipelines.service';
import { membersService } from '@/features/settings/services/members.service';
import type { DealsFilters, DealStatus } from '../services/crm-reports.service';

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

export function DealsFilterBar({
  filters,
  onChange,
}: {
  filters: DealsFilters;
  onChange: (f: DealsFilters) => void;
}) {
  const { data: pipelines } = useQuery({
    queryKey: ['pipelines'],
    queryFn: () => pipelinesService.list(),
  });
  const { data: members } = useQuery({
    queryKey: ['members'],
    queryFn: () => membersService.list(),
    retry: false,
  });
  const set = (patch: Partial<DealsFilters>) =>
    onChange({ ...filters, ...patch, page: 1 });

  const selectedStages = pipelines?.find((p) => p.id === filters.pipelineId)
    ?.stages;

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
        Pipeline
        <select
          value={filters.pipelineId ?? ''}
          onChange={(e) =>
            set({ pipelineId: e.target.value || undefined, stageIds: undefined })
          }
          className={selectCls}
        >
          <option value="">Todos</option>
          {pipelines?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>

      {selectedStages && selectedStages.length > 0 && (
        <label className="flex flex-col text-[11px] text-zinc-500">
          Etapa
          <select
            value={filters.stageIds?.[0] ?? ''}
            onChange={(e) =>
              set({ stageIds: e.target.value ? [e.target.value] : undefined })
            }
            className={selectCls}
          >
            <option value="">Todas</option>
            {selectedStages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="flex flex-col text-[11px] text-zinc-500">
        Status
        <select
          value={filters.status ?? ''}
          onChange={(e) =>
            set({ status: (e.target.value || undefined) as DealStatus | undefined })
          }
          className={selectCls}
        >
          <option value="">Todos</option>
          <option value="OPEN">Aberto</option>
          <option value="WON">Ganho</option>
          <option value="LOST">Perdido</option>
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
        Valor mín
        <input
          value={filters.valueMin ?? ''}
          onChange={(e) => set({ valueMin: e.target.value || undefined })}
          inputMode="decimal"
          className={`${selectCls} w-24`}
        />
      </label>

      <label className="flex flex-col text-[11px] text-zinc-500">
        Valor máx
        <input
          value={filters.valueMax ?? ''}
          onChange={(e) => set({ valueMax: e.target.value || undefined })}
          inputMode="decimal"
          className={`${selectCls} w-24`}
        />
      </label>
    </div>
  );
}
