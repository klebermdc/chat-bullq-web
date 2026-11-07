import { LOST_REASONS } from '@/features/pipelines/lib/lost-reasons';
import {
  ASSIGNEE_ME,
  CONVERSATION_STATUSES,
  DATE_RANGE_PRESETS,
  DEFAULT_FILTERS,
  MAX_FILTER_LIST_ITEMS,
  MAX_IDLE_HOURS,
  type InboxFilterState,
} from './inbox-filter-types';

/**
 * Leitura do filtro salvo nas preferências. Tudo aqui é JSON vindo do
 * servidor (e escrito por versões antigas do app), então nada é confiável:
 * valor desconhecido cai no padrão.
 */

type Raw = Record<string, unknown>;

const LEGACY_ASSIGNED_TO_ME = '__ME__';
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const LOST_CODES: readonly string[] = LOST_REASONS.map((r) => r.code);

function isRecord(value: unknown): value is Raw {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringList(value: unknown, allowed?: readonly string[]): string[] {
  if (!Array.isArray(value)) return [];
  const strings = value.filter(
    (v): v is string => typeof v === 'string' && v.length > 0 && (!allowed || allowed.includes(v)),
  );
  return [...new Set(strings)].slice(0, MAX_FILTER_LIST_ITEMS);
}

function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.find((v) => v === value) ?? fallback;
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function optionalId(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function isoDay(value: unknown): string {
  return typeof value === 'string' && ISO_DAY.test(value) ? value : '';
}

function idleHours(value: unknown): number | null {
  const ok = typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= MAX_IDLE_HOURS;
  return ok ? value : null;
}

/** Valida um estado de filtro vindo de JSON (preferências ou atalhos). */
export function sanitizeFilters(raw: unknown): InboxFilterState {
  if (!isRecord(raw)) return DEFAULT_FILTERS;
  const d = DEFAULT_FILTERS;
  return {
    channelIds: stringList(raw.channelIds),
    segmentId: optionalId(raw.segmentId),
    assignees: stringList(raw.assignees),
    statuses: stringList(raw.statuses, CONVERSATION_STATUSES),
    tagIds: stringList(raw.tagIds),
    tagMatch: pick(raw.tagMatch, ['any', 'all'] as const, d.tagMatch),
    excludeTagIds: stringList(raw.excludeTagIds),
    stageIds: stringList(raw.stageIds),
    lost: pick(raw.lost, ['any', 'only', 'exclude'] as const, d.lost),
    lostReasons: stringList(raw.lostReasons, LOST_CODES),
    origin: pick(raw.origin, ['any', 'ad', 'organic'] as const, d.origin),
    idleHours: idleHours(raw.idleHours),
    dateRange: pick(raw.dateRange, DATE_RANGE_PRESETS, d.dateRange),
    dateFrom: isoDay(raw.dateFrom),
    dateTo: isoDay(raw.dateTo),
    dateField: pick(raw.dateField, ['lastMessage', 'created'] as const, d.dateField),
    projectStatus: typeof raw.projectStatus === 'string' ? raw.projectStatus : '',
    mineProjects: bool(raw.mineProjects, d.mineProjects),
    individualOnly: bool(raw.individualOnly, d.individualOnly),
    groupsOnly: bool(raw.groupsOnly, d.groupsOnly),
    unreadOnly: bool(raw.unreadOnly, d.unreadOnly),
    archivedOnly: bool(raw.archivedOnly, d.archivedOnly),
  };
}

/** Modelo novo (toggles independentes) vence; senão migra o showGroups antigo. */
function legacyKind(p: Raw): Pick<InboxFilterState, 'individualOnly' | 'groupsOnly'> {
  if (typeof p.individualOnly === 'boolean' || typeof p.groupsOnly === 'boolean') {
    return { individualOnly: bool(p.individualOnly, false), groupsOnly: bool(p.groupsOnly, false) };
  }
  if (typeof p.showGroups === 'boolean') return { individualOnly: !p.showGroups, groupsOnly: false };
  return { individualOnly: DEFAULT_FILTERS.individualOnly, groupsOnly: DEFAULT_FILTERS.groupsOnly };
}

function legacyAssignees(value: unknown): string[] {
  const id = optionalId(value);
  if (!id) return [];
  return [id === LEGACY_ASSIGNED_TO_ME ? ASSIGNEE_ME : id];
}

/** Converte as chaves planas antigas (antes do objeto `filters`). */
function fromLegacy(p: Raw): InboxFilterState {
  const channelId = optionalId(p.selectedChannelId);
  return sanitizeFilters({
    channelIds: channelId ? [channelId] : [],
    segmentId: p.selectedSegmentId,
    tagIds: p.tagIds,
    statuses: typeof p.selectedStatus === 'string' ? [p.selectedStatus] : [],
    assignees: legacyAssignees(p.selectedAssignedToId),
    dateRange: p.dateRange,
    dateFrom: p.dateFrom,
    dateTo: p.dateTo,
    projectStatus: p.selectedProjectStatus,
    mineProjects: p.mineProjects,
    unreadOnly: p.unreadOnly,
    archivedOnly: p.archivedOnly,
    ...legacyKind(p),
  });
}

/** Lê `prefs.filters` quando existe; senão migra as chaves antigas. */
export function filtersFromPreferences(prefs: unknown): InboxFilterState {
  if (!isRecord(prefs)) return DEFAULT_FILTERS;
  if ('filters' in prefs && prefs.filters !== undefined) return sanitizeFilters(prefs.filters);
  return fromLegacy(prefs);
}
