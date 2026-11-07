'use client';

import { Archive, FolderKanban, MailOpen, User, Users } from 'lucide-react';
import { PROJECT_STATUSES } from '@/features/projects/project-fields';
import {
  DATE_RANGE_LABELS,
  DATE_RANGE_PRESETS,
  type DateField,
  type DateRangePreset,
  type InboxFilterState,
} from '../../lib/inbox-filters';
import {
  FilterSection,
  PillGroup,
  ToggleRow,
  filterControlCls,
  labelCls,
  sectionCls,
  type FilterPatch,
  type PillOption,
} from './filter-ui';

interface SectionProps {
  value: InboxFilterState;
  onPatch: FilterPatch;
}

const DATE_OPTIONS: PillOption<DateRangePreset>[] = DATE_RANGE_PRESETS.map((p) => ({
  value: p,
  label: DATE_RANGE_LABELS[p],
}));

const DATE_FIELD_OPTIONS: PillOption<DateField>[] = [
  { value: 'lastMessage', label: 'Última mensagem' },
  { value: 'created', label: 'Criação' },
];

export function DateFilterSection({ value, onPatch }: SectionProps) {
  return (
    <FilterSection id="inbox-filter-date" title="Data" bordered>
      <PillGroup
        labelledBy="inbox-filter-date"
        options={DATE_OPTIONS}
        isActive={(p) => value.dateRange === p}
        onSelect={(dateRange) => onPatch({ dateRange })}
      />
      {value.dateRange === 'RANGE' && (
        <div className="mt-2 flex items-center gap-1.5">
          <input
            type="date"
            aria-label="Data inicial"
            value={value.dateFrom}
            onChange={(e) => onPatch({ dateFrom: e.target.value })}
            className={`${filterControlCls} min-w-0 flex-1`}
          />
          <span className="text-xs text-muted-foreground">até</span>
          <input
            type="date"
            aria-label="Data final"
            value={value.dateTo}
            onChange={(e) => onPatch({ dateTo: e.target.value })}
            className={`${filterControlCls} min-w-0 flex-1`}
          />
        </div>
      )}
      {value.dateRange !== 'ALL' && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span id="inbox-filter-date-field" className="px-1 text-xs text-muted-foreground">
            Data de
          </span>
          <PillGroup
            labelledBy="inbox-filter-date-field"
            options={DATE_FIELD_OPTIONS}
            isActive={(f) => value.dateField === f}
            onSelect={(dateField) => onPatch({ dateField })}
          />
        </div>
      )}
    </FilterSection>
  );
}

export function ProjectFilterSection({ value, onPatch }: SectionProps) {
  return (
    <div className={`${sectionCls} border-t border-border`}>
      <label htmlFor="inbox-filter-project" className={labelCls}>
        Projeto
      </label>
      <select
        id="inbox-filter-project"
        value={value.projectStatus}
        onChange={(e) => onPatch({ projectStatus: e.target.value })}
        className={`${filterControlCls} w-full`}
      >
        <option value="">Status: todos</option>
        {PROJECT_STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <div className="mt-1.5">
        <ToggleRow
          active={value.mineProjects}
          onClick={() => onPatch({ mineProjects: !value.mineProjects })}
          icon={FolderKanban}
          label="Meus projetos"
        />
      </div>
    </div>
  );
}

export function KindToggleSection({ value, onPatch }: SectionProps) {
  return (
    <div className={`${sectionCls} border-t border-border`}>
      <ToggleRow
        active={value.individualOnly}
        onClick={() => onPatch({ individualOnly: !value.individualOnly })}
        icon={User}
        label="Individual"
        description="Conversas individuais"
      />
      <ToggleRow
        active={value.groupsOnly}
        onClick={() => onPatch({ groupsOnly: !value.groupsOnly })}
        icon={Users}
        label="Grupo"
        description="Apenas conversas de grupos"
      />
      <ToggleRow
        active={value.unreadOnly}
        onClick={() => onPatch({ unreadOnly: !value.unreadOnly })}
        icon={MailOpen}
        label="Não lidas"
        description="Apenas com mensagens novas"
      />
      <ToggleRow
        active={value.archivedOnly}
        onClick={() => onPatch({ archivedOnly: !value.archivedOnly })}
        icon={Archive}
        label="Arquivadas"
        description="Mostra a inbox arquivada"
      />
    </div>
  );
}
