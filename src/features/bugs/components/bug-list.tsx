'use client';

import { AlertTriangle, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { SeverityBadge, SourceBadge } from './severity-badge';
import type { BugIssue } from '../services/bugs.service';

/**
 * "agora" / "há N min" / "há N h" / "há N d" — sem dependência externa,
 * seguindo o mesmo padrão local usado em intelligent-panel.tsx e
 * client-card-dialog.tsx (este projeto não tem date-fns/dayjs).
 */
function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diffSec = Math.floor((Date.now() - then) / 1000);
  if (diffSec < 60) return 'agora';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `há ${diffMin} min`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `há ${diffHour} h`;
  const diffDay = Math.floor(diffHour / 24);
  return `há ${diffDay} d`;
}

const absoluteTime = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('pt-BR');
};

interface BugListProps {
  items: BugIssue[];
  total: number;
  page: number;
  perPage: number;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onPageChange: (page: number) => void;
  /** true quando os filtros estão no padrão — muda a mensagem de lista vazia. */
  isDefaultFilters: boolean;
}

function SkeletonRow() {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex gap-2">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>
      <Skeleton className="mt-2 h-4 w-2/3" />
      <Skeleton className="mt-2 h-3 w-1/3" />
      <Skeleton className="mt-2 h-3 w-1/2" />
    </div>
  );
}

function BugRow({
  issue,
  isSelected,
  onSelect,
}: {
  issue: BugIssue;
  isSelected: boolean;
  onSelect: (id: string) => void;
}) {
  const deemphasized = issue.status === 'RESOLVED' || issue.status === 'MUTED';

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(issue.id);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-current={isSelected ? 'true' : undefined}
      onClick={() => onSelect(issue.id)}
      onKeyDown={handleKeyDown}
      className={cn(
        'w-full cursor-pointer rounded-lg border p-3 text-left transition-colors',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        isSelected
          ? 'border-primary bg-primary/5 dark:bg-primary/10'
          : 'border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800/60',
        deemphasized && 'opacity-60',
      )}
    >
      <div className="flex items-center gap-1.5">
        <SeverityBadge severity={issue.severity} />
        <SourceBadge source={issue.source} />
      </div>

      <p
        title={issue.title}
        className="mt-1.5 min-w-0 truncate text-sm font-medium text-zinc-900 dark:text-zinc-100"
      >
        {issue.title}
      </p>

      <p className="mt-0.5 min-w-0 truncate font-mono text-xs text-zinc-400 dark:text-zinc-500">
        {issue.code}
      </p>

      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs">
        <span className="font-medium text-zinc-600 dark:text-zinc-300">
          {issue.count} ocorrência{issue.count === 1 ? '' : 's'}
          {issue.impactedContacts > 0 &&
            ` · ${issue.impactedContacts} cliente${issue.impactedContacts === 1 ? '' : 's'} afetado${issue.impactedContacts === 1 ? '' : 's'}`}
        </span>
        <span title={absoluteTime(issue.lastSeenAt)} className="shrink-0 text-zinc-400 dark:text-zinc-500">
          {relativeTime(issue.lastSeenAt)}
        </span>
      </div>
    </div>
  );
}

export function BugList({
  items,
  total,
  page,
  perPage,
  isLoading,
  isError,
  onRetry,
  selectedId,
  onSelect,
  onPageChange,
  isDefaultFilters,
}: BugListProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
        <AlertTriangle className="h-8 w-8 text-red-500" />
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          Não deu pra carregar os problemas agora.
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Tentar de novo
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {isDefaultFilters
            ? 'Nada quebrado por aqui. 🎉'
            : 'Nenhum problema encontrado com esses filtros.'}
        </p>
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-2 sm:gap-1.5">
        {items.map((issue) => (
          <BugRow
            key={issue.id}
            issue={issue}
            isSelected={issue.id === selectedId}
            onSelect={onSelect}
          />
        ))}
      </div>

      {total > 0 && (
        <div className="flex items-center justify-between px-1 pt-1 text-xs text-zinc-500 dark:text-zinc-400">
          <span>
            Página {page} de {totalPages}
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="inline-flex items-center gap-1 rounded px-2 py-1 hover:bg-zinc-100 disabled:opacity-40 disabled:hover:bg-transparent dark:hover:bg-zinc-800"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Anterior
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="inline-flex items-center gap-1 rounded px-2 py-1 hover:bg-zinc-100 disabled:opacity-40 disabled:hover:bg-transparent dark:hover:bg-zinc-800"
            >
              Próxima <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
