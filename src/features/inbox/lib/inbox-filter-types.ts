/**
 * Tipos e constantes do filtro da inbox. Fica num arquivo próprio para que
 * os módulos de parâmetros, armazenamento e chips não se importem em ciclo.
 */

/** Sentinela de "Eu" no filtro de atendente (resolvido para o usuário logado). */
export const ASSIGNEE_ME = '__ME__';
/** Sentinela de "Sem atendente" (vira `none` na URL). */
export const ASSIGNEE_NONE = '__NONE__';

export const CONVERSATION_STATUSES = ['PENDING', 'OPEN', 'WAITING', 'CLOSED'] as const;
export type ConversationStatusFilter = (typeof CONVERSATION_STATUSES)[number];

export const STATUS_LABELS: Record<ConversationStatusFilter, string> = {
  PENDING: 'Pendente',
  OPEN: 'Aberto',
  WAITING: 'Aguardando',
  CLOSED: 'Fechado',
};

export const DATE_RANGE_PRESETS = ['ALL', 'TODAY', '7D', '30D', 'RANGE'] as const;
export type DateRangePreset = (typeof DATE_RANGE_PRESETS)[number];

export const DATE_RANGE_LABELS: Record<DateRangePreset, string> = {
  ALL: 'Todos',
  TODAY: 'Hoje',
  '7D': '7 dias',
  '30D': '30 dias',
  RANGE: 'Intervalo',
};

export const HOURS_PER_DAY = 24;
/** Opções de "Parado há mais de", em horas. */
export const IDLE_HOURS_OPTIONS = [1, 4, 24, 3 * HOURS_PER_DAY, 7 * HOURS_PER_DAY] as const;
/** Mesmo teto da API: um ano. */
export const MAX_IDLE_HOURS = 365 * HOURS_PER_DAY;
/** Mesmo teto da API para listas na URL. */
export const MAX_FILTER_LIST_ITEMS = 100;

export type TagMatch = 'any' | 'all';
export type LostFilter = 'any' | 'only' | 'exclude';
export type OriginFilter = 'any' | 'ad' | 'organic';
export type DateField = 'lastMessage' | 'created';

export interface InboxFilterState {
  readonly channelIds: readonly string[];
  /** Setor — mutuamente exclusivo com canais no painel. */
  readonly segmentId: string | null;
  /** Ids de usuário + ASSIGNEE_ME / ASSIGNEE_NONE. */
  readonly assignees: readonly string[];
  readonly statuses: readonly string[];
  readonly tagIds: readonly string[];
  readonly tagMatch: TagMatch;
  readonly excludeTagIds: readonly string[];
  readonly stageIds: readonly string[];
  readonly lost: LostFilter;
  readonly lostReasons: readonly string[];
  readonly origin: OriginFilter;
  readonly idleHours: number | null;
  readonly dateRange: DateRangePreset;
  /** YYYY-MM-DD do <input type="date"> (só no preset RANGE). */
  readonly dateFrom: string;
  readonly dateTo: string;
  readonly dateField: DateField;
  readonly projectStatus: string;
  readonly mineProjects: boolean;
  readonly individualOnly: boolean;
  readonly groupsOnly: boolean;
  readonly unreadOnly: boolean;
  readonly archivedOnly: boolean;
}

/** Padrão: só individuais (grupos escondidos no inbox geral), nada mais. */
export const DEFAULT_FILTERS: InboxFilterState = Object.freeze({
  channelIds: [],
  segmentId: null,
  assignees: [],
  statuses: [],
  tagIds: [],
  tagMatch: 'any',
  excludeTagIds: [],
  stageIds: [],
  lost: 'any',
  lostReasons: [],
  origin: 'any',
  idleHours: null,
  dateRange: 'ALL',
  dateFrom: '',
  dateTo: '',
  dateField: 'lastMessage',
  projectStatus: '',
  mineProjects: false,
  individualOnly: true,
  groupsOnly: false,
  unreadOnly: false,
  archivedOnly: false,
});

/** Contexto da tela que muda como o filtro vira parâmetro. */
export interface FilterContext {
  currentUserId: string | null;
  viewId: string | null;
  isSearching: boolean;
  now: Date;
  channelTypes: string | null;
}
