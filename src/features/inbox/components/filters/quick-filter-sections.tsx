'use client';

import { LOST_REASONS } from '@/features/pipelines/lib/lost-reasons';
import {
  CONVERSATION_STATUSES,
  IDLE_HOURS_OPTIONS,
  LEAD_PHASE_FILTERS,
  LEAD_PHASE_LABELS,
  STATUS_LABELS,
  idleLabel,
  toggleListItem,
  type InboxFilterState,
  type LeadPhaseFilter,
  type LostFilter,
  type OriginFilter,
} from '../../lib/inbox-filters';
import { CheckRow, FilterSection, PillGroup, type FilterPatch, type PillOption } from './filter-ui';

interface SectionProps {
  value: InboxFilterState;
  onPatch: FilterPatch;
}

const STATUS_OPTIONS: PillOption<string>[] = CONVERSATION_STATUSES.map((s) => ({
  value: s,
  label: STATUS_LABELS[s],
}));

const LEAD_PHASE_OPTIONS: PillOption<LeadPhaseFilter>[] = LEAD_PHASE_FILTERS.map((p) => ({
  value: p,
  label: LEAD_PHASE_LABELS[p],
}));

const ORIGIN_OPTIONS: PillOption<OriginFilter>[] = [
  { value: 'any', label: 'Todas' },
  { value: 'ad', label: 'Veio de anúncio' },
  { value: 'organic', label: 'Sem anúncio' },
];

const LOST_OPTIONS: PillOption<LostFilter>[] = [
  { value: 'any', label: 'Todas' },
  { value: 'only', label: 'Só perdidas' },
  { value: 'exclude', label: 'Esconder perdidas' },
];

/** 0 = "Qualquer" (sem filtro). */
const IDLE_OPTIONS: PillOption<number>[] = [
  { value: 0, label: 'Qualquer' },
  ...IDLE_HOURS_OPTIONS.map((h) => ({ value: h, label: idleLabel(h).replace('+', '') })),
];

export function StatusFilterSection({ value, onPatch }: SectionProps) {
  return (
    <FilterSection id="inbox-filter-status" title="Status" bordered>
      <PillGroup
        labelledBy="inbox-filter-status"
        options={STATUS_OPTIONS}
        isActive={(s) => value.statuses.includes(s)}
        onSelect={(s) => onPatch({ statuses: toggleListItem(value.statuses, s) })}
      />
    </FilterSection>
  );
}

/** Leads sem atendente: ainda com a IA ou na fila de distribuição. */
export function LeadPhaseFilterSection({ value, onPatch }: SectionProps) {
  return (
    <FilterSection id="inbox-filter-phase" title="Fase do lead" bordered>
      <PillGroup
        labelledBy="inbox-filter-phase"
        options={LEAD_PHASE_OPTIONS}
        isActive={(p) => value.leadPhases.includes(p)}
        onSelect={(p) =>
          onPatch({ leadPhases: toggleListItem(value.leadPhases, p) as LeadPhaseFilter[] })
        }
      />
    </FilterSection>
  );
}

export function OriginFilterSection({ value, onPatch }: SectionProps) {
  return (
    <FilterSection id="inbox-filter-origin" title="Origem" bordered>
      <PillGroup
        labelledBy="inbox-filter-origin"
        options={ORIGIN_OPTIONS}
        isActive={(o) => value.origin === o}
        onSelect={(origin) => onPatch({ origin })}
      />
    </FilterSection>
  );
}

export function IdleFilterSection({ value, onPatch }: SectionProps) {
  return (
    <FilterSection id="inbox-filter-idle" title="Parado há mais de" bordered>
      <PillGroup
        labelledBy="inbox-filter-idle"
        options={IDLE_OPTIONS}
        isActive={(h) => (value.idleHours ?? 0) === h}
        onSelect={(h) => onPatch({ idleHours: h > 0 ? h : null })}
      />
    </FilterSection>
  );
}

export function LostFilterSection({ value, onPatch }: SectionProps) {
  return (
    <FilterSection id="inbox-filter-lost" title="Venda perdida" bordered>
      <PillGroup
        labelledBy="inbox-filter-lost"
        options={LOST_OPTIONS}
        isActive={(l) => value.lost === l}
        onSelect={(lost) => onPatch({ lost, lostReasons: lost === 'only' ? value.lostReasons : [] })}
      />
      {value.lost === 'only' && (
        <div role="group" aria-label="Motivos da perda" className="mt-1.5">
          {LOST_REASONS.map((r) => (
            <CheckRow
              key={r.code}
              label={r.label}
              active={value.lostReasons.includes(r.code)}
              onClick={() => onPatch({ lostReasons: toggleListItem(value.lostReasons, r.code) })}
            />
          ))}
        </div>
      )}
    </FilterSection>
  );
}
