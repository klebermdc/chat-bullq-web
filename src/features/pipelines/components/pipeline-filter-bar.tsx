'use client';

import { useState, type ReactNode } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { controlSmCls } from '@/components/ui/control';
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
  /** Controles do quadro que ficam no fim da linha (ex.: setas de rolagem). */
  trailing?: ReactNode;
}

const selectCls = `${controlSmCls} max-w-44`;

export function PipelineFilterBar({
  filter,
  onChange,
  stages,
  vendors,
  entryMonths,
  travelMonths,
  trailing,
}: Props) {
  const set = (patch: Partial<PipelineFilter>) => onChange({ ...filter, ...patch });

  // Filtros do dia a dia ficam na primeira linha (no celular, recolhidos).
  const primaryFilters = (
    <>
      <select
        className={selectCls}
        aria-label="Filtrar por vendedor"
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
        aria-label="Filtrar por mês de entrada do lead"
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
        aria-label="Filtrar por mês da viagem"
        value={filter.travelMonth ?? ''}
        onChange={(e) => set({ travelMonth: e.target.value || null })}
      >
        <option value="">Viagem: qualquer mês</option>
        {travelMonths.map((m) => (
          <option key={m.value} value={m.value}>Viagem: {m.label}</option>
        ))}
      </select>
    </>
  );

  // Usados de vez em quando: abrem em "Mais filtros".
  const secondaryCount =
    (filter.stageId ? 1 : 0) +
    (filter.status ? 1 : 0) +
    (filter.minValue !== null && filter.minValue !== undefined ? 1 : 0) +
    (filter.maxValue !== null && filter.maxValue !== undefined ? 1 : 0);
  const primaryCount =
    (filter.vendorId ? 1 : 0) + (filter.entryMonth ? 1 : 0) + (filter.travelMonth ? 1 : 0);
  // Abre já expandido quando há filtro escondido ativo; depois quem manda é o botão.
  const [expanded, setExpanded] = useState(secondaryCount > 0);

  return (
    <div className="border-b border-border px-4 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          placeholder="Buscar por nome…"
          aria-label="Buscar por nome do cliente"
          className={`${controlSmCls} min-w-40 flex-1 md:max-w-64`}
          value={filter.search}
          onChange={(e) => set({ search: e.target.value })}
        />

        <div className="hidden md:contents">{primaryFilters}</div>

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-controls="pipeline-more-filters"
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-input px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
        >
          <SlidersHorizontal aria-hidden="true" className="h-3.5 w-3.5" />
          <span className="md:hidden">Filtros</span>
          <span className="hidden md:inline">Mais filtros</span>
          {secondaryCount > 0 && (
            <span className="hidden rounded-full bg-primary px-1.5 text-[10px] font-bold leading-4 text-primary-foreground md:inline">
              {secondaryCount}
            </span>
          )}
          {secondaryCount + primaryCount > 0 && (
            <span className="rounded-full bg-primary px-1.5 text-[10px] font-bold leading-4 text-primary-foreground md:hidden">
              {secondaryCount + primaryCount}
            </span>
          )}
        </button>

        {isFilterActive(filter) && (
          <button
            type="button"
            onClick={() => onChange(EMPTY_FILTER)}
            className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X aria-hidden="true" className="h-3.5 w-3.5" /> Limpar
          </button>
        )}

        {trailing && <div className="ml-auto flex shrink-0 items-center">{trailing}</div>}
      </div>

      {/* A região existe sempre (o `aria-controls` do botão aponta para ela);
          recolhida, fica só escondida. No celular os filtros principais também
          moram aqui, atrás do botão. */}
      <div
        id="pipeline-more-filters"
        className={expanded ? 'mt-2 flex flex-wrap items-center gap-2' : 'hidden'}
      >
        <div className="contents md:hidden">{primaryFilters}</div>
        <select
          className={selectCls}
          aria-label="Filtrar por etapa"
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
          aria-label="Filtrar por status"
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
          aria-label="Valor mínimo do negócio"
          className={`${controlSmCls} w-28`}
          value={filter.minValue ?? ''}
          onChange={(e) =>
            set({ minValue: e.target.value === '' ? null : Number(e.target.value) })
          }
        />
        <input
          type="number"
          inputMode="numeric"
          placeholder="Valor máx."
          aria-label="Valor máximo do negócio"
          className={`${controlSmCls} w-28`}
          value={filter.maxValue ?? ''}
          onChange={(e) =>
            set({ maxValue: e.target.value === '' ? null : Number(e.target.value) })
          }
        />
      </div>
    </div>
  );
}
