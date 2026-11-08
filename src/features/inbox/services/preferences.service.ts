import { api } from '@/lib/api';
import type { InboxFilterState } from '../lib/inbox-filters';
import type { FilterShortcut } from '../lib/filter-shortcuts';

export interface InboxPreferences {
  scope?: 'ALL' | 'MINE';
  /** Filtro atual da inbox (modelo novo). JSON salvo: sempre ler com
   *  `filtersFromPreferences`, que valida. Quando existe, as chaves planas
   *  abaixo são ignoradas (ficam só para migrar quem ainda não salvou). */
  filters?: InboxFilterState;
  /** Atalhos de filtro salvos. Ler com `sanitizeShortcuts`. */
  shortcuts?: FilterShortcut[];
  /** ADM/Owner já ganhou os atalhos prontos (não recria depois de excluir). */
  presetShortcutsSeeded?: boolean;
  // ── Chaves planas antigas: só leitura (migração). Não escrevemos mais. ──
  /** @deprecated mantido pra compat de leitura — não escrevemos mais aqui. */
  statusFilters?: string[];
  selectedChannelId?: string | null;
  /** Filtro por Segmento (grupos compartilhados entre vários números).
   *  Mutuamente exclusivo com selectedChannelId. */
  selectedSegmentId?: string | null;
  unreadOnly?: boolean;
  archivedOnly?: boolean;
  /** @deprecated modelo antigo (toggle único). Mantido só pra migração de
   *  leitura — showGroups=false → individualOnly; true → nenhum (mostra tudo). */
  showGroups?: boolean;
  /** Só conversas individuais (esconde grupos). Independente de groupsOnly. */
  individualOnly?: boolean;
  /** Só conversas de grupos. Independente de individualOnly. Nenhum dos dois
   *  marcado = mostra tudo (individuais + grupos). */
  groupsOnly?: boolean;
  /** IDs de tags filtradas (OR — conversa precisa ter pelo menos uma).
   *  Match em tag de conversa OU tag de contato. */
  tagIds?: string[];
  /** Filtro de status de projeto na inbox. */
  selectedProjectStatus?: string;
  /** "Meus projetos" — só grupos cujo responsável de projeto sou eu. */
  mineProjects?: boolean;
  /** Filtro de status da conversa (PENDING/OPEN/WAITING/CLOSED). '' = todos. */
  selectedStatus?: string;
  /** Filtro por atendente atribuído. Tem precedência sobre o scope MINE.
   *  null/undefined = sem filtro; 'MINE' resolvido pelo componente. */
  selectedAssignedToId?: string | null;
  /** Preset de intervalo de data: ALL | TODAY | 7D | 30D | RANGE. */
  dateRange?: string;
  /** Datas do preset RANGE (YYYY-MM-DD dos <input type="date">). */
  dateFrom?: string | null;
  dateTo?: string | null;
}

export interface UserPreferences {
  inbox?: InboxPreferences;
  [key: string]: unknown;
}

export const preferencesService = {
  async get(): Promise<UserPreferences> {
    const { data } = await api.get('/users/me/preferences');
    return data.data ?? {};
  },

  async patch(patch: Partial<UserPreferences>): Promise<UserPreferences> {
    const { data } = await api.patch('/users/me/preferences', {
      preferences: patch,
    });
    return data.data ?? {};
  },
};
