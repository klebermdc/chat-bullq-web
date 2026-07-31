'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle,
  BellOff,
  Check,
  ChevronDown,
  ExternalLink,
  Loader2,
  RefreshCw,
  RotateCcw,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Dropdown, DropdownButton, DropdownItem, DropdownMenu } from '@/components/ui/dropdown';
import { bugsService, type ErrorIssueStatus } from '../services/bugs.service';
import { SeverityBadge, SourceBadge } from './severity-badge';

// "agora" / "há N min" / "há N h" / "há N d" — mesmo helper local de bug-list.tsx
// (projeto sem date-fns/dayjs; cada arquivo mantém a própria cópia).
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

// Janelas de silenciamento com prazo, calculadas no cliente. "Indefinidamente" não
// manda `mutedUntil` (nem `null`, nem `''`) — undefined some do JSON no `api.patch`
// e o backend trata a ausência do campo como "sem prazo".
const MUTE_OPTIONS: { label: string; hours: number | null }[] = [
  { label: '1 hora', hours: 1 },
  { label: '24 horas', hours: 24 },
  { label: '7 dias', hours: 24 * 7 },
  { label: 'Indefinidamente', hours: null },
];

const actionBtnCls =
  'inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50';
const secondaryBtnCls =
  'border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800';

interface BugDetailProps {
  id: string;
  onClose: () => void;
  /** Chamado após qualquer mudança de status, para a lista recarregar. */
  onChanged: () => void;
}

export function BugDetail({ id, onClose, onChanged }: BugDetailProps) {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['bug-detail', id],
    queryFn: () => bugsService.detail(id),
  });

  const mutation = useMutation({
    mutationFn: (vars: { status: ErrorIssueStatus; mutedUntil?: string }) =>
      bugsService.updateStatus(id, vars.status, vars.mutedUntil),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bug-detail', id] });
      onChanged();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Falha ao atualizar o problema.'),
  });

  const handleMute = (hours: number | null) => {
    if (hours === null) {
      mutation.mutate({ status: 'MUTED' });
      return;
    }
    mutation.mutate({
      status: 'MUTED',
      mutedUntil: new Date(Date.now() + hours * 60 * 60 * 1000).toISOString(),
    });
  };

  // Única fonte da ordenação: newest-first, capado em 50 — usado tanto na
  // timeline quanto para achar a ocorrência selecionada (Contexto).
  const occurrences = useMemo(() => {
    const list = data?.occurrences ?? [];
    return [...list]
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
      .slice(0, 50);
  }, [data]);
  const selected = occurrences.find((o) => o.id === selectedId) ?? occurrences[0] ?? null;

  const counters = data
    ? [
        { label: 'Ocorrências', value: String(data.count) },
        { label: 'Clientes afetados', value: String(data.impactedContacts) },
        { label: 'Primeira vez', value: absoluteTime(data.firstSeenAt), sub: relativeTime(data.firstSeenAt) },
        { label: 'Última vez', value: absoluteTime(data.lastSeenAt), sub: relativeTime(data.lastSeenAt) },
      ]
    : [];

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">
          Detalhe do problema
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {isLoading && (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-16 w-full" />
        </div>
      )}

      {isError && (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <AlertTriangle className="h-8 w-8 text-red-500" />
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Não deu pra carregar o detalhe desse problema.
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className={cn(actionBtnCls, secondaryBtnCls)}
          >
            <RefreshCw className="h-3.5 w-3.5" /> Tentar de novo
          </button>
        </div>
      )}

      {data && (
        <>
          {/* Header */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5">
              <SeverityBadge severity={data.severity} />
              <SourceBadge source={data.source} />
            </div>
            <h2 className="whitespace-normal break-words text-base font-medium text-zinc-900 dark:text-zinc-100">
              {data.title}
            </h2>
            <p className="break-all font-mono text-xs text-zinc-400 dark:text-zinc-500">{data.code}</p>
          </div>

          {/* Counters */}
          <div className="grid grid-cols-2 gap-3 rounded-md bg-zinc-50 p-3 text-xs dark:bg-zinc-800/60 sm:grid-cols-4">
            {counters.map((c) => (
              <div key={c.label}>
                <p className="text-zinc-400 dark:text-zinc-500">{c.label}</p>
                <p className="mt-0.5 font-medium text-zinc-900 dark:text-zinc-100" title={c.value}>
                  {c.value}
                </p>
                {c.sub && <p className="text-zinc-400 dark:text-zinc-500">{c.sub}</p>}
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={mutation.isPending || data.status === 'RESOLVED'}
              onClick={() => mutation.mutate({ status: 'RESOLVED' })}
              className={cn(actionBtnCls, 'border-transparent bg-primary text-white hover:bg-primary/90')}
            >
              <Check className="h-3.5 w-3.5" /> Resolver
            </button>

            <Dropdown>
              <DropdownButton
                as="button"
                type="button"
                disabled={mutation.isPending}
                className={cn(actionBtnCls, secondaryBtnCls)}
              >
                <BellOff className="h-3.5 w-3.5" /> Silenciar
              </DropdownButton>
              <DropdownMenu>
                {MUTE_OPTIONS.map((opt) => (
                  <DropdownItem key={opt.label} onClick={() => handleMute(opt.hours)}>
                    {opt.label}
                  </DropdownItem>
                ))}
              </DropdownMenu>
            </Dropdown>

            {data.status !== 'OPEN' && (
              <button
                type="button"
                disabled={mutation.isPending}
                onClick={() => mutation.mutate({ status: 'OPEN' })}
                className={cn(actionBtnCls, secondaryBtnCls)}
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reabrir
              </button>
            )}

            {mutation.isPending && (
              <span className="inline-flex items-center gap-1 text-xs text-zinc-400 dark:text-zinc-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Salvando…
              </span>
            )}
          </div>

          {/* Timeline */}
          <div>
            <p className="mb-2 text-xs font-medium text-zinc-600 dark:text-zinc-300">
              Linha do tempo ({occurrences.length})
            </p>
            <div className="flex max-h-72 flex-col gap-1 overflow-y-auto">
              {occurrences.map((occ) => (
                <div
                  key={occ.id}
                  role="button"
                  tabIndex={0}
                  aria-current={occ.id === selected?.id ? 'true' : undefined}
                  onClick={() => setSelectedId(occ.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedId(occ.id);
                    }
                  }}
                  className={cn(
                    'flex cursor-pointer flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-md border px-2.5 py-1.5 text-xs transition-colors',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                    occ.id === selected?.id
                      ? 'border-primary bg-primary/5 dark:bg-primary/10'
                      : 'border-transparent hover:bg-zinc-50 dark:hover:bg-zinc-800/60',
                  )}
                >
                  <span title={absoluteTime(occ.occurredAt)} className="text-zinc-600 dark:text-zinc-300">
                    {absoluteTime(occ.occurredAt)}{' '}
                    <span className="text-zinc-400 dark:text-zinc-500">({relativeTime(occ.occurredAt)})</span>
                  </span>
                  {occ.conversationId && (
                    <Link
                      href={`/inbox?conversationId=${occ.conversationId}`}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" /> Abrir conversa
                    </Link>
                  )}
                </div>
              ))}
              {occurrences.length === 0 && (
                <p className="py-2 text-xs text-zinc-400 dark:text-zinc-500">Nenhuma ocorrência registrada.</p>
              )}
            </div>
          </div>

          {/* Stack */}
          <details className="group">
            <summary className="flex cursor-pointer select-none list-none items-center gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-300">
              <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
              Stack
            </summary>
            <div className="mt-2 overflow-x-auto rounded-md bg-zinc-50 dark:bg-zinc-900">
              <pre className="whitespace-pre p-3 font-mono text-xs text-zinc-700 dark:text-zinc-300">
                {data.lastStack || 'Sem stack registrado.'}
              </pre>
            </div>
          </details>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            Segredos e telefones já são ocultados na coleta, mas o stack é texto livre — confira
            antes de colar em qualquer lugar.
          </p>

          {/* Context */}
          <div>
            <p className="mb-2 text-xs font-medium text-zinc-600 dark:text-zinc-300">Contexto</p>
            <div className="overflow-x-auto rounded-md bg-zinc-50 dark:bg-zinc-900">
              <pre className="whitespace-pre p-3 font-mono text-xs text-zinc-700 dark:text-zinc-300">
                {selected ? JSON.stringify(selected.context, null, 2) : 'Sem ocorrência selecionada.'}
              </pre>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
