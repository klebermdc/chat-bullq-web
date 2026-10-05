'use client';

import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { pipelinesService } from '@/features/pipelines/services/pipelines.service';
import { membersService } from '@/features/settings/services/members.service';
import { controlSmCls } from '@/components/ui/control';
import type { DealsFilters, DealStatus } from '../services/crm-reports.service';
import { FilterBarShell, FilterField, PeriodPresets } from './filter-controls';

const selectCls = `${controlSmCls} w-full`;
const valueInputCls = `${controlSmCls} w-full min-w-0 font-mono tabular-nums`;

export function DealsFilterBar({
  filters,
  onChange,
  actions,
}: {
  filters: DealsFilters;
  onChange: (f: DealsFilters) => void;
  actions?: ReactNode;
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
    <FilterBarShell actions={actions}>
      <PeriodPresets
        from={filters.from}
        to={filters.to}
        onSelect={(from) => set({ from, to: undefined })}
      />

      <FilterField label="Funil">
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
      </FilterField>

      {selectedStages && selectedStages.length > 0 && (
        <FilterField label="Etapa">
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
        </FilterField>
      )}

      <FilterField label="Status">
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

      {/* Mínimo e máximo andam juntos: sozinho, o "máx" caía para outra linha. */}
      <div
        role="group"
        aria-label="Valor"
        className="flex min-w-[168px] max-w-[220px] flex-1 flex-col gap-1"
      >
        <span className="text-xs font-medium text-muted-foreground">Valor (R$)</span>
        <div className="flex items-center gap-1.5">
          <input
            value={filters.valueMin ?? ''}
            onChange={(e) => set({ valueMin: e.target.value || undefined })}
            inputMode="decimal"
            placeholder="Mín."
            aria-label="Valor mínimo"
            className={valueInputCls}
          />
          <span aria-hidden="true" className="text-xs text-muted-foreground">–</span>
          <input
            value={filters.valueMax ?? ''}
            onChange={(e) => set({ valueMax: e.target.value || undefined })}
            inputMode="decimal"
            placeholder="Máx."
            aria-label="Valor máximo"
            className={valueInputCls}
          />
        </div>
      </div>
    </FilterBarShell>
  );
}
