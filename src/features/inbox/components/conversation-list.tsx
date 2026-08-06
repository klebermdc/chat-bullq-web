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

function ListAvatar({ name, avatarUrl }: { name: string | null; avatarUrl: string | null }) {
  const [failed, setFailed] = useState(false);
  const initials = name?.slice(0, 2).toUpperCase() || '??';
  if (avatarUrl && !failed) {
    return (
      <img
        src={avatarUrl}
        alt={name || 'avatar'}
        onError={() => setFailed(true)}
        className="h-10 w-10 rounded-full bg-zinc-100 object-cover dark:bg-zinc-800"
      />
    );
  }
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-[13px] font-semibold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
      {initials}
    </div>
  );
}

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
}

export function ConversationList({ activeId, onSelect, viewId }: ConversationListProps) {
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
    updatePrefs({
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
    queryKey: ['conversations', orgId, viewId ?? null, filterKey, debouncedSearch, selectedChannelId, selectedSegmentId, scope, currentUserId, selectedStatus, selectedAssignedToId, dateRange, dateFrom, dateTo],
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
        toast.error(err?.response?.data?.message || 'Erro ao alterar IA em massa');
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
      toast.error(err?.response?.data?.message || 'Erro ao engajar IA');
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
      toast.error(err?.response?.data?.message || 'Erro ao criar inbox');
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
    return prefix + storyPrefix + (last.content?.text || `[${last.type}]`);
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
    <div className="flex h-full w-full md:w-80 flex-col border-r border-border bg-card">
      {/* Scope selector (All / Mine) + Nova conversa */}
      <div className="flex items-center gap-1.5 px-3 pt-3">
        <div className="flex-1">
        <Popover className="relative">
          <PopoverButton className="flex w-full items-center gap-2 rounded-md border border-zinc-200/80 bg-white px-2.5 py-1.5 text-left text-[13px] text-zinc-700 outline-none transition-colors hover:bg-zinc-50 data-[open]:border-primary/40 data-[open]:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900 dark:data-[open]:bg-zinc-900">
            {(() => {
              const current = scopeOptions.find((o) => o.value === scope) ?? scopeOptions[0];
              const Icon = current.icon;
              return <Icon className="h-3.5 w-3.5 shrink-0 text-zinc-500 dark:text-zinc-400" />;
            })()}
            <span className="flex-1 truncate font-medium">
              {scopeOptions.find((o) => o.value === scope)?.label ?? 'Todas as conversas'}
            </span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
          </PopoverButton>
          <PopoverPanel
            anchor="bottom start"
            transition
            className="z-50 mt-1.5 w-[var(--button-width)] rounded-lg border border-zinc-200/80 bg-white p-1 shadow-lg outline-none transition duration-100 ease-out data-[closed]:scale-95 data-[closed]:opacity-0 dark:border-zinc-800 dark:bg-zinc-900 [--anchor-gap:0.25rem]"
          >
            {({ close }) => (
              <>
                {scopeOptions.map((option) => {
                  const Icon = option.icon;
                  const isActive = scope === option.value;
                  const disabled = option.value === 'MINE' && !currentUserId;
                  return (
                    <button
                      key={option.value}
                      onClick={() => { if (!disabled) { handleScopeChange(option.value); close(); } }}
                      disabled={disabled}
                      className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-[13px] transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                        isActive
                          ? 'bg-primary/[0.06] font-medium text-primary dark:bg-primary/10'
                          : 'text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800/60'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      <span className="flex-1">{option.label}</span>
                      {isActive && <Check className="h-3.5 w-3.5 text-primary" />}
                    </button>
                  );
                })}
              </>
            )}
          </PopoverPanel>
        </Popover>
        </div>
        <button
          type="button"
          onClick={() => setNewConversationOpen(true)}
          title="Nova conversa"
          className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-md bg-primary text-white transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>


      {/* Search + Filter */}
      <div className="flex items-center gap-1.5 px-3 pt-2 pb-0">
        <div className="group relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400 transition-colors group-focus-within:text-primary" />
          <input
            ref={searchRef}
            type="text"
            placeholder="Buscar conversas..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full rounded-md border-0 bg-zinc-100/80 py-1.5 pl-8 pr-8 text-[13px] text-zinc-900 outline-none ring-1 ring-transparent transition-all placeholder:text-zinc-400 focus:bg-white focus:ring-primary/30 focus:shadow-sm dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:bg-zinc-900 dark:focus:ring-primary/30"
          />
          {search && (
            <button
              onClick={() => { handleSearchChange(''); searchRef.current?.focus(); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-zinc-400 transition-colors hover:text-zinc-600 dark:hover:text-zinc-300"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        <Popover className="relative">
          <PopoverButton
            // Filtros funcionam sempre — dentro ou fora de uma view. Quando
            // dentro de view, eles agem como override em cima dos filtros
            // salvos da view (backend faz o merge no /inbox-views/:id/conv).
            className={`relative flex h-[30px] w-[30px] items-center justify-center rounded-md transition-colors outline-none data-[open]:bg-zinc-100 data-[open]:text-zinc-600 dark:data-[open]:bg-zinc-800 dark:data-[open]:text-zinc-300 ${
              activeFilterCount > 0
                ? 'bg-primary/10 text-primary dark:bg-primary/20 data-[open]:bg-primary/10 data-[open]:text-primary dark:data-[open]:bg-primary/20 dark:data-[open]:text-primary'
                : 'text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300'
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            {activeFilterCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </PopoverButton>

          <PopoverPanel
            anchor="bottom end"
            transition
            className="z-50 mt-1.5 w-72 rounded-lg border border-zinc-200/80 bg-white p-1 shadow-lg outline-none transition duration-100 ease-out data-[closed]:scale-95 data-[closed]:opacity-0 dark:border-zinc-800 dark:bg-zinc-900 [--anchor-gap:0.25rem]"
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
        <div className="px-3 pb-2 pt-1.5">
          <p className="text-[11px] leading-tight text-zinc-500 dark:text-zinc-400">
            Buscando em <span className="font-medium text-zinc-700 dark:text-zinc-300">todas as conversas</span>, inclusive finalizadas e arquivadas.
          </p>
        </div>
      )}

      {/* Abas de atendimento (Entrada / Esperando / Finalizados) — só no inbox
          padrão. Saved views têm semântica própria e não usam as abas. */}
      {!viewId && (
        <div className="px-3 pb-2">
          <div className="flex items-center gap-0.5 rounded-lg bg-zinc-100 p-0.5 dark:bg-zinc-900">
            {([
              { value: 'inbox', label: 'Entrada' },
              { value: 'waiting', label: 'Esperando' },
              { value: 'closed', label: 'Finalizados' },
            ] as { value: ConversationTab; label: string }[]).map((t) => {
              const active = tab === t.value;
              const count = tabCounts?.[t.value] ?? 0;
              return (
                <button
                  key={t.value}
                  onClick={() => handleTabChange(t.value)}
                  className={`relative flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[12px] font-medium transition-colors ${
                    active
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                  }`}
                >
                  <span className="truncate">{t.label}</span>
                  {count > 0 && (
                    <span
                      className={`rounded-full px-1.5 text-[10px] font-semibold leading-none py-[3px] ${
                        active
                          ? 'bg-white/25 text-white'
                          : 'bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300'
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
        <div className="flex gap-1.5 overflow-x-auto px-3 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:flex-wrap md:overflow-visible">
          {filterOptions.map((option) => {
            const isActive =
              option.value === 'unread' ? unreadOnly : archivedOnly;
            if (!isActive) return null;
            return (
              <span
                key={option.value}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary dark:bg-primary/20"
              >
                {option.label}
                {option.value === 'unread' && (
                  <span className="rounded-full bg-primary/20 px-1.5 text-[10px] font-semibold leading-none py-[3px] dark:bg-primary/30">
                    {totalCount}
                  </span>
                )}
                <button
                  onClick={() => toggleListFilter(option.value)}
                  className="rounded-full p-0.5 transition-colors hover:bg-primary/20 dark:hover:bg-primary/30"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            );
          })}
          {selectedTagIds.map((tagId) => {
            const tag = tags.find((t) => t.id === tagId);
            if (!tag) return null;
            return (
              <span
                key={tag.id}
                title={`Filtrando por tag: ${tag.name}`}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium"
                style={{
                  backgroundColor: `${tag.color}1f`,
                  color: tag.color,
                }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: tag.color }}
                />
                {tag.name}
                <button
                  onClick={() => toggleTagFilter(tag.id)}
                  className="rounded-full p-0.5 transition-colors"
                  style={{ backgroundColor: `${tag.color}14` }}
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            );
          })}
          {selectedStatus && (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary dark:bg-primary/20">
              {STATUS_CHIP_LABELS[selectedStatus] ?? selectedStatus}
              <button
                onClick={() => handleStatusChange('')}
                className="rounded-full p-0.5 transition-colors hover:bg-primary/20 dark:hover:bg-primary/30"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          )}
          {selectedAssignedToId && (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary dark:bg-primary/20">
              {selectedAssignedToId === ASSIGNED_TO_ME
                ? 'Atribuídas a mim'
                : members.find((m) => m.user.id === selectedAssignedToId)?.user
                    .name ?? 'Atendente'}
              <button
                onClick={() => handleAssignedToChange(null)}
                className="rounded-full p-0.5 transition-colors hover:bg-primary/20 dark:hover:bg-primary/30"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          )}
          {dateRange !== 'ALL' && (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary dark:bg-primary/20">
              {DATE_CHIP_LABELS[dateRange] ?? 'Data'}
              <button
                onClick={() => handleDateRangeChange('ALL')}
                className="rounded-full p-0.5 transition-colors hover:bg-primary/20 dark:hover:bg-primary/30"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          )}
          {activeFilterCount > 1 && (
            <button
              onClick={clearListFilters}
              className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
            >
              <X className="h-2.5 w-2.5" />
              Limpar
            </button>
          )}
        </div>
      )}

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-1.5 border-t border-b border-zinc-200/80 bg-primary/4 px-3 py-1.5 dark:border-zinc-800 dark:bg-primary/10">
          <button
            onClick={clearSelection}
            className="flex h-5 w-5 items-center justify-center rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <span className="text-[12px] font-medium text-zinc-600 dark:text-zinc-300">
            {selectedIds.size} selecionada{selectedIds.size > 1 ? 's' : ''}
          </span>
          <button
            onClick={selectAll}
            className="text-[11px] text-primary hover:underline"
          >
            Todas
          </button>
          <div className="flex-1" />
          <button
            onClick={handleCreateInboxFromSelection}
            disabled={bulkLoading}
            title="Criar inbox com selecionadas"
            className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-amber-50 hover:text-amber-600 disabled:opacity-50 dark:hover:bg-amber-500/10"
          >
            <FolderPlus className="h-3.5 w-3.5" />
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
            title="Assumir"
            className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-primary/10 hover:text-primary disabled:opacity-50"
          >
            <UserCheck className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => handleBulkAction('close')}
            disabled={bulkLoading}
            title="Fechar"
            className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-50 dark:hover:bg-red-500/10"
          >
            <XCircle className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => handleBulkAction('reopen')}
            disabled={bulkLoading}
            title="Reabrir"
            className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-emerald-50 hover:text-emerald-500 disabled:opacity-50 dark:hover:bg-emerald-500/10"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Divider */}
      {selectedIds.size === 0 && (
        <div className="mx-3 border-t border-zinc-100 dark:border-zinc-800/60" />
      )}

      {/* Conversation list */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto scrollbar-thin">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex gap-3 px-3 py-3">
              <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-zinc-100 dark:bg-zinc-800" />
              <div className="flex-1 space-y-2 pt-0.5">
                <div className="h-3.5 w-24 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
                <div className="h-3 w-36 animate-pulse rounded bg-zinc-50 dark:bg-zinc-800/60" />
              </div>
            </div>
          ))
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800">
              <MessageSquare className="h-6 w-6 text-zinc-300 dark:text-zinc-600" />
            </div>
            <p className="mt-3 text-[13px] font-medium text-zinc-400 dark:text-zinc-500">
              Nenhuma conversa encontrada
            </p>
            {(activeFilterCount > 0 || search) && (
              <button
                onClick={() => { clearListFilters(); handleSearchChange(''); }}
                className="mt-2 text-xs text-primary hover:underline"
              >
                Limpar filtros
              </button>
            )}
          </div>
        ) : (
          <>
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
              });
              const wait = waitLevel(waited);
              // A conversa ABERTA não repinta o card inteiro: ela só ganha uma borda
              // roxa por cima. Repintar apagava a cor do estágio (rosa/azul/verde) e
              // o atendente perdia de vista em que fase o lead está. O tint roxo fica
              // só na seleção múltipla (checkbox).
              return (
                <button
                  key={conv.id}
                  onClick={(e) => handleConversationClick(conv, index, e)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setContextMenu({
                      conversation: conv,
                      position: { x: e.clientX, y: e.clientY },
                    });
                  }}
                  className={`group relative flex w-full gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-100 ${
                    isSelected
                      ? 'bg-primary/10'
                      : readyToDistribute
                        ? 'bg-pink-100 hover:bg-pink-200 dark:bg-pink-900/40 dark:hover:bg-pink-900/60'
                        : stillInSdr
                          ? 'bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/40 dark:hover:bg-blue-900/60'
                          : awaitingApproval
                            ? 'bg-green-100 hover:bg-green-200 dark:bg-green-900/40 dark:hover:bg-green-900/60'
                            : 'hover:bg-muted'
                  } ${isActive ? 'ring-2 ring-inset ring-primary' : ''}`}
                >
                  {/* Espinha: quanto tempo o cliente está esperando resposta.
                      Absoluta pra não empurrar o conteúdo da linha. */}
                  {WAIT_SPINE_CLASS[wait] && (
                    <span
                      aria-hidden="true"
                      title={waitLabel(waited)}
                      className={`absolute left-1 top-2.5 bottom-2.5 w-[3px] rounded-full ${WAIT_SPINE_CLASS[wait]}`}
                    />
                  )}
                  <div className="group/avatar relative shrink-0">
                    {/* Avatar visível por padrão; some no hover (ou se está selecionado / em selection mode) pra dar lugar à checkbox. */}
                    <div
                      className={`${
                        inSelectionMode || isSelected
                          ? 'invisible'
                          : 'group-hover/avatar:invisible'
                      }`}
                    >
                      <ListAvatar
                        name={conv.contact.name}
                        avatarUrl={conv.contact.avatarUrl}
                      />
                    </div>
                    {/* Checkbox: aparece no hover sempre, fica visível travada
                        quando já tem seleção ativa ou esse item é parte dela. */}
                    <div
                      role="checkbox"
                      aria-checked={isSelected}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelect(conv.id, index);
                      }}
                      className={`absolute inset-0 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-2 transition-colors ${
                        isSelected
                          ? 'border-primary bg-primary text-white opacity-100'
                          : inSelectionMode
                            ? 'border-zinc-300 bg-zinc-100 text-transparent hover:border-primary/50 dark:border-zinc-600 dark:bg-zinc-800'
                            : 'border-zinc-300 bg-white text-transparent opacity-0 hover:border-primary/50 group-hover/avatar:opacity-100 dark:border-zinc-600 dark:bg-zinc-900'
                      }`}
                      title={isSelected ? 'Desmarcar' : 'Selecionar'}
                    >
                      <Check className="h-4 w-4" />
                    </div>
                    {(() => {
                      const ChannelIcon = channelIcons[conv.channel.type] || MessageSquare;
                      return (
                        <div className="absolute -bottom-0.5 -right-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full border-2 border-white bg-white dark:border-zinc-950 dark:bg-zinc-900">
                          <ChannelIcon className="h-3 w-3 text-zinc-500 dark:text-zinc-400" />
                        </div>
                      );
                    })()}
                  </div>
                  <div className="min-w-0 flex-1">
                    {(() => {
                      const unread = conv.unreadCount ?? 0;
                      const hasUnread = unread > 0;
                      return (
                        <>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span
                                className={`truncate text-[13px] text-foreground ${
                                  hasUnread ? 'font-bold' : 'font-semibold'
                                }`}
                              >
                                {conv.contact.name || conv.contact.phone || 'Desconhecido'}
                              </span>
                              <div className={`h-1.5 w-1.5 shrink-0 rounded-full ${statusColors[conv.status] || 'bg-zinc-300'}`} />
                            </div>
                            <div className="flex shrink-0 items-center gap-1.5">
                              {(conv._count?.scheduledMessages ?? 0) > 0 && (
                                <span
                                  title={`${conv._count!.scheduledMessages} mensagem(ns) agendada(s)`}
                                  className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-px text-[10px] font-semibold leading-none text-primary"
                                >
                                  <CalendarClock className="h-3 w-3" />
                                  {(conv._count?.scheduledMessages ?? 0) > 1 ? conv._count!.scheduledMessages : ''}
                                </span>
                              )}
                              <span
                                className={`font-mono tabular-nums text-[11px] ${
                                  hasUnread
                                    ? 'font-semibold text-red-600 dark:text-red-400'
                                    : 'text-muted-foreground'
                                }`}
                              >
                                {formatTime(conv.messages[0]?.createdAt ?? conv.lastMessageAt)}
                              </span>
                            </div>
                          </div>
                          <div className="mt-0.5 flex items-center justify-between gap-1.5">
                            <p
                              className={`truncate text-[12px] text-muted-foreground ${
                                hasUnread ? 'font-semibold' : ''
                              }`}
                            >
                              {getLastMessagePreview(conv)}
                            </p>
                            {hasUnread && (
                              <span className="ml-1 inline-flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold leading-none text-white">
                                {unread > 9 ? '9+' : unread}
                              </span>
                            )}
                          </div>
                        </>
                      );
                    })()}
                    {(conv.tags?.length || conv.contact.tags?.length || conv.cards?.some((c) => c.stage) || conv.hasOrderDivergence || winMsLeft !== null) ? (
                      <div className="mt-1 flex flex-wrap items-center gap-1">
                        {conv.hasOrderDivergence && (
                          <Badge variant="hot" className="text-[10px]" title="Divergência entre o pedido e a proposta">
                            ⚠️ Divergência
                          </Badge>
                        )}
                        {(() => {
                          const stage = conv.cards?.find((c) => c.stage)?.stage;
                          if (!stage) return null;
                          const color = stage.color || '#6366f1';
                          return (
                            <span
                              title="Etapa do funil"
                              className="inline-flex items-center gap-1 rounded-full px-1.5 py-px text-[10px] font-semibold"
                              style={{ backgroundColor: `${color}22`, color }}
                            >
                              <span
                                className="h-1.5 w-1.5 rounded-full"
                                style={{ backgroundColor: color }}
                              />
                              {stage.name}
                            </span>
                          );
                        })()}
                        {conv.tags?.map((t) => {
                          const c = tagColor(t.tag);
                          return (
                            <span
                              key={`c-${t.tag.id}`}
                              title={`Tag na conversa: ${t.tag.name}`}
                              className="inline-flex items-center gap-1 rounded-full px-1.5 py-px text-[10px] font-medium"
                              style={{
                                backgroundColor: `${c}1f`,
                                color: c,
                              }}
                            >
                              <span
                                className="h-1.5 w-1.5 rounded-full"
                                style={{ backgroundColor: c }}
                              />
                              {t.tag.name}
                            </span>
                          );
                        })}
                        {conv.contact.tags?.map((t) => {
                          const c = tagColor(t.tag);
                          return (
                            <span
                              key={`ct-${t.tag.id}`}
                              title={`Tag no contato: ${t.tag.name}`}
                              className="inline-flex items-center gap-1 rounded-full border border-dashed px-1.5 py-px text-[10px] font-medium"
                              style={{
                                borderColor: `${c}80`,
                                color: c,
                              }}
                            >
                              {t.tag.name}
                            </span>
                          );
                        })}
                        {winMsLeft !== null && (
                          <span
                            title={`A janela de ${win.kind === 'ctwa72' ? '72h' : '24h'} fecha em ${formatWindowLeft(winMsLeft)}`}
                            className={`ml-auto font-mono text-[10px] tabular-nums ${
                              windowUrgency(winMsLeft) === 'closing'
                                ? 'font-semibold text-urgent'
                                : windowUrgency(winMsLeft) === 'tight'
                                  ? 'text-warning'
                                  : 'text-muted-foreground'
                            }`}
                          >
                            janela {formatWindowLeft(winMsLeft)}
                          </span>
                        )}
                      </div>
                    ) : null}
                  </div>
                </button>
              );
            })}
            {/* Sentinel for infinite scroll */}
            <div ref={sentinelRef} className="h-1" />
            {isFetchingNextPage && (
              <div className="flex items-center justify-center py-3">
                <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
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
