'use client';

import { X } from 'lucide-react';
import type { PipelineStage } from '../services/pipelines.service';
import {
  type PipelineFilter,
  type MonthOption,
  type VendorOption,
  EMPTY_FILTER,
  isFilterActive,
} from '../lib/pipeline-filters';

interface Props {
  filter: PipelineFilter;
  onChange: (f: PipelineFilter) => void;
  stages: PipelineStage[];
  vendors: VendorOption[];
  entryMonths: MonthOption[];
  travelMonths: MonthOption[];
}

const selectCls =
  'rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-xs text-zinc-700 focus:border-primary focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200';

export function PipelineFilterBar({
  filter,
  onChange,
  stages,
  vendors,
  entryMonths,
  travelMonths,
}: Props) {
  const set = (patch: Partial<PipelineFilter>) => onChange({ ...filter, ...patch });

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200 px-4 py-2 dark:border-zinc-800">
      <select
        className={selectCls}
        value={filter.vendorId ?? ''}
        onChange={(e) => set({ vendorId: e.target.value || null })}
      >
        <option value="">Todos os vendedores</option>
        {vendors.map((v) => (
          <option key={v.id} value={v.id}>{v.name}</option>
        ))}
      </select>

      <select
        className={selectCls}
        value={filter.entryMonth ?? ''}
        onChange={(e) => set({ entryMonth: e.target.value || null })}
      >
        <option value="">Entrada: qualquer mês</option>
        {entryMonths.map((m) => (
          <option key={m.value} value={m.value}>Entrada: {m.label}</option>
        ))}
      </select>

      <select
        className={selectCls}
        value={filter.travelMonth ?? ''}
        onChange={(e) => set({ travelMonth: e.target.value || null })}
      >
        <option value="">Viagem: qualquer mês</option>
        {travelMonths.map((m) => (
          <option key={m.value} value={m.value}>Viagem: {m.label}</option>
        ))}
      </select>

      <select
        className={selectCls}
        value={filter.stageId ?? ''}
        onChange={(e) => set({ stageId: e.target.value || null })}
      >
        <option value="">Todas as etapas</option>
        {stages.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>

      <select
        className={selectCls}
        value={filter.status}
        onChange={(e) => set({ status: e.target.value as PipelineFilter['status'] })}
      >
        <option value="">Qualquer status</option>
        <option value="OPEN">Aberto</option>
        <option value="WON">Ganho</option>
        <option value="LOST">Perdido</option>
      </select>

      <input
        type="number"
        inputMode="numeric"
        placeholder="Valor mín."
        className={`${selectCls} w-24`}
        value={filter.minValue ?? ''}
        onChange={(e) =>
          set({ minValue: e.target.value === '' ? null : Number(e.target.value) })
        }
      />
      <input
        type="number"
        inputMode="numeric"
        placeholder="Valor máx."
        className={`${selectCls} w-24`}
        value={filter.maxValue ?? ''}
        onChange={(e) =>
          set({ maxValue: e.target.value === '' ? null : Number(e.target.value) })
        }
      />

      <input
        type="search"
        placeholder="Buscar por nome…"
        className={`${selectCls} min-w-[10rem] flex-1`}
        value={filter.search}
        onChange={(e) => set({ search: e.target.value })}
      />

      {isFilterActive(filter) && (
        <button
          type="button"
          onClick={() => onChange(EMPTY_FILTER)}
          className="inline-flex items-center gap-1 rounded-md border border-zinc-200 px-2 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          <X className="h-3.5 w-3.5" /> Limpar
        </button>
      )}
    </div>
  );
}
