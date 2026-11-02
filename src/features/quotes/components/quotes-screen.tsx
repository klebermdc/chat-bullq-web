'use client';

import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { FileSearch, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { controlSmCls } from '@/components/ui/control';
import { EmptyState } from '@/components/ui/empty-state';
import { proposalsService, type QuoteStatusFilter } from '@/features/proposals/services/proposals.service';
import type { Proposal } from '@/features/proposals/types';
import { membersService } from '@/features/settings/services/members.service';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useAuthStore } from '@/stores/auth-store';
import { pageCount } from '../lib/quote-list';
import { QuoteListRow } from './quote-list-row';
import { QuoteUpdateDialog } from './quote-update-dialog';

const PAGE_SIZE = 20;
const SEARCH_DELAY_MS = 300;
const MANAGER_ROLES = ['OWNER', 'ADMIN'];

const STATUS_OPTIONS: { value: QuoteStatusFilter | ''; label: string }[] = [
  { value: '', label: 'Todas' },
  { value: 'ACTIVE', label: 'Válidas' },
  { value: 'VIEWED', label: 'Cliente abriu' },
  { value: 'NOT_VIEWED', label: 'Cliente não abriu' },
  { value: 'EXPIRED', label: 'Vencidas' },
];

/** Cotações geradas: acha pelo número, cliente, telefone ou hotel e atualiza dali mesmo. */
export function QuotesScreen() {
  const { organizations, activeOrgId } = useAuthStore();
  const isManager = MANAGER_ROLES.includes(organizations.find((o) => o.id === activeOrgId)?.role ?? '');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<QuoteStatusFilter | ''>('');
  const [sellerId, setSellerId] = useState('');
  const [page, setPage] = useState(1);
  const [updating, setUpdating] = useState<Proposal | null>(null);
  const q = useDebouncedValue(search.trim(), SEARCH_DELAY_MS);

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['proposals', 'search', { q, status, sellerId, page }],
    queryFn: () => proposalsService.searchQuotes({ q, status, sellerId, page, limit: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });
  const { data: members } = useQuery({
    queryKey: ['members'],
    queryFn: () => membersService.list(),
    enabled: isManager,
    retry: false,
  });

  const filterBy = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setPage(1);
  };
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const pages = pageCount(total, PAGE_SIZE);
  const hasFilter = Boolean(q || status || sellerId);
  const now = new Date();

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-0 flex-1 basis-64">
          <span className="sr-only">Buscar cotação</span>
          <Search aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={search}
            maxLength={100}
            onChange={(e) => filterBy(setSearch)(e.target.value)}
            placeholder="Número, cliente, telefone ou hotel"
            className={`${controlSmCls} w-full pl-8`}
          />
        </label>
        <select
          aria-label="Status"
          value={status}
          onChange={(e) => filterBy(setStatus)(e.target.value as QuoteStatusFilter | '')}
          className={controlSmCls}
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {isManager && (
          <select
            aria-label="Vendedor"
            value={sellerId}
            onChange={(e) => filterBy(setSellerId)(e.target.value)}
            className={controlSmCls}
          >
            <option value="">Todos os vendedores</option>
            {members?.map((member) => (
              <option key={member.userId} value={member.userId}>
                {member.user.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {isError ? (
        <EmptyState
          title="Não consegui carregar as cotações"
          description="Confira a conexão e tente de novo."
          action={<Button onClick={() => void refetch()}>Tentar de novo</Button>}
        />
      ) : isLoading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Carregando cotações…</p>
      ) : items.length === 0 ? (
        <EmptyState
          icon={FileSearch}
          title={hasFilter ? 'Nenhuma cotação encontrada' : 'Nenhuma cotação ainda'}
          description={
            hasFilter
              ? 'Tente o número sem o "#", só o primeiro nome ou parte do nome do hotel.'
              : 'As cotações por link enviadas nas conversas aparecem aqui.'
          }
        />
      ) : (
        <>
          <p aria-live="polite" className="text-xs text-muted-foreground">
            {total === 1 ? '1 cotação' : `${total} cotações`}
            {isFetching ? ' · atualizando…' : ''}
          </p>
          <ul className="space-y-2">
            {items.map((quote) => (
              <QuoteListRow key={quote.id} quote={quote} now={now} onUpdate={setUpdating} isFullRow />
            ))}
          </ul>
          {pages > 1 && (
            <div className="flex items-center justify-between gap-2">
              <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                Anterior
              </Button>
              <span className="text-xs text-muted-foreground">
                Página {page} de {pages}
              </span>
              <Button type="button" variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>
                Próxima
              </Button>
            </div>
          )}
        </>
      )}

      {updating && <QuoteUpdateDialog proposal={updating} onClose={() => setUpdating(null)} />}
    </div>
  );
}
