import {
  ASSIGNEE_ME,
  ASSIGNEE_NONE,
  type FilterContext,
  type InboxFilterState,
} from './inbox-filter-types';

type Params = Record<string, string>;

const DAY_MS = 24 * 60 * 60 * 1000;
const PRESET_DAYS: Record<string, number> = { '7D': 7, '30D': 30 };
/** Token de "sem atendente" que a API entende em ?assignedToId=. */
const API_UNASSIGNED = 'none';

function localDateIso(date: string, time: string): string | undefined {
  if (!date) return undefined;
  const d = new Date(`${date}T${time}`);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

/** Resolve o preset de Data em ISO { from, to } relativo a `now`. */
export function resolveDateRange(
  state: InboxFilterState,
  now: Date,
): { from?: string; to?: string } {
  if (state.dateRange === 'TODAY') {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return { from: start.toISOString() };
  }
  const days = PRESET_DAYS[state.dateRange];
  if (days) return { from: new Date(now.getTime() - days * DAY_MS).toISOString() };
  if (state.dateRange !== 'RANGE') return {};
  const from = localDateIso(state.dateFrom, '00:00:00');
  const to = localDateIso(state.dateTo, '23:59:59.999');
  return { ...(from ? { from } : {}), ...(to ? { to } : {}) };
}

/**
 * archived: "Arquivadas" marcado manda; buscando abre tudo; fora de view
 * esconde as arquivadas; dentro de view respeita a view.
 */
function archivedParams(state: InboxFilterState, ctx: FilterContext): Params {
  if (state.archivedOnly) return { archived: 'only' };
  if (ctx.isSearching) return { archived: 'any' };
  return ctx.viewId ? {} : { archived: 'exclude' };
}

function kindParam(state: InboxFilterState, viewId: string | null): Params {
  const wantIndividual = state.individualOnly && !state.groupsOnly;
  const wantGroupsOnly = state.groupsOnly && !state.individualOnly;
  // Dentro de view só sobrescrevemos para grupos; o resto respeita a view.
  if (wantGroupsOnly) return { groups: 'only' };
  if (wantIndividual && !viewId) return { groups: 'exclude' };
  return {};
}

function channelParams(state: InboxFilterState, ctx: FilterContext): Params {
  const out: Params = {};
  if (state.channelIds.length === 1) out.channelId = state.channelIds[0];
  else if (state.channelIds.length > 1) out.channelIds = state.channelIds.join(',');
  if (ctx.channelTypes) out.channelTypes = ctx.channelTypes;
  return out;
}

/**
 * Setor e projeto unificam por grupo: forçam groups=only e ignoram o canal.
 * Setor tem precedência sobre projeto.
 */
function scopeParams(state: InboxFilterState, ctx: FilterContext): Params {
  if (state.segmentId) return { segmentId: state.segmentId, groups: 'only' };
  const mine = state.mineProjects && !!ctx.currentUserId;
  if (state.projectStatus || mine) {
    return {
      ...(state.projectStatus ? { projectStatus: state.projectStatus } : {}),
      ...(mine && ctx.currentUserId ? { responsibleUserId: ctx.currentUserId } : {}),
      groups: 'only',
    };
  }
  return { ...kindParam(state, ctx.viewId), ...channelParams(state, ctx) };
}

function resolveAssignee(value: string, currentUserId: string | null): string | null {
  if (value === ASSIGNEE_ME) return currentUserId;
  if (value === ASSIGNEE_NONE) return API_UNASSIGNED;
  return value;
}

/**
 * A rota de view repassa ?assignedToId= cru como um id só, então dentro de
 * view mandamos o filtro apenas quando ele resolve para um único usuário.
 */
function assigneeParams(state: InboxFilterState, ctx: FilterContext): Params {
  const resolved = state.assignees
    .map((a) => resolveAssignee(a, ctx.currentUserId))
    .filter((a): a is string => !!a);
  const unique = [...new Set(resolved)];
  if (unique.length === 0) return {};
  if (ctx.viewId && (unique.length > 1 || unique[0] === API_UNASSIGNED)) return {};
  return { assignedToId: unique.join(',') };
}

function tagParams(state: InboxFilterState): Params {
  const out: Params = {};
  if (state.tagIds.length > 0) {
    out.tagIds = state.tagIds.join(',');
    if (state.tagMatch === 'all') out.tagMode = 'all';
  }
  if (state.excludeTagIds.length > 0) out.excludeTagIds = state.excludeTagIds.join(',');
  return out;
}

function advancedParams(state: InboxFilterState): Params {
  const out: Params = {};
  if (state.statuses.length > 0) out.status = state.statuses.join(',');
  if (state.leadPhases.length > 0) out.phase = state.leadPhases.join(',');
  if (state.stageIds.length > 0) out.stageIds = state.stageIds.join(',');
  if (state.lost !== 'any') out.lost = state.lost;
  if (state.lost === 'only' && state.lostReasons.length > 0) {
    out.lostReasons = state.lostReasons.join(',');
  }
  if (state.origin !== 'any') out.origin = state.origin;
  if (state.idleHours) out.idleHours = String(state.idleHours);
  return out;
}

function dateParams(state: InboxFilterState, now: Date): Params {
  const { from, to } = resolveDateRange(state, now);
  const out: Params = {
    ...(from ? { dateFrom: from } : {}),
    ...(to ? { dateTo: to } : {}),
  };
  if ((from || to) && state.dateField === 'created') out.dateField = 'created';
  return out;
}

/**
 * Só os parâmetros de FILTRO da listagem. Aba, página, busca e o escopo
 * "Minhas conversas" ficam com quem chama.
 */
export function filtersToParams(state: InboxFilterState, ctx: FilterContext): Params {
  return {
    ...(state.unreadOnly ? { unread: 'true' } : {}),
    ...archivedParams(state, ctx),
    ...scopeParams(state, ctx),
    ...tagParams(state),
    ...advancedParams(state),
    ...assigneeParams(state, ctx),
    ...dateParams(state, ctx.now),
  };
}
