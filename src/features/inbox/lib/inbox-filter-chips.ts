import { lostReasonLabel } from '@/features/pipelines/lib/lost-reasons';
import {
  ASSIGNEE_ME,
  ASSIGNEE_NONE,
  DATE_RANGE_LABELS,
  DEFAULT_FILTERS,
  HOURS_PER_DAY,
  LEAD_PHASE_LABELS,
  STATUS_LABELS,
  type ConversationStatusFilter,
  type InboxFilterState,
  type LeadPhaseFilter,
} from './inbox-filter-types';

/** Chip removível de filtro ativo. `clear` devolve um estado NOVO. */
export interface ActiveFilterChip {
  key: string;
  label: string;
  /** Cor da etiqueta incluída (chip vira TagChip). */
  color?: string;
  clear: (state: InboxFilterState) => InboxFilterState;
}

interface Named {
  id: string;
  name: string;
}

export interface FilterLookups {
  channels: readonly Named[];
  segments: readonly Named[];
  members: readonly Named[];
  tags: readonly (Named & { color?: string })[];
  stages: readonly Named[];
}

export const EMPTY_LOOKUPS: FilterLookups = {
  channels: [],
  segments: [],
  members: [],
  tags: [],
  stages: [],
};

const FALLBACK = 'selecionado';

function nameOf(list: readonly Named[], id: string): string {
  return list.find((item) => item.id === id)?.name ?? FALLBACK;
}

function without(list: readonly string[], id: string): string[] {
  return list.filter((item) => item !== id);
}

type ListKey = 'channelIds' | 'assignees' | 'statuses' | 'leadPhases' | 'tagIds' | 'excludeTagIds' | 'stageIds' | 'lostReasons';

function itemChip(field: ListKey, id: string, label: string, color?: string): ActiveFilterChip {
  return {
    key: `${field === 'tagIds' ? 'tag' : field}:${id}`,
    label,
    ...(color ? { color } : {}),
    clear: (s) => ({ ...s, [field]: without(s[field], id) }),
  };
}

function simpleChip(key: string, label: string, patch: Partial<InboxFilterState>): ActiveFilterChip {
  return { key, label, clear: (s) => ({ ...s, ...patch }) };
}

export function idleLabel(hours: number): string {
  if (hours <= HOURS_PER_DAY) return `+${hours}h`;
  const days = Math.round(hours / HOURS_PER_DAY);
  return `+${days} ${days === 1 ? 'dia' : 'dias'}`;
}

function assigneeLabel(id: string, lookups: FilterLookups): string {
  if (id === ASSIGNEE_ME) return 'Atribuídas a mim';
  if (id === ASSIGNEE_NONE) return 'Sem atendente';
  return `Atendente: ${nameOf(lookups.members, id)}`;
}

function kindChip(s: InboxFilterState): ActiveFilterChip[] {
  if (s.individualOnly && !s.groupsOnly) return [];
  const label = s.groupsOnly && !s.individualOnly ? 'Só grupos' : 'Individuais e grupos';
  return [simpleChip('kind', label, { individualOnly: true, groupsOnly: false })];
}

function toggleChips(s: InboxFilterState): ActiveFilterChip[] {
  return [
    ...(s.unreadOnly ? [simpleChip('unread', 'Não lidas', { unreadOnly: false })] : []),
    ...(s.archivedOnly ? [simpleChip('archived', 'Arquivadas', { archivedOnly: false })] : []),
    ...kindChip(s),
  ];
}

function scopeChips(s: InboxFilterState, l: FilterLookups): ActiveFilterChip[] {
  return [
    ...s.channelIds.map((id) => itemChip('channelIds', id, `Canal: ${nameOf(l.channels, id)}`)),
    ...(s.segmentId ? [simpleChip('segment', `Setor: ${nameOf(l.segments, s.segmentId)}`, { segmentId: null })] : []),
    ...s.assignees.map((id) => itemChip('assignees', id, assigneeLabel(id, l))),
    ...s.statuses.map((st) =>
      itemChip('statuses', st, STATUS_LABELS[st as ConversationStatusFilter] ?? st),
    ),
    ...s.leadPhases.map((p: LeadPhaseFilter) => itemChip('leadPhases', p, LEAD_PHASE_LABELS[p])),
  ];
}

function tagChips(s: InboxFilterState, l: FilterLookups): ActiveFilterChip[] {
  const included = s.tagIds.map((id) => {
    const tag = l.tags.find((t) => t.id === id);
    return itemChip('tagIds', id, tag?.name ?? 'Etiqueta', tag?.color);
  });
  const matchAll =
    s.tagMatch === 'all' && s.tagIds.length > 1
      ? [simpleChip('tagMatch', 'Todas as etiquetas', { tagMatch: 'any' })]
      : [];
  const excluded = s.excludeTagIds.map((id) =>
    itemChip('excludeTagIds', id, `Sem etiqueta: ${nameOf(l.tags, id)}`),
  );
  return [...included, ...matchAll, ...excluded];
}

function lostChips(s: InboxFilterState): ActiveFilterChip[] {
  if (s.lost === 'exclude') return [simpleChip('lost', 'Sem venda perdida', { lost: 'any' })];
  if (s.lost !== 'only') return [];
  if (s.lostReasons.length === 0) {
    return [simpleChip('lost', 'Venda perdida', { lost: 'any', lostReasons: [] })];
  }
  return s.lostReasons.map((code) =>
    itemChip('lostReasons', code, `Venda perdida: ${lostReasonLabel(code)}`),
  );
}

function advancedChips(s: InboxFilterState, l: FilterLookups): ActiveFilterChip[] {
  const origin = s.origin === 'ad' ? 'Veio de anúncio' : 'Sem anúncio';
  return [
    ...s.stageIds.map((id) => itemChip('stageIds', id, `Etapa: ${nameOf(l.stages, id)}`)),
    ...lostChips(s),
    ...(s.origin !== 'any' ? [simpleChip('origin', origin, { origin: 'any' })] : []),
    ...(s.idleHours ? [simpleChip('idle', `Parado há ${idleLabel(s.idleHours)}`, { idleHours: null })] : []),
  ];
}

function dateChips(s: InboxFilterState): ActiveFilterChip[] {
  if (s.dateRange === 'ALL') return [];
  const prefix = s.dateField === 'created' ? 'Criada: ' : '';
  return [
    simpleChip('date', `${prefix}${DATE_RANGE_LABELS[s.dateRange]}`, {
      dateRange: 'ALL',
      dateFrom: '',
      dateTo: '',
      dateField: DEFAULT_FILTERS.dateField,
    }),
  ];
}

function projectChips(s: InboxFilterState): ActiveFilterChip[] {
  return [
    ...(s.projectStatus ? [simpleChip('project', `Projeto: ${s.projectStatus}`, { projectStatus: '' })] : []),
    ...(s.mineProjects ? [simpleChip('mineProjects', 'Meus projetos', { mineProjects: false })] : []),
  ];
}

/** Lista dos filtros ativos, na ordem em que aparecem na linha de chips. */
export function describeActiveFilters(
  state: InboxFilterState,
  lookups: FilterLookups,
): ActiveFilterChip[] {
  return [
    ...toggleChips(state),
    ...tagChips(state, lookups),
    ...scopeChips(state, lookups),
    ...advancedChips(state, lookups),
    ...dateChips(state),
    ...projectChips(state),
  ];
}

/** Um por chip: cada etiqueta conta 1; Individual/Grupo só fora do padrão. */
export function countActiveFilters(state: InboxFilterState): number {
  return describeActiveFilters(state, EMPTY_LOOKUPS).length;
}
