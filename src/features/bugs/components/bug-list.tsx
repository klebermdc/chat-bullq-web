'use client';

import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { SeverityBadge, SourceBadge } from './severity-badge';
import type { BugIssue } from '../services/bugs.service';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';

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
    <div className="rounded-lg border border-border bg-card p-3">
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
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        isSelected
          ? 'border-primary bg-primary/10'
          : 'border-border bg-card hover:bg-muted',
        deemphasized && 'opacity-60',
      )}
    >
      <div className="flex items-center gap-1.5">
        <SeverityBadge severity={issue.severity} />
        <SourceBadge source={issue.source} />
      </div>

      <p
        title={issue.title}
        className="mt-1.5 min-w-0 truncate text-sm font-medium text-foreground"
      >
        {issue.title}
      </p>

      <p className="mt-0.5 min-w-0 truncate font-mono text-xs text-muted-foreground">
        {issue.code}
      </p>

      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs">
        <span className="font-medium text-muted-foreground">
          {issue.count} ocorrência{issue.count === 1 ? '' : 's'}
          {issue.impactedContacts > 0 &&
            ` · ${issue.impactedContacts} cliente${issue.impactedContacts === 1 ? '' : 's'} afetado${issue.impactedContacts === 1 ? '' : 's'}`}
        </span>
        <span title={absoluteTime(issue.lastSeenAt)} className="shrink-0 text-muted-foreground">
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
      <EmptyState
        size="sm"
        icon={AlertTriangle}
        title="Não foi possível carregar os problemas"
        description="Pode ser instabilidade momentânea."
        action={
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" /> Tentar de novo
          </Button>
        }
        className="rounded-xl border border-border bg-card"
      />
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        size="sm"
        icon={CheckCircle2}
        title={isDefaultFilters ? 'Nada quebrado por aqui' : 'Nenhum problema com esses filtros'}
        description={isDefaultFilters ? undefined : 'Limpe os filtros para ver todos os problemas.'}
        className="rounded-xl border border-border bg-card"
      />
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
        <div className="flex items-center justify-between px-1 pt-1 text-xs tabular-nums text-muted-foreground">
          <span>
            Página {page} de {totalPages}
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="inline-flex min-h-8 items-center gap-1 rounded-lg px-2 py-1 transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <ChevronLeft aria-hidden="true" className="h-3.5 w-3.5" /> Anterior
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="inline-flex min-h-8 items-center gap-1 rounded-lg px-2 py-1 transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent"
            >
              Próxima <ChevronRight aria-hidden="true" className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
