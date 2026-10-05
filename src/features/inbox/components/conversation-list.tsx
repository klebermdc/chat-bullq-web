'use client';

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import {
  MessageSquare,
  Search,
  X,
  SlidersHorizontal,
  Check,
  UserCheck,
  XCircle,
  RotateCcw,
  Loader2,
  ChevronDown,
  Users,
  User,
  FolderPlus,
  MailOpen,
  Archive,
  Plus,
  CalendarClock,
  TriangleAlert,
  Hourglass,
  Clock,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Popover,
  PopoverButton,
  PopoverPanel,
} from '@headlessui/react';
import {
  inboxService,
  type Conversation,
  type ConversationTab,
} from '../services/inbox.service';
import { NewConversationDialog } from './new-conversation-dialog';
import {
  computeWindowState,
  formatWindowLeft,
  windowUrgency,
  windowKindLabel,
} from '../lib/window-state';
import {
  waitingMs,
  waitLevel,
  waitLabel,
  WAIT_SPINE_CLASS,
} from '../lib/waiting-state';
import {
  inboxViewsService,
  type InboxView,
} from '@/features/inbox-views/services/inbox-views.service';
import { channelsService } from '@/features/channels/services/channels.service';
import { segmentsService } from '@/features/segments/services/segments.service';
import { tagsService } from '@/features/settings/services/tags.service';
import { membersService } from '@/features/settings/services/members.service';
import {
  InboxFilterPanel,
  ASSIGNED_TO_ME,
  type DateRangePreset,
} from './inbox-filter-panel';
import { ZappfyIcon, WasenderIcon, MetaIcon, InstagramIcon } from '@/components/ui/icons';
import { Badge } from '@/components/ui/badge';
import { StageChip, TagChip } from '@/components/ui/tag-chip';
import { getInitials } from '@/lib/initials';
import { messageTypeLabel } from '../lib/message-preview';
import { tagColor } from '@/lib/origin-tag-colors';
import { useOrgId } from '@/hooks/use-org-query-key';
import { useSocket } from '../hooks/use-socket';
import { useAuthStore } from '@/stores/auth-store';
import { useInboxPreferences } from '../hooks/use-inbox-preferences';
import { ConversationContextMenu } from './conversation-context-menu';
import { BulkAiPopover } from './bulk-ai-popover';
import { BulkPipelinePopover } from './bulk-pipeline-popover';
import { usePermissions } from '@/lib/permissions';
import { pipelinesService } from '@/features/pipelines/services/pipelines.service';
import { getErrorMessage } from '@/lib/errors';

function ListAvatar({ name, avatarUrl }: { name: string | null; avatarUrl: string | null }) {
  const [failed, setFailed] = useState(false);
  const initials = getInitials(name);
  if (avatarUrl && !failed) {
    return (
      <img
        src={avatarUrl}
        alt={name || 'avatar'}
        onError={() => setFailed(true)}
        className="size-16 rounded-full bg-muted object-cover"
      />
    );
  }
  // Sem foto: iniciais sobre lilás (antes era cinza) — 64px, letra ~36% do círculo.
  return (
    <div className="flex size-16 items-center justify-center rounded-full bg-primary/15 text-[22px] font-bold text-primary">
      {initials || <User aria-hidden="true" className="h-6 w-6" />}
    </div>
  );
}

/** Anel de foco único da lista — visível nos dois temas. */
const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

/**
 * Chip de filtro ativo. O "x" é pequeno no desenho, mas a área de toque tem
 * 28px (acima do mínimo da WCAG 2.2) e o nome do filtro vai no rótulo do botão.
 */
function FilterChip({
  label,
  count,
  onRemove,
}: {
  label: string;
  count?: number;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex h-7 shrink-0 items-center gap-1 rounded-full bg-primary/10 pl-3 text-xs font-semibold text-primary">
      {label}
      {count !== undefined && (
        <span className="rounded-full bg-primary px-1.5 py-[3px] font-mono text-[11px] font-bold tabular-nums leading-none text-primary-foreground">
          {count}
        </span>
      )}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remover filtro ${label}`}
        title={`Remover filtro ${label}`}
        className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors hover:bg-primary/20 ${FOCUS_RING}`}
      >
        <X aria-hidden="true" className="h-3.5 w-3.5" />
      </button>
    </span>
  );
}

const ATTENDANCE_TABS: { value: ConversationTab; label: string }[] = [
  { value: 'inbox', label: 'Entrada' },
  { value: 'waiting', label: 'Esperando' },
  { value: 'closed', label: 'Finalizados' },
];

const CONVERSATION_LIST_ID = 'inbox-conversation-list';

type ScopeFilter = 'ALL' | 'MINE';

const scopeOptions: { label: string; value: ScopeFilter; icon: React.ElementType }[] = [
  { label: 'Todas as conversas', value: 'ALL', icon: Users },
  { label: 'Minhas conversas', value: 'MINE', icon: User },
];

const channelIcons: Record<string, React.ElementType> = {
  WHATSAPP_ZAPPFY: ZappfyIcon,
  WHATSAPP_WASENDER: WasenderIcon,
  WHATSAPP_OFFICIAL: MetaIcon,
  INSTAGRAM: InstagramIcon,
};

const statusColors: Record<string, string> = {
  PENDING: 'bg-amber-400',
  OPEN: 'bg-emerald-400',
  BOT: 'bg-blue-400',
  WAITING: 'bg-violet-400',
  CLOSED: 'bg-zinc-300 dark:bg-zinc-600',
};

const STATUS_DOT_LABELS: Record<string, string> = {
  PENDING: 'Pendente',
  OPEN: 'Em atendimento',
  BOT: 'Com a IA',
  WAITING: 'Aguardando cliente',
  CLOSED: 'Finalizada',
};

/** Quantas tags cabem na linha antes de virar "+N" — mantém a altura estável. */
const MAX_ROW_TAGS = 2;

/**
 * Fase do lead na fila. A cor de fundo da linha já dizia isso, mas só por cor;
 * o rótulo curto torna a fase legível sem legenda (e para quem não distingue
 * as três cores).
 *
 * Os tints subiram um degrau (50 → 100 no claro, /10 → /15 no escuro) para
 * não se confundirem com o lilás da linha selecionada nem com o branco.
 */
const LEAD_PHASE = {
  sdr: {
    label: 'Com a IA',
    row: 'bg-blue-100 hover:bg-blue-200/70 dark:bg-blue-400/15 dark:hover:bg-blue-400/20',
    text: 'text-blue-700 dark:text-blue-300',
  },
  queue: {
    label: 'Na fila',
    row: 'bg-pink-100 hover:bg-pink-200/70 dark:bg-pink-400/15 dark:hover:bg-pink-400/20',
    text: 'text-pink-700 dark:text-pink-300',
  },
  start: {
    label: 'Iniciar atendimento',
    row: 'bg-emerald-100 hover:bg-emerald-200/70 dark:bg-emerald-400/15 dark:hover:bg-emerald-400/20',
    text: 'text-emerald-700 dark:text-emerald-300',
  },
} as const;

const STATUS_CHIP_LABELS: Record<string, string> = {
  PENDING: 'Pendente',
  OPEN: 'Aberto',
  WAITING: 'Aguardando',
  CLOSED: 'Fechado',
};

const DATE_CHIP_LABELS: Record<string, string> = {
  TODAY: 'Hoje',
  '7D': '7 dias',
  '30D': '30 dias',
  RANGE: 'Intervalo',
};

type ListFilter = 'unread' | 'archived';

const filterOptions: { label: string; value: ListFilter; icon: React.ElementType; description: string }[] = [
  {
    label: 'Não lidas',
    value: 'unread',
    icon: MailOpen,
    description: 'Apenas com mensagens novas',
  },
  {
    label: 'Arquivadas',
    value: 'archived',
    icon: Archive,
    description: 'Mostra a inbox arquivada',
  },
];

interface ConversationListProps {
  activeId: string | null;
  onSelect: (conversation: Conversation) => void;
  /**
   * When set, fetches conversations through the inbox view endpoint
   * (`/inbox-views/:id/conversations`) which applies the view's saved
   * filters server-side. The user's local filters (status/channel/scope)
   * still layer on top via query params.
   */
  viewId?: string | null;
  /** Trava a lista em TIPOS de canal (ex.: 'INSTAGRAM', ou os três sabores
   *  de WhatsApp). Não é o filtro de canal do usuário — é o escopo da
   *  página, e o servidor reforça a parte de permissão. */
  channelTypes?: string | null;
}

export function ConversationList({ activeId, onSelect, viewId, channelTypes }: ConversationListProps) {
  // O anel da janela e a espinha de espera contam tempo, então precisam de um
  // "agora" que ande sozinho — sem isso só mudariam a cada refetch. Um minuto
  // é a menor unidade que a lista mostra.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  const queryClient = useQueryClient();
  const orgId = useOrgId();
  const { on, onReconnect } = useSocket();
  const currentUserId = useAuthStore((s) => s.user?.id ?? null);
  // Role vem da org ativa (OWNER/ADMIN/AGENT). Pra AGENT, o filtro de
  // Atendente é um no-op visual (RN-05 é server-side) — desabilitamos a linha.
  const currentRole = useAuthStore(
    (s) => s.organizations.find((o) => o.id === s.activeOrgId)?.role ?? null,
  );
  const { can } = usePermissions();
  const {
    preferences: savedPrefs,
    isLoaded: prefsLoaded,
    update: updatePrefs,
  } = useInboxPreferences();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [archivedOnly, setArchivedOnly] = useState(false);
  // Individual / Grupo são toggles INDEPENDENTES. Nenhum marcado = mostra
  // tudo (individuais + grupos). Default: só individuais (regra do JP —
  // grupos escondidos no inbox geral), mas dá pra desmarcar agora.
  const [individualOnly, setIndividualOnly] = useState(true);
  const [groupsOnly, setGroupsOnly] = useState(false);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [selectedProjectStatus, setSelectedProjectStatus] = useState('');
  const [mineProjects, setMineProjects] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  // Aba de atendimento (segmented control acima da lista). Só no inbox padrão
  // (fora de saved views). Default "Esperando" = fila do que precisa de resposta.
  const [tab, setTab] = useState<ConversationTab>('waiting');
  // Novas dimensões do painel unificado.
  const [selectedStatus, setSelectedStatus] = useState('');
  // null = sem filtro; ASSIGNED_TO_ME = resolve pro currentUserId; senão userId.
  const [selectedAssignedToId, setSelectedAssignedToId] = useState<string | null>(
    null,
  );
  const [dateRange, setDateRange] = useState<DateRangePreset>('ALL');
  // Datas do preset RANGE — strings YYYY-MM-DD dos <input type="date">.
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  // O filtro Individual/Grupo conta como ativo quando difere do default
  // (só individuais). Nenhum marcado (mostra tudo) ou só grupos → badge.
  // Tags contam 1 por tag.
  const kindIsDefault = individualOnly && !groupsOnly;
  const activeFilterCount =
    (unreadOnly ? 1 : 0) +
    (archivedOnly ? 1 : 0) +
    (kindIsDefault ? 0 : 1) +
    (selectedProjectStatus ? 1 : 0) +
    (mineProjects ? 1 : 0) +
    (selectedStatus ? 1 : 0) +
    (selectedAssignedToId ? 1 : 0) +
    (dateRange !== 'ALL' ? 1 : 0) +
    // Canal e segmento ficam salvos nas preferências: sem contar aqui, o
    // filtro de ontem escondia conversas hoje sem nenhum sinal na tela.
    (selectedChannelId ? 1 : 0) +
    (selectedSegmentId ? 1 : 0) +
    selectedTagIds.length;
  const [scope, setScope] = useState<ScopeFilter>('ALL');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  // Com "Arquivadas" marcado o usuário já escolheu um escopo estreito à mão —
  // aí a busca não o alarga e o aviso não cabe.
  const isSearchScopeWidened = debouncedSearch.trim().length > 0 && !archivedOnly;
  const hydratedRef = useRef(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    conversation: Conversation;
    position: { x: number; y: number };
  } | null>(null);
  const [newConversationOpen, setNewConversationOpen] = useState(false);

  // Hydrate state from saved preferences once they load
  useEffect(() => {
    if (!prefsLoaded || hydratedRef.current) return;
    hydratedRef.current = true;
    if (savedPrefs.scope === 'MINE' || savedPrefs.scope === 'ALL') {
      setScope(savedPrefs.scope);
    }
    if (typeof savedPrefs.unreadOnly === 'boolean') {
      setUnreadOnly(savedPrefs.unreadOnly);
    }
    if (typeof savedPrefs.archivedOnly === 'boolean') {
      setArchivedOnly(savedPrefs.archivedOnly);
    }
    // Modelo novo (toggles independentes) tem precedência; senão migra do
    // showGroups antigo (false → só individuais; true → mostra tudo).
    if (
      typeof savedPrefs.individualOnly === 'boolean' ||
      typeof savedPrefs.groupsOnly === 'boolean'
    ) {
      setIndividualOnly(savedPrefs.individualOnly ?? false);
      setGroupsOnly(savedPrefs.groupsOnly ?? false);
    } else if (typeof savedPrefs.showGroups === 'boolean') {
      setIndividualOnly(!savedPrefs.showGroups);
      setGroupsOnly(false);
    }
    if (savedPrefs.selectedChannelId !== undefined) {
      setSelectedChannelId(savedPrefs.selectedChannelId ?? null);
    }
    if (savedPrefs.selectedSegmentId !== undefined) {
      setSelectedSegmentId(savedPrefs.selectedSegmentId ?? null);
    }
    if (typeof savedPrefs.selectedProjectStatus === 'string') {
      setSelectedProjectStatus(savedPrefs.selectedProjectStatus);
    }
    if (typeof savedPrefs.mineProjects === 'boolean') {
      setMineProjects(savedPrefs.mineProjects);
    }
    if (Array.isArray(savedPrefs.tagIds)) {
      setSelectedTagIds(savedPrefs.tagIds);
    }
    if (typeof savedPrefs.selectedStatus === 'string') {
      setSelectedStatus(savedPrefs.selectedStatus);
    }
    if (savedPrefs.selectedAssignedToId !== undefined) {
      setSelectedAssignedToId(savedPrefs.selectedAssignedToId ?? null);
    }
    if (typeof savedPrefs.dateRange === 'string') {
      setDateRange(savedPrefs.dateRange as DateRangePreset);
    }
    if (savedPrefs.dateFrom !== undefined && savedPrefs.dateFrom !== null) {
      setDateFrom(savedPrefs.dateFrom);
    }
    if (savedPrefs.dateTo !== undefined && savedPrefs.dateTo !== null) {
      setDateTo(savedPrefs.dateTo);
    }
  }, [prefsLoaded, savedPrefs]);

  const toggleListFilter = useCallback(
    (value: ListFilter) => {
      if (value === 'unread') {
        setUnreadOnly((v) => {
          const next = !v;
          updatePrefs({ unreadOnly: next });
          return next;
        });
      } else if (value === 'archived') {
        setArchivedOnly((v) => {
          const next = !v;
          updatePrefs({ archivedOnly: next });
          return next;
        });
      }
    },
    [updatePrefs],
  );

  const toggleIndividual = useCallback(() => {
    setIndividualOnly((v) => {
      const next = !v;
      updatePrefs({ individualOnly: next });
      return next;
    });
  }, [updatePrefs]);

  const toggleGroups = useCallback(() => {
    setGroupsOnly((v) => {
      const next = !v;
      updatePrefs({ groupsOnly: next });
      return next;
    });
  }, [updatePrefs]);

  const clearListFilters = useCallback(() => {
    setUnreadOnly(false);
    setArchivedOnly(false);
    setIndividualOnly(true);
    setGroupsOnly(false);
    setSelectedTagIds([]);
    setSelectedProjectStatus('');
    setMineProjects(false);
    setSelectedStatus('');
    setSelectedAssignedToId(null);
    setDateRange('ALL');
    setDateFrom('');
    setDateTo('');
    setSelectedChannelId(null);
    setSelectedSegmentId(null);
    updatePrefs({
      selectedChannelId: null,
      selectedSegmentId: null,
      unreadOnly: false,
      archivedOnly: false,
      individualOnly: true,
      groupsOnly: false,
      tagIds: [],
      selectedProjectStatus: '',
      mineProjects: false,
      selectedStatus: '',
      selectedAssignedToId: null,
      dateRange: 'ALL',
      dateFrom: null,
      dateTo: null,
    });
  }, [updatePrefs]);

  const handleStatusChange = useCallback(
    (value: string) => {
      setSelectedStatus(value);
      updatePrefs({ selectedStatus: value });
    },
    [updatePrefs],
  );

  const handleTabChange = useCallback((next: ConversationTab) => {
    setTab(next);
    // Seleção múltipla é por aba — trocar de aba limpa a seleção pendente.
    setSelectedIds(new Set());
    setLastClickedIndex(null);
  }, []);

  const handleAssignedToChange = useCallback(
    (value: string | null) => {
      const next = value || null;
      setSelectedAssignedToId(next);
      updatePrefs({ selectedAssignedToId: next });
    },
    [updatePrefs],
  );

  const handleDateRangeChange = useCallback(
    (preset: DateRangePreset) => {
      setDateRange(preset);
      updatePrefs({ dateRange: preset });
    },
    [updatePrefs],
  );

  const handleDateFromChange = useCallback(
    (value: string) => {
      setDateFrom(value);
      updatePrefs({ dateFrom: value || null });
    },
    [updatePrefs],
  );

  const handleDateToChange = useCallback(
    (value: string) => {
      setDateTo(value);
      updatePrefs({ dateTo: value || null });
    },
    [updatePrefs],
  );

  const handleProjectStatusChange = useCallback(
    (value: string) => {
      setSelectedProjectStatus(value);
      updatePrefs({ selectedProjectStatus: value });
    },
    [updatePrefs],
  );

  const toggleMineProjects = useCallback(() => {
    setMineProjects((v) => {
      const next = !v;
      updatePrefs({ mineProjects: next });
      return next;
    });
  }, [updatePrefs]);

  const toggleTagFilter = useCallback(
    (tagId: string) => {
      setSelectedTagIds((prev) => {
        const next = prev.includes(tagId)
          ? prev.filter((id) => id !== tagId)
          : [...prev, tagId];
        updatePrefs({ tagIds: next });
        return next;
      });
    },
    [updatePrefs],
  );

  const handleScopeChange = useCallback(
    (next: ScopeFilter) => {
      setScope(next);
      updatePrefs({ scope: next });
    },
    [updatePrefs],
  );

  const handleChannelChange = useCallback(
    (next: string | null) => {
      // Canal e segmento são mutuamente exclusivos no seletor.
      setSelectedChannelId(next);
      setSelectedSegmentId(null);
      updatePrefs({ selectedChannelId: next, selectedSegmentId: null });
    },
    [updatePrefs],
  );

  const handleSegmentChange = useCallback(
    (next: string | null) => {
      setSelectedSegmentId(next);
      setSelectedChannelId(null);
      updatePrefs({ selectedSegmentId: next, selectedChannelId: null });
    },
    [updatePrefs],
  );

  const tagsKey = useMemo(
    () => [...selectedTagIds].sort().join(','),
    [selectedTagIds],
  );
  const filterKey = `tab:${tab}|${unreadOnly ? 'u' : ''}|${archivedOnly ? 'a' : ''}|${individualOnly ? 'i' : ''}${groupsOnly ? 'g' : ''}|ps:${selectedProjectStatus}|mp:${mineProjects ? '1' : ''}|t:${tagsKey}|st:${selectedStatus}|at:${selectedAssignedToId ?? ''}|dr:${dateRange}|df:${dateFrom}|dt:${dateTo}`;

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedSearch(value), 300);
  }, []);

  useEffect(() => {
    return () => clearTimeout(debounceTimer.current);
  }, []);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const { data: channels = [] } = useQuery({
    queryKey: ['channels', orgId],
    queryFn: () => channelsService.list(),
  });

  const { data: tags = [] } = useQuery({
    queryKey: ['tags', orgId],
    queryFn: () => tagsService.list(),
  });

  const { data: segments = [] } = useQuery({
    queryKey: ['segments', orgId],
    queryFn: () => segmentsService.list(),
  });

  const { data: members = [] } = useQuery({
    queryKey: ['org-members'],
    queryFn: () => membersService.list(),
    staleTime: 60_000,
  });

  // Drop selected tag ids that no longer exist (tag deleted in another tab).
  // Avoid sending stale ids to the backend — they'd just match nothing.
  useEffect(() => {
    if (!tags.length || !selectedTagIds.length) return;
    const valid = new Set(tags.map((t) => t.id));
    const filtered = selectedTagIds.filter((id) => valid.has(id));
    if (filtered.length !== selectedTagIds.length) {
      setSelectedTagIds(filtered);
      updatePrefs({ tagIds: filtered });
    }
  }, [tags, selectedTagIds, updatePrefs]);

  // Resolve o preset de Data em ISO { from, to }. Roda client-side, então
  // Date.now()/new Date() são seguros aqui. Backend filtra por lastMessageAt
  // (gte from / lte to). filterKey já inclui dateRange/from/to, então o
  // recompute do memo casa com a chave de cache.
  const resolvedDate = useMemo((): { from?: string; to?: string } => {
    const now = new Date();
    if (dateRange === 'TODAY') {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      return { from: start.toISOString() };
    }
    if (dateRange === '7D') {
      return {
        from: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      };
    }
    if (dateRange === '30D') {
      return {
        from: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      };
    }
    if (dateRange === 'RANGE') {
      const out: { from?: string; to?: string } = {};
      if (dateFrom) {
        const d = new Date(`${dateFrom}T00:00:00`);
        if (!Number.isNaN(d.getTime())) out.from = d.toISOString();
      }
      if (dateTo) {
        const d = new Date(`${dateTo}T23:59:59.999`);
        if (!Number.isNaN(d.getTime())) out.to = d.toISOString();
      }
      return out;
    }
    return {};
  }, [dateRange, dateFrom, dateTo]);

  // Reset scroll when filters/search change
  useEffect(() => {
    scrollContainerRef.current?.scrollTo({ top: 0 });
  }, [filterKey, debouncedSearch, selectedChannelId, selectedSegmentId, scope, individualOnly, groupsOnly, tagsKey]);

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['conversations', orgId, channelTypes ?? null, viewId ?? null, filterKey, debouncedSearch, selectedChannelId, selectedSegmentId, scope, currentUserId, selectedStatus, selectedAssignedToId, dateRange, dateFrom, dateTo],
    queryFn: ({ pageParam = 1 }) => {
      const params: Record<string, string> = { limit: '30', page: String(pageParam) };
      if (unreadOnly) params.unread = 'true';
      // Buscar é justamente procurar o que NÃO está na sua fila. Com termo
      // digitado o escopo abre: arquivadas entram e a aba sai (ela exclui as
      // finalizadas, e lead antigo quase sempre está finalizado — era por isso
      // que a busca não achava). Filtro marcado à mão continua mandando.
      const isSearching = debouncedSearch.trim().length > 0;
      // archived: dentro de view, só passa quando user explicitamente
      // ativou (override). Fora de view, passa sempre o estado atual.
      if (archivedOnly) params.archived = 'only';
      else if (isSearching) params.archived = 'any';
      else if (!viewId) params.archived = 'exclude';
      // Filtros que unificam por grupo (segmento OU projeto) — são sempre
      // grupos: força groups=only e ignora o filtro de canal. Segmento tem
      // precedência se ambos estiverem ativos.
      const hasProjectFilter =
        !!selectedProjectStatus || (mineProjects && !!currentUserId);
      if (selectedSegmentId) {
        params.segmentId = selectedSegmentId;
        params.groups = 'only';
      } else if (hasProjectFilter) {
        if (selectedProjectStatus) params.projectStatus = selectedProjectStatus;
        if (mineProjects && currentUserId)
          params.responsibleUserId = currentUserId;
        params.groups = 'only';
      } else {
        // Individual/Grupo são toggles independentes:
        //   só Individual  → groups=exclude (esconde grupos)
        //   só Grupo       → groups=only    (apenas grupos)
        //   ambos / nenhum → sem param (mostra tudo)
        // Dentro de view a semântica é a mesma; nenhum marcado respeita o
        // filtro salvo da view (não faz override).
        const wantIndividual = individualOnly && !groupsOnly;
        const wantGroupsOnly = groupsOnly && !individualOnly;
        if (viewId) {
          // Dentro de view só sobrescrevemos pra 'only' (grupos) — o resto
          // respeita o filtro salvo da view, como antes.
          if (wantGroupsOnly) params.groups = 'only';
        } else {
          if (wantIndividual) params.groups = 'exclude';
          else if (wantGroupsOnly) params.groups = 'only';
        }
        if (selectedChannelId) params.channelId = selectedChannelId;
        if (channelTypes) params.channelTypes = channelTypes;
      }
      if (debouncedSearch) params.search = debouncedSearch;
      if (selectedTagIds.length > 0) params.tagIds = selectedTagIds.join(',');
      // Aba de atendimento — só no inbox padrão. Saved views têm semântica
      // própria e não usam as abas. Durante a busca a aba não vai: ela
      // esconderia justamente as conversas finalizadas que se está procurando.
      if (!viewId && !isSearching) params.tab = tab;
      // Status da conversa (PENDING/OPEN/WAITING/CLOSED). Backend ignora
      // valores inválidos, então '' = todos.
      if (selectedStatus) params.status = selectedStatus;
      // Atendente tem precedência sobre o scope MINE. UM único writer de
      // assignedToId: se o filtro de Atendente está setado, ele manda;
      // senão cai no comportamento antigo do scope. ASSIGNED_TO_ME resolve
      // pro usuário atual.
      const resolvedAssignee =
        selectedAssignedToId === ASSIGNED_TO_ME
          ? currentUserId
          : selectedAssignedToId;
      if (resolvedAssignee) {
        params.assignedToId = resolvedAssignee;
      } else if (scope === 'MINE' && currentUserId) {
        params.assignedToId = currentUserId;
      }
      // Data — presets/intervalo já resolvidos em ISO.
      if (resolvedDate.from) params.dateFrom = resolvedDate.from;
      if (resolvedDate.to) params.dateTo = resolvedDate.to;
      if (viewId) {
        return inboxViewsService.getConversations(viewId, params);
      }
      return inboxService.getConversations(params);
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.pagination;
      return page < totalPages ? page + 1 : undefined;
    },
    // Realtime (message:new / conversation:updated) drives updates — keep a
    // slow safety-net poll to cover transient socket drops.
    refetchInterval: 60000,
    staleTime: 15000,
  });

  const conversations = useMemo(
    () => data?.pages.flatMap((p) => p.conversations) || [],
    [data],
  );

  // Contadores das abas de atendimento (badges). Escopado pelo canal do topbar,
  // igual à lista. Só no inbox padrão. Realtime invalida via socket effect abaixo.
  const { data: tabCounts } = useQuery({
    queryKey: ['conversation-tab-counts', orgId, selectedChannelId ?? null],
    queryFn: () => inboxService.getTabCounts(selectedChannelId),
    enabled: !viewId && !!orgId,
    refetchInterval: 60000,
    staleTime: 15000,
  });

  // Total count from the paginated response — same value across pages
  // (it's the count(where) from Postgres). Used to show "Não lidas (N)"
  // in the active filter chip.
  const totalCount = data?.pages?.[0]?.pagination?.total ?? 0;

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { root: scrollContainerRef.current, rootMargin: '200px' },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setLastClickedIndex(null);
  }, []);

  const handleConversationClick = useCallback(
    (conv: Conversation, index: number, e: React.MouseEvent) => {
      if (e.shiftKey) {
        e.preventDefault();
        setSelectedIds((prev) => {
          const next = new Set(prev);
          if (lastClickedIndex !== null && conversations.length > 0) {
            const start = Math.min(lastClickedIndex, index);
            const end = Math.max(lastClickedIndex, index);
            for (let i = start; i <= end; i++) {
              next.add(conversations[i].id);
            }
          } else {
            next.add(conv.id);
          }
          return next;
        });
        setLastClickedIndex(index);
        return;
      }

      if (selectedIds.size > 0) {
        clearSelection();
      }
      onSelect(conv);
      setLastClickedIndex(index);

      // Mark as read on click. Optimistic: zero the local counter
      // immediately so the badge disappears before the API roundtrip;
      // backend then emits conversation:read via socket which becomes
      // a no-op for this user (counter is already 0) but syncs other
      // tabs/devices logged into the same account.
      if ((conv.unreadCount ?? 0) > 0) {
        const lastMsgId = conv.messages?.[0]?.id;

        // When the current list filters by "unread only" — either via the
        // local toggle on the main inbox or via a saved view that pins
        // unreadOnly — the conversation we just opened is no longer a
        // member of the filtered set. Optimistically drop it from the
        // cached pages so the user sees it leave immediately, instead of
        // waiting for the next refetch.
        let dropFromList = false;
        if (viewId) {
          const cachedViews = queryClient.getQueryData<InboxView[]>([
            'inbox-views',
          ]);
          dropFromList =
            cachedViews?.find((v) => v.id === viewId)?.filters?.unreadOnly ===
            true;
        } else {
          dropFromList = unreadOnly;
        }

        queryClient.setQueriesData<any>(
          { queryKey: ['conversations'] },
          (old: any) => {
            if (!old?.pages) return old;
            return {
              ...old,
              pages: old.pages.map((p: any) => ({
                ...p,
                conversations: dropFromList
                  ? p.conversations.filter(
                      (c: Conversation) => c.id !== conv.id,
                    )
                  : p.conversations.map((c: Conversation) =>
                      c.id === conv.id ? { ...c, unreadCount: 0 } : c,
                    ),
                // Keep `total` honest when dropping — the unread badge in
                // the sidebar reads from it and would otherwise be stale.
                ...(dropFromList && p.pagination
                  ? {
                      pagination: {
                        ...p.pagination,
                        total: Math.max(0, (p.pagination.total ?? 1) - 1),
                      },
                    }
                  : {}),
              })),
            };
          },
        );
        inboxService.markAsRead(conv.id, lastMsgId).catch(() => {
          // Server rejected — refetch to roll back.
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
        });
      }
    },
    [
      lastClickedIndex,
      conversations,
      selectedIds.size,
      clearSelection,
      onSelect,
      queryClient,
      orgId,
      viewId,
      unreadOnly,
    ],
  );

  const toggleSelect = useCallback((id: string, index: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setLastClickedIndex(index);
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(conversations.map((c) => c.id)));
  }, [conversations]);

  const invalidateConversations = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['conversations'] });
  }, [queryClient]);

  // After "Nova conversa" creates a conversation, open it the same way
  // clicking an existing item in the list does — fetch it and hand it to
  // onSelect — then refresh the list so it shows up.
  const handleNewConversationCreated = useCallback(
    async (conversationId: string) => {
      invalidateConversations();
      try {
        const conv = await inboxService.getConversation(conversationId);
        onSelect(conv);
      } catch {
        // List still refreshed above — user can open it manually if this fails.
      }
    },
    [invalidateConversations, onSelect],
  );

  // Realtime: refresh list on inbound messages, imported conversations, or
  // state transitions (assign/close/reopen/transfer).
  useEffect(() => {
    // Toda transição que pode mudar a aba de uma conversa (nova msg, resposta,
    // finalizar/reabrir) também revalida os contadores das abas.
    const invalidateTabCounts = () =>
      queryClient.invalidateQueries({ queryKey: ['conversation-tab-counts'] });
    const unsubNew = on('message:new', () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      invalidateTabCounts();
    });
    const unsubImported = on('conversation:imported', () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      invalidateTabCounts();
    });
    const unsubUpdated = on('conversation:updated', () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      invalidateTabCounts();
    });
    // When the same user reads a conversation in another tab/device, zero
    // the badge here too without a full refetch.
    const unsubRead = on('conversation:read', (payload: any) => {
      const id = payload?.conversationId;
      if (!id) return;
      queryClient.setQueriesData<any>(
        { queryKey: ['conversations'] },
        (old: any) => {
          if (!old?.pages) return old;
          return {
            ...old,
            pages: old.pages.map((p: any) => ({
              ...p,
              conversations: p.conversations.map((c: Conversation) =>
                c.id === id ? { ...c, unreadCount: 0 } : c,
              ),
            })),
          };
        },
      );
    });
    // Mirror of conversation:read for the "mark as unread" action — keeps
    // other tabs/devices for the same user in sync with the new badge.
    const unsubUnread = on('conversation:unread', (payload: any) => {
      const id = payload?.conversationId;
      if (!id) return;
      const count = Number(payload?.unreadCount) || 1;
      queryClient.setQueriesData<any>(
        { queryKey: ['conversations'] },
        (old: any) => {
          if (!old?.pages) return old;
          return {
            ...old,
            pages: old.pages.map((p: any) => ({
              ...p,
              conversations: p.conversations.map((c: Conversation) =>
                c.id === id ? { ...c, unreadCount: count } : c,
              ),
            })),
          };
        },
      );
      // Refetch so the conversation re-enters an "unread only" view it
      // had previously dropped from.
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    });
    // Reconnect: any events that fired while we were offline are gone, so
    // sync the list from scratch when the socket comes back.
    const unsubReconnect = onReconnect(() => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['inbox-views'] });
      invalidateTabCounts();
    });
    // Agendamentos: (des)aparecer o selo "⏰ agendada" no card sem F5.
    const refreshOnScheduled = () =>
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    const unsubSchedCreated = on('scheduled:created', refreshOnScheduled);
    const unsubSchedCanceled = on('scheduled:canceled', refreshOnScheduled);
    const unsubSchedSent = on('scheduled:sent', refreshOnScheduled);
    return () => {
      unsubNew?.();
      unsubImported?.();
      unsubUpdated?.();
      unsubRead?.();
      unsubUnread?.();
      unsubReconnect?.();
      unsubSchedCreated?.();
      unsubSchedCanceled?.();
      unsubSchedSent?.();
    };
  }, [on, onReconnect, queryClient]);

  const handleBulkAction = useCallback(
    async (action: 'close' | 'assign' | 'reopen') => {
      const ids = Array.from(selectedIds);
      if (ids.length === 0) return;
      setBulkLoading(true);
      try {
        if (action === 'close') await inboxService.bulkClose(ids);
        else if (action === 'assign') await inboxService.bulkAssignToMe(ids);
        else if (action === 'reopen') await inboxService.bulkReopen(ids);
        clearSelection();
        invalidateConversations();
      } finally {
        setBulkLoading(false);
      }
    },
    [selectedIds, clearSelection, invalidateConversations],
  );

  const handleBulkSetAi = useCallback(
    async (override: boolean | null) => {
      const ids = Array.from(selectedIds);
      if (ids.length === 0) return;
      setBulkLoading(true);
      try {
        await inboxService.bulkSetAi(ids, override);
        const label =
          override === null
            ? 'IA voltou ao padrão'
            : override
              ? 'IA forçada'
              : 'IA pausada';
        toast.success(`${label} em ${ids.length} conversa${ids.length > 1 ? 's' : ''}`);
        clearSelection();
        invalidateConversations();
      } catch (err: any) {
        toast.error(getErrorMessage(err, 'Erro ao alterar IA em massa'));
      } finally {
        setBulkLoading(false);
      }
    },
    [selectedIds, clearSelection, invalidateConversations],
  );

  const handleBulkEngageAi = useCallback(async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setBulkLoading(true);
    try {
      await inboxService.bulkEngageAi(ids);
      toast.success(
        `IA engajada em ${ids.length} conversa${ids.length > 1 ? 's' : ''}`,
      );
      clearSelection();
      invalidateConversations();
    } catch (err: any) {
      toast.error(getErrorMessage(err, 'Erro ao engajar IA'));
    } finally {
      setBulkLoading(false);
    }
  }, [selectedIds, clearSelection, invalidateConversations]);

  // Bulk: drop selected conversations into a pipeline stage. Each
  // conversation becomes a Card on (pipelineId, stageId). Uses
  // allSettled so a single failure (e.g. duplicate) doesn't abort the
  // batch — toast aggregates the result.
  const handleBulkAddToPipeline = useCallback(
    async (pipelineId: string, stageId: string) => {
      const ids = Array.from(selectedIds);
      if (ids.length === 0) return;
      setBulkLoading(true);
      try {
        const results = await Promise.allSettled(
          ids.map((conversationId) =>
            pipelinesService.createCard(pipelineId, {
              conversationId,
              stageId,
            }),
          ),
        );
        const ok = results.filter((r) => r.status === 'fulfilled').length;
        const failed = results.length - ok;
        if (failed === 0) {
          toast.success(
            `${ok} conversa${ok > 1 ? 's' : ''} adicionada${ok > 1 ? 's' : ''} ao pipeline`,
          );
        } else if (ok === 0) {
          toast.error(`Falha ao adicionar (${failed} ${failed > 1 ? 'erros' : 'erro'})`);
        } else {
          toast.warning(`${ok} adicionadas, ${failed} falharam`);
        }
        clearSelection();
        invalidateConversations();
      } finally {
        setBulkLoading(false);
      }
    },
    [selectedIds, clearSelection, invalidateConversations],
  );

  // Bulk: pin the selected conversations into a brand-new inbox view.
  // Asks for the inbox name with a quick prompt (no full dialog overhead),
  // creates the view with conversationIds=selected, then navigates to it.
  const router = useRouter();
  const handleCreateInboxFromSelection = useCallback(async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const defaultName = `Seleção ${new Date().toLocaleDateString('pt-BR')}`;
    const name = window.prompt(
      `Nome da nova inbox (com as ${ids.length} conversas selecionadas):`,
      defaultName,
    );
    if (!name || !name.trim()) return;
    setBulkLoading(true);
    try {
      const view = await inboxViewsService.create({
        name: name.trim(),
        icon: 'Star',
        color: 'amber',
        filters: { conversationIds: ids },
      });
      toast.success(`Inbox "${view.name}" criada com ${ids.length} conversas`);
      clearSelection();
      queryClient.invalidateQueries({ queryKey: ['inbox-views'] });
      router.push(`/inbox?view=${view.id}`);
    } catch (err: any) {
      toast.error(getErrorMessage(err, 'Erro ao criar inbox'));
    } finally {
      setBulkLoading(false);
    }
  }, [selectedIds, clearSelection, queryClient, router]);

  const getLastMessagePreview = (conv: Conversation) => {
    const last = conv.messages[0];
    if (!last) return 'Sem mensagens';
    const prefix = last.direction === 'OUTBOUND' ? 'Você: ' : '';
    const rt = (last as any).metadata?.replyTo;
    const storyPrefix = rt?.story
      ? rt.story.kind === 'mention'
        ? '📸 Mencionou no story · '
        : '📸 Respondeu seu story · '
      : rt?.ad
        ? '📢 Respondeu ao anúncio · '
        : '';
    return prefix + storyPrefix + (last.content?.text || messageTypeLabel(last.type));
  };

  const formatTime = (date: string | null) => {
    if (!date) return '';
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffH = diffMs / (1000 * 60 * 60);
    if (diffH < 24) {
      return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  return (
    // Coluna da lista: 432px no desktop (era 320), tela inteira abaixo de `md`.
    <div className="flex h-full w-full md:w-[27rem] flex-col border-r border-border bg-card">
      {/* Scope selector (All / Mine) + Nova conversa */}
      <div className="flex items-center gap-2 px-3.5 pt-3.5">
        <div className="min-w-0 flex-1">
        <Popover className="relative">
          <PopoverButton
            aria-label={`Escopo: ${scopeOptions.find((o) => o.value === scope)?.label ?? 'Todas as conversas'}`}
            className={`flex h-11 w-full items-center gap-2.5 rounded-2xl bg-chat px-3.5 text-left text-[14.5px] text-foreground transition-colors hover:bg-primary/10 data-[open]:bg-primary/10 ${FOCUS_RING}`}
          >
            {(() => {
              const current = scopeOptions.find((o) => o.value === scope) ?? scopeOptions[0];
              const Icon = current.icon;
              return <Icon aria-hidden="true" className="h-5 w-5 shrink-0 text-muted-foreground" />;
            })()}
            <span className="flex-1 truncate font-semibold">
              {scopeOptions.find((o) => o.value === scope)?.label ?? 'Todas as conversas'}
            </span>
            <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />
          </PopoverButton>
          <PopoverPanel
            anchor="bottom start"
            transition
            className="z-50 w-[var(--button-width)] rounded-2xl border border-border bg-popover p-1.5 shadow-elevated outline-none transition duration-100 ease-out data-[closed]:scale-95 data-[closed]:opacity-0 [--anchor-gap:0.375rem]"
          >
            {({ close }) => (
              <div role="radiogroup" aria-label="Quais conversas mostrar">
                {scopeOptions.map((option) => {
                  const Icon = option.icon;
                  const isActive = scope === option.value;
                  const disabled = option.value === 'MINE' && !currentUserId;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={isActive}
                      onClick={() => { if (!disabled) { handleScopeChange(option.value); close(); } }}
                      disabled={disabled}
                      className={`flex min-h-11 w-full items-center gap-2.5 rounded-xl px-3 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 md:min-h-10 ${FOCUS_RING} ${
                        isActive
                          ? 'bg-primary/10 font-semibold text-primary'
                          : 'text-foreground hover:bg-muted'
                      }`}
                    >
                      <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
                      <span className="flex-1">{option.label}</span>
                      {isActive && <Check aria-hidden="true" className="h-4 w-4 text-primary" />}
                    </button>
                  );
                })}
              </div>
            )}
          </PopoverPanel>
        </Popover>
        </div>
        <button
          type="button"
          onClick={() => setNewConversationOpen(true)}
          title="Nova conversa"
          aria-label="Nova conversa"
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:ring-offset-2 focus-visible:ring-offset-card ${FOCUS_RING}`}
        >
          <Plus aria-hidden="true" className="h-5 w-5" />
        </button>
      </div>


      {/* Search + Filter. Dentro de uma view não há abas logo abaixo, então a
          própria linha fecha o respiro antes da divisória. */}
      <div className={`flex items-center gap-2 px-3.5 pt-2.5 ${viewId ? 'pb-2.5' : 'pb-0'}`}>
        <div className="group relative min-w-0 flex-1">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
          <input
            ref={searchRef}
            type="search"
            aria-label="Buscar conversas"
            placeholder="Buscar conversas…"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className={`h-11 w-full rounded-2xl bg-chat pl-11 pr-11 text-[14.5px] text-foreground transition-colors placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:appearance-none ${FOCUS_RING}`}
          />
          {search && (
            <button
              type="button"
              onClick={() => { handleSearchChange(''); searchRef.current?.focus(); }}
              aria-label="Limpar busca"
              title="Limpar busca"
              className={`absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary ${FOCUS_RING}`}
            >
              <X aria-hidden="true" className="h-4 w-4" />
            </button>
          )}
        </div>

        <Popover className="relative">
          <PopoverButton
            // Filtros funcionam sempre — dentro ou fora de uma view. Quando
            // dentro de view, eles agem como override em cima dos filtros
            // salvos da view (backend faz o merge no /inbox-views/:id/conv).
            aria-label={
              activeFilterCount > 0
                ? `Filtros (${activeFilterCount} ${activeFilterCount === 1 ? 'ativo' : 'ativos'})`
                : 'Filtros'
            }
            title="Filtros"
            className={`relative flex h-11 w-11 items-center justify-center rounded-2xl transition-colors ${FOCUS_RING} ${
              activeFilterCount > 0
                ? 'bg-primary/10 text-primary'
                : 'bg-chat text-muted-foreground hover:bg-primary/10 hover:text-primary data-[open]:bg-primary/10 data-[open]:text-primary'
            }`}
          >
            <SlidersHorizontal aria-hidden="true" className="h-5 w-5" />
            {activeFilterCount > 0 && (
              <span aria-hidden="true" className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-card bg-primary px-1 font-mono text-[11px] font-bold tabular-nums leading-none text-primary-foreground">
                {activeFilterCount}
              </span>
            )}
          </PopoverButton>

          <PopoverPanel
            anchor="bottom end"
            transition
            // O vão (10px) é exatamente a distância do botão até a trilha de abas:
            // o painel começa onde as abas começam, sem deixar uma fresta delas à mostra.
            // Abaixo de `md` a lista ocupa a tela toda, então o painel também.
            className="z-50 w-[calc(100vw-1.5rem)] rounded-2xl border border-border bg-popover p-1.5 shadow-elevated outline-none transition duration-100 ease-out data-[closed]:scale-95 data-[closed]:opacity-0 md:w-80 [--anchor-gap:0.625rem] [--anchor-padding:0.75rem]"
          >
            <InboxFilterPanel
              hideChannelSegment={!!viewId}
              disableAtendente={currentRole === 'AGENT'}
              segments={segments}
              tags={tags}
              channels={channels}
              members={members}
              selectedSegmentId={selectedSegmentId}
              onSegmentChange={handleSegmentChange}
              selectedChannelId={selectedChannelId}
              onChannelChange={handleChannelChange}
              selectedTagIds={selectedTagIds}
              onToggleTag={toggleTagFilter}
              onClearTags={() => {
                setSelectedTagIds([]);
                updatePrefs({ tagIds: [] });
              }}
              selectedAssignedToId={selectedAssignedToId}
              onAssignedToChange={handleAssignedToChange}
              dateRange={dateRange}
              dateFrom={dateFrom}
              dateTo={dateTo}
              onDateRangeChange={handleDateRangeChange}
              onDateFromChange={handleDateFromChange}
              onDateToChange={handleDateToChange}
              selectedStatus={selectedStatus}
              onStatusChange={handleStatusChange}
              selectedProjectStatus={selectedProjectStatus}
              onProjectStatusChange={handleProjectStatusChange}
              mineProjects={mineProjects}
              onToggleMineProjects={toggleMineProjects}
              individualOnly={individualOnly}
              onToggleIndividual={toggleIndividual}
              groupsOnly={groupsOnly}
              onToggleGroups={toggleGroups}
              unreadOnly={unreadOnly}
              onToggleUnread={() => toggleListFilter('unread')}
              archivedOnly={archivedOnly}
              onToggleArchived={() => toggleListFilter('archived')}
              onClearAll={clearListFilters}
            />
          </PopoverPanel>
        </Popover>
      </div>

      {/* O escopo da busca é maior que o da lista — a aba e o filtro de
          arquivadas saem de cena enquanto há termo digitado. Sem este aviso a
          mudança de escopo seria invisível e o resultado, inexplicável. */}
      {isSearchScopeWidened && (
        <div className="px-3.5 pt-2">
          <p role="status" className="text-xs leading-snug text-muted-foreground">
            Buscando em <span className="font-semibold text-foreground">todas as conversas</span>, inclusive finalizadas e arquivadas.
          </p>
        </div>
      )}

      {/* Abas de atendimento (Entrada / Esperando / Finalizados) — só no inbox
          padrão. Saved views têm semântica própria e não usam as abas. */}
      {!viewId && (
        <div className="px-3.5 pb-2.5 pt-2.5">
          <div
            role="tablist"
            aria-label="Abas de atendimento"
            onKeyDown={(e) => {
              if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
              e.preventDefault();
              const current = ATTENDANCE_TABS.findIndex((t) => t.value === tab);
              const step = e.key === 'ArrowRight' ? 1 : -1;
              const next =
                ATTENDANCE_TABS[(current + step + ATTENDANCE_TABS.length) % ATTENDANCE_TABS.length];
              handleTabChange(next.value);
              e.currentTarget
                .querySelector<HTMLButtonElement>(`[data-tab="${next.value}"]`)
                ?.focus();
            }}
            // Segmentado em pílula, largura toda, sobre o lilás claro do chat.
            className="flex items-center gap-0.5 rounded-full bg-chat p-1"
          >
            {ATTENDANCE_TABS.map((t) => {
              const active = tab === t.value;
              const count = tabCounts?.[t.value] ?? 0;
              return (
                <button
                  key={t.value}
                  type="button"
                  role="tab"
                  data-tab={t.value}
                  aria-selected={active}
                  aria-controls={CONVERSATION_LIST_ID}
                  tabIndex={active ? 0 : -1}
                  onClick={() => handleTabChange(t.value)}
                  title={count > 0 ? `${t.label} (${count})` : t.label}
                  // min-w-0: sem isso o botão não encolhe abaixo do conteúdo e
                  // "Finalizados +99" vazava da barra em listas estreitas.
                  className={`relative flex min-h-11 min-w-0 flex-auto items-center justify-center gap-1.5 rounded-full px-2 text-sm font-semibold transition-colors md:min-h-9 ${FOCUS_RING} ${
                    active
                      ? 'bg-primary text-primary-foreground shadow-soft focus-visible:ring-offset-2 focus-visible:ring-offset-chat'
                      : 'text-muted-foreground hover:bg-primary/10 hover:text-primary'
                  }`}
                >
                  <span className="truncate">{t.label}</span>
                  {count > 0 && (
                    // Contador solto em mono (sem pílula própria), como no mock.
                    <span
                      className={`shrink-0 font-mono text-xs font-medium tabular-nums leading-none ${
                        active ? 'text-primary-foreground/85' : 'text-foreground'
                      }`}
                    >
                      {count > 99 ? '+99' : count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Active filter chips */}
      {activeFilterCount > 0 && (
        <div
          role="group"
          aria-label="Filtros ativos"
          className="flex items-center gap-1.5 overflow-x-auto px-3.5 pb-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:flex-wrap md:overflow-visible"
        >
          {filterOptions.map((option) => {
            const isActive =
              option.value === 'unread' ? unreadOnly : archivedOnly;
            if (!isActive) return null;
            return (
              <FilterChip
                key={option.value}
                label={option.label}
                count={option.value === 'unread' ? totalCount : undefined}
                onRemove={() => toggleListFilter(option.value)}
              />
            );
          })}
          {selectedTagIds.map((tagId) => {
            const tag = tags.find((t) => t.id === tagId);
            if (!tag) return null;
            return (
              <TagChip
                key={tag.id}
                name={tag.name}
                color={tag.color}
                title={`Filtrando por tag: ${tag.name}`}
                className="shrink-0"
                onRemove={() => toggleTagFilter(tag.id)}
              />
            );
          })}
          {selectedStatus && (
            <FilterChip
              label={STATUS_CHIP_LABELS[selectedStatus] ?? selectedStatus}
              onRemove={() => handleStatusChange('')}
            />
          )}
          {selectedAssignedToId && (
            <FilterChip
              label={
                selectedAssignedToId === ASSIGNED_TO_ME
                  ? 'Atribuídas a mim'
                  : members.find((m) => m.user.id === selectedAssignedToId)?.user
                      .name ?? 'Atendente'
              }
              onRemove={() => handleAssignedToChange(null)}
            />
          )}
          {selectedChannelId && (
            <FilterChip
              label={`Canal: ${channels.find((c) => c.id === selectedChannelId)?.name ?? 'selecionado'}`}
              onRemove={() => handleChannelChange(null)}
            />
          )}
          {selectedSegmentId && (
            <FilterChip
              label={`Segmento: ${segments.find((sg) => sg.id === selectedSegmentId)?.name ?? 'selecionado'}`}
              onRemove={() => handleSegmentChange(null)}
            />
          )}
          {dateRange !== 'ALL' && (
            <FilterChip
              label={DATE_CHIP_LABELS[dateRange] ?? 'Data'}
              onRemove={() => handleDateRangeChange('ALL')}
            />
          )}
          {activeFilterCount > 1 && (
            <button
              type="button"
              onClick={clearListFilters}
              className={`inline-flex h-7 shrink-0 items-center gap-1 rounded-full px-2.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary ${FOCUS_RING}`}
            >
              <X aria-hidden="true" className="h-3.5 w-3.5" />
              Limpar
            </button>
          )}
        </div>
      )}

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div
          role="toolbar"
          aria-label="Ações em massa"
          // `relative`: os popovers de IA e pipeline ancoram na barra (não no
          // botão), então abrem dentro da coluna. Com os botões de 40px a
          // barra quebra em duas linhas: contagem em cima, ações embaixo.
          className="relative flex flex-wrap items-center gap-x-1.5 gap-y-1 border-y border-border bg-primary/5 px-3.5 py-2"
        >
          <button
            type="button"
            onClick={clearSelection}
            aria-label="Limpar seleção"
            title="Limpar seleção"
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary md:h-10 md:w-10 ${FOCUS_RING}`}
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
          <span role="status" className="text-sm font-semibold text-foreground">
            {selectedIds.size} selecionada{selectedIds.size > 1 ? 's' : ''}
          </span>
          <button
            type="button"
            onClick={selectAll}
            aria-label="Selecionar todas as conversas carregadas"
            className={`flex h-11 items-center rounded-lg px-1.5 text-xs font-semibold text-primary hover:underline md:h-10 ${FOCUS_RING}`}
          >
            Todas
          </button>
          <div className="flex-1" />
          <div className="ml-auto flex items-center gap-0.5">
          <button
            type="button"
            onClick={handleCreateInboxFromSelection}
            disabled={bulkLoading}
            title="Criar inbox com as selecionadas"
            aria-label="Criar inbox com as selecionadas"
            className={`flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground transition-colors disabled:opacity-50 md:h-10 md:w-10 ${FOCUS_RING} hover:bg-primary/10 hover:text-primary`}
          >
            <FolderPlus aria-hidden="true" className="h-5 w-5" />
          </button>
          {can('inbox.bulk') && (
            <>
              <BulkAiPopover
                count={selectedIds.size}
                disabled={bulkLoading}
                onSetOverride={handleBulkSetAi}
                onEngage={handleBulkEngageAi}
              />
              <BulkPipelinePopover
                count={selectedIds.size}
                disabled={bulkLoading}
                onConfirm={handleBulkAddToPipeline}
              />
            </>
          )}
          <button
            onClick={() => handleBulkAction('assign')}
            disabled={bulkLoading}
            title="Assumir as selecionadas"
            aria-label="Assumir as selecionadas"
            className={`flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground transition-colors disabled:opacity-50 md:h-10 md:w-10 ${FOCUS_RING} hover:bg-primary/10 hover:text-primary`}
          >
            <UserCheck aria-hidden="true" className="h-5 w-5" />
          </button>
          <button
            onClick={() => handleBulkAction('close')}
            disabled={bulkLoading}
            title="Encerrar as selecionadas"
            aria-label="Encerrar as selecionadas"
            className={`flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground transition-colors disabled:opacity-50 md:h-10 md:w-10 ${FOCUS_RING} hover:bg-urgent-wash hover:text-urgent-ink`}
          >
            <XCircle aria-hidden="true" className="h-5 w-5" />
          </button>
          <button
            onClick={() => handleBulkAction('reopen')}
            disabled={bulkLoading}
            title="Reabrir as selecionadas"
            aria-label="Reabrir as selecionadas"
            className={`flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground transition-colors disabled:opacity-50 md:h-10 md:w-10 ${FOCUS_RING} hover:bg-success-wash hover:text-success-ink`}
          >
            <RotateCcw aria-hidden="true" className="h-5 w-5" />
          </button>
          </div>
        </div>
      )}

      {/* Divider — de ponta a ponta, como as divisórias entre as linhas. */}
      {selectedIds.size === 0 && (
        <div className="border-t border-border" />
      )}

      {/* Conversation list */}
      <div
        ref={scrollContainerRef}
        id={CONVERSATION_LIST_ID}
        aria-busy={isLoading}
        className="flex-1 overflow-y-auto scrollbar-thin"
      >
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            // Mesma métrica da linha real (avatar 64px, respiro de 16px) para a
            // lista não "pular" quando os dados chegam.
            <div key={i} aria-hidden="true" className="flex gap-4 border-b border-border px-4 py-[22px]">
              <div className="size-16 shrink-0 animate-pulse rounded-full bg-muted" />
              <div className="flex-1 space-y-2.5 pt-1">
                <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                <div className="h-3.5 w-48 animate-pulse rounded bg-muted/60" />
              </div>
            </div>
          ))
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <MessageSquare aria-hidden="true" className="h-7 w-7" />
            </div>
            <p className="mt-4 text-base font-semibold text-foreground">
              Nenhuma conversa encontrada
            </p>
            {(activeFilterCount > 0 || search) && (
              <button
                type="button"
                onClick={() => { clearListFilters(); handleSearchChange(''); }}
                className={`mt-2 flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/10 md:min-h-10 ${FOCUS_RING}`}
              >
                Limpar filtros
              </button>
            )}
          </div>
        ) : (
          <>
            <div role="list" aria-label="Conversas">
            {conversations.map((conv, index) => {
              const isActive = conv.id === activeId;
              const isSelected = selectedIds.has(conv.id);
              const inSelectionMode = selectedIds.size > 0;
              // Lead sem atendente e conversa aberta → destaque por estágio:
              // Destaque do card por estágio do lead (só conversa aberta):
              //  • sem atendente + fora de "Distribuir" (ainda na SDR)      → azul claro
              //  • sem atendente + etapa "Distribuir" (fila, SDR terminou)  → rosa claro
              //  • COM atendente + ainda em "Distribuir" (distribuído mas o
              //    atendente não clicou "Iniciar atendimento"/aprovou)      → verde claro
              //  • COM atendente + fora de "Distribuir" (já iniciou)        → sem cor
              // O card sai de "Distribuir" só quando o atendente aprova (→ "Coletando").
              const isOpen = conv.status !== 'CLOSED';
              const hasAttendant = !!conv.assignedToId;
              const inDistributeStage =
                conv.cards?.some((c) =>
                  c.stage?.name?.toLowerCase().includes('distribu'),
                ) ?? false;
              const stillInSdr = isOpen && !hasAttendant && !inDistributeStage;
              const readyToDistribute = isOpen && !hasAttendant && inDistributeStage;
              const awaitingApproval = isOpen && hasAttendant && inDistributeStage;
              const phase = readyToDistribute
                ? LEAD_PHASE.queue
                : stillInSdr
                  ? LEAD_PHASE.sdr
                  : awaitingApproval
                    ? LEAD_PHASE.start
                    : null;
              // Janela do WhatsApp: vira o anel em volta do avatar e o contador
              // no rodapé da linha. Só existe em canal oficial da Meta.
              const win = computeWindowState({
                channelType: conv.channel.type,
                windowExpiresAt: conv.windowExpiresAt,
                windowKind: conv.windowKind,
                now,
              });
              const winMsLeft = win.applicable && win.open ? win.msLeft : null;
              // Espera do cliente: vira a espinha na borda esquerda.
              const waited = waitingMs({
                status: conv.status,
                lastMessage: conv.messages[0],
                now,
                awaitingHumanReply: conv.awaitingHumanReply,
              });
              const wait = waitLevel(waited);
              // A conversa ABERTA (e a marcada na seleção múltipla) fica lilás e
              // vence a cor do estágio — sem contorno pesado. A fase do lead
              // continua legível pelo chip de fase na última linha
              // ("Com a IA", "Na fila", "Iniciar atendimento").
              const contactLabel =
                conv.contact.name || conv.contact.phone || 'Desconhecido';
              const statusLabel = STATUS_DOT_LABELS[conv.status] ?? conv.status;
              const hasWaitSpine = !!WAIT_SPINE_CLASS[wait];
              const unread = conv.unreadCount ?? 0;
              const hasUnread = unread > 0;
              const stage = conv.cards?.find((c) => c.stage)?.stage;
              const rowTags = [
                ...(conv.tags ?? []).map((t) => ({ tag: t.tag, onContact: false })),
                ...(conv.contact.tags ?? []).map((t) => ({ tag: t.tag, onContact: true })),
              ];
              // A linha de chips nunca quebra: o que vem antes das tags (fase,
              // divergência, etapa) já consome largura, então cada um deles tira
              // uma vaga de tag. O resto vira "+N" no fim da mesma linha.
              const leadingChips =
                (phase ? 1 : 0) + (conv.hasOrderDivergence ? 1 : 0) + (stage ? 1 : 0);
              const tagSlots = Math.max(1, MAX_ROW_TAGS - leadingChips);
              const shownTags = rowTags.slice(0, tagSlots);
              const hiddenTags = rowTags.slice(tagSlots);
              const hasChipLine =
                !!phase || rowTags.length > 0 || !!stage || !!conv.hasOrderDivergence;
              const ChannelIcon = channelIcons[conv.channel.type] || MessageSquare;
              return (
                <div
                  key={conv.id}
                  role="listitem"
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setContextMenu({
                      conversation: conv,
                      position: { x: e.clientX, y: e.clientY },
                    });
                  }}
                  // Linha chapada com divisória fina (não é mais cartão arredondado).
                  className={`group relative flex w-full gap-4 border-b border-border px-4 py-[22px] transition-colors duration-100 ${
                    isActive || isSelected
                      ? 'bg-primary/15 shadow-[inset_-3px_0_0_var(--color-primary)]'
                      : phase
                        ? phase.row
                        : 'hover:bg-primary/5'
                  }`}
                >
                  {/* Espinha: quanto tempo o cliente está esperando resposta.
                      Absoluta pra não empurrar o conteúdo da linha. O texto
                      equivalente vai dentro do botão (sr-only). */}
                  {hasWaitSpine && (
                    <span
                      aria-hidden="true"
                      title={waitLabel(waited)}
                      className={`absolute left-1 top-[22px] bottom-[22px] w-[3px] rounded-full ${WAIT_SPINE_CLASS[wait]}`}
                    />
                  )}
                  {/* Coluna do avatar com altura FIXA (64px): o selo do canal fica
                      ancorado no círculo, não na altura da linha. Fica acima da
                      área clicável do botão (z-10) para a caixa de seleção
                      receber o clique. */}
                  <div className="group/avatar relative z-10 size-16 shrink-0">
                    <ListAvatar
                      name={conv.contact.name}
                      avatarUrl={conv.contact.avatarUrl}
                    />
                    {/* Caixa de seleção de verdade (teclado + leitor de tela),
                        desenhada como o círculo de antes. Aparece no hover, no
                        foco e sempre que já existe seleção. */}
                    <label
                      title={isSelected ? 'Desmarcar' : 'Selecionar'}
                      className={`absolute inset-0 flex cursor-pointer items-center justify-center rounded-full border-2 transition has-[:focus-visible]:opacity-100 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-card ${
                        isSelected
                          ? 'border-primary bg-primary text-primary-foreground opacity-100'
                          : inSelectionMode
                            ? 'border-input bg-muted text-transparent opacity-100 hover:border-primary'
                            : 'border-input bg-card text-transparent opacity-0 hover:border-primary group-hover/avatar:opacity-100'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={isSelected}
                        onChange={() => toggleSelect(conv.id, index)}
                        aria-label={`Selecionar conversa de ${contactLabel}`}
                      />
                      <Check aria-hidden="true" className="h-5 w-5" />
                    </label>
                    {/* Selo do canal: cresce junto com o avatar (18px → 23px). */}
                    <span
                      title={conv.channel.name}
                      className="pointer-events-none absolute -bottom-0.5 -right-0.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-card"
                    >
                      <ChannelIcon aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
                    </span>
                  </div>
                  {/* Abrir a conversa. O ::before estica a área clicável para a
                      linha inteira (como antes), e é nele que o foco aparece.
                      Os filhos são `relative` para ficarem por cima dele e
                      continuarem mostrando seus `title`. */}
                  <button
                    type="button"
                    aria-current={isActive ? 'true' : undefined}
                    onClick={(e) => handleConversationClick(conv, index, e)}
                    className="block min-w-0 flex-1 text-left outline-none before:absolute before:inset-0 focus-visible:before:ring-2 focus-visible:before:ring-inset focus-visible:before:ring-ring"
                  >
                    <span className="relative flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          className={`truncate text-[19px] leading-[1.3] tracking-[-0.01em] text-foreground ${
                            hasUnread ? 'font-bold' : 'font-semibold'
                          }`}
                        >
                          {contactLabel}
                        </span>
                        {/* Com o rótulo de fase na linha ("Com a IA", "Na fila"…)
                            o ponto de status é redundante e só por cor: sai. Sem
                            fase ele fica, com o status por extenso para leitor de tela. */}
                        {!phase && (
                          <span
                            aria-hidden="true"
                            title={statusLabel}
                            className={`h-2 w-2 shrink-0 rounded-full ${statusColors[conv.status] || 'bg-zinc-300'}`}
                          />
                        )}
                        <span className="sr-only">. {phase ? phase.label : statusLabel}.</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-1.5">
                        {(conv._count?.scheduledMessages ?? 0) > 0 && (
                          <span
                            title={`${conv._count!.scheduledMessages} mensagem(ns) agendada(s)`}
                            className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 font-mono text-sm font-semibold tabular-nums leading-none text-primary"
                          >
                            <CalendarClock aria-hidden="true" className="h-3.5 w-3.5" />
                            {(conv._count?.scheduledMessages ?? 0) > 1 ? conv._count!.scheduledMessages : ''}
                            <span className="sr-only"> mensagem(ns) agendada(s). </span>
                          </span>
                        )}
                        {/* Atrasado e estourado só diferiam pela cor da espinha:
                            o estourado ganha um relógio ao lado da hora. */}
                        {wait === 'overdue' && (
                          <Clock
                            aria-hidden="true"
                            className="h-3.5 w-3.5 text-urgent-ink"
                          />
                        )}
                        <span
                          className={`font-mono tabular-nums text-sm ${
                            hasUnread
                              ? 'font-semibold text-foreground'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {formatTime(conv.messages[0]?.createdAt ?? conv.lastMessageAt)}
                        </span>
                        {hasWaitSpine && (
                          <span className="sr-only">. {waitLabel(waited)}.</span>
                        )}
                      </span>
                    </span>
                    <span className="relative mt-1.5 flex items-center justify-between gap-2">
                      <span
                        className={`block truncate text-[16.5px] ${
                          hasUnread ? 'font-medium text-foreground' : 'text-muted-foreground'
                        }`}
                      >
                        {getLastMessagePreview(conv)}
                      </span>
                      <span className="flex shrink-0 items-center gap-1.5">
                        {winMsLeft !== null && (
                          <span
                            title={`A janela ${windowKindLabel(win.kind)} fecha em ${formatWindowLeft(winMsLeft)}`}
                            className={`inline-flex items-center gap-1 font-mono text-sm tabular-nums ${
                              windowUrgency(winMsLeft) === 'closing'
                                ? 'font-semibold text-urgent-ink'
                                : windowUrgency(winMsLeft) === 'tight'
                                  ? 'text-warning-ink'
                                  : 'text-muted-foreground'
                            }`}
                          >
                            <Hourglass aria-hidden="true" className="h-3.5 w-3.5" />
                            <span className="sr-only">Janela fecha em </span>
                            {formatWindowLeft(winMsLeft)}
                          </span>
                        )}
                        {hasUnread && (
                          <span className="inline-flex h-[26px] min-w-[26px] shrink-0 items-center justify-center rounded-full bg-primary px-1.5 font-mono text-sm font-bold tabular-nums leading-none text-primary-foreground">
                            {unread > 9 ? '9+' : unread}
                            <span className="sr-only"> não lidas</span>
                          </span>
                        )}
                      </span>
                    </span>
                    {hasChipLine && (
                      <span className="relative mt-2.5 flex flex-nowrap items-center gap-1.5 overflow-hidden">
                        {phase && (
                          // Linha de chips: todos com a mesma altura e forma.
                          // Só a fase tem cor (contorno); etapa e tags são
                          // pílulas neutras com a cor no ponto.
                          <span
                            aria-hidden="true"
                            className={`inline-flex h-[26px] shrink-0 items-center rounded-full px-2.5 text-[13px] font-semibold leading-none ring-1 ring-inset ring-current ${phase.text}`}
                          >
                            {phase.label}
                          </span>
                        )}
                        {conv.hasOrderDivergence && (
                          <Badge
                            variant="hot"
                            title="Divergência entre o pedido e a proposta"
                            className="h-[26px] shrink-0 rounded-full px-2.5 py-0 text-[13px]"
                          >
                            <TriangleAlert aria-hidden="true" className="h-3.5 w-3.5" />
                            Divergência
                          </Badge>
                        )}
                        {stage && (
                          <StageChip
                            name={stage.name}
                            color={stage.color || '#6366f1'}
                            className="h-[26px] min-w-0 max-w-44 shrink-[0.5] rounded-full bg-card/75 px-2.5 py-0 text-[13px] font-medium ring-1 ring-inset ring-foreground/10"
                          />
                        )}
                        {shownTags.map(({ tag, onContact }) => (
                          <TagChip
                            key={`${onContact ? 'ct' : 'c'}-${tag.id}`}
                            name={tag.name}
                            color={tagColor(tag)}
                            outline={onContact}
                            quiet
                            title={`${onContact ? 'Tag no contato' : 'Tag na conversa'}: ${tag.name}`}
                            className="h-[26px] min-w-0 max-w-40 px-2.5 py-0 text-[13px] font-medium"
                          />
                        ))}
                        {hiddenTags.length > 0 && (
                          <span
                            title={hiddenTags.map(({ tag }) => tag.name).join(', ')}
                            className="inline-flex h-[26px] shrink-0 items-center rounded-full px-1.5 font-mono text-[13px] font-medium tabular-nums leading-none text-muted-foreground"
                          >
                            +{hiddenTags.length}
                            <span className="sr-only"> tags</span>
                          </span>
                        )}
                      </span>
                    )}
                  </button>
                </div>
              );
            })}
            </div>
            {/* Sentinel for infinite scroll */}
            <div ref={sentinelRef} className="h-1" />
            {isFetchingNextPage && (
              <div className="flex items-center justify-center py-4">
                <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin text-primary" />
              </div>
            )}
          </>
        )}
      </div>

      {contextMenu && (
        <ConversationContextMenu
          conversation={contextMenu.conversation}
          position={contextMenu.position}
          onClose={() => setContextMenu(null)}
        />
      )}

      <NewConversationDialog
        open={newConversationOpen}
        onClose={() => setNewConversationOpen(false)}
        onCreated={handleNewConversationCreated}
      />
    </div>
  );
}
