'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  CheckCircle2,
  CircleAlert,
  CircleSlash,
  XCircle,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { getSocket } from '@/lib/socket';
import {
  Automation,
  AutomationRun,
  AutomationRunStatus,
  automationsService,
} from '../services/automations.service';
import { ACTION_LABELS } from '../utils/labels';
import { EmptyState, LoadingState } from '@/components/ui/empty-state';
import { useDrawerDialog } from '@/components/layout/use-drawer-dialog';

// Resultado de cada ação dentro de uma execução, como vem do backend.
const ACTION_STATUS_LABELS: Record<string, string> = {
  success: 'Concluída',
  skipped: 'Ignorada',
  failed: 'Falhou',
  error: 'Falhou',
};

const STATUS_META: Record<
  AutomationRunStatus,
  { label: string; cls: string; Icon: typeof CheckCircle2 }
> = {
  SUCCESS: {
    label: 'Concluída',
    cls: 'bg-success-wash text-success-ink',
    Icon: CheckCircle2,
  },
  PARTIAL: {
    label: 'Parcial',
    cls: 'bg-warning-wash text-warning-ink',
    Icon: CircleAlert,
  },
  FAILED: {
    label: 'Falhou',
    cls: 'bg-urgent-wash text-urgent-ink',
    Icon: XCircle,
  },
  SKIPPED: {
    label: 'Ignorada',
    cls: 'bg-muted text-muted-foreground',
    Icon: CircleSlash,
  },
};

export function AutomationRunsPanel({
  automation,
  onClose,
}: {
  automation: Automation;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<AutomationRunStatus | 'ALL'>(
    'ALL',
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { panelProps, titleId } = useDrawerDialog(onClose);

  const { data: runsData, isLoading } = useQuery({
    queryKey: ['automation-runs', automation.id, statusFilter],
    queryFn: () =>
      automationsService.runs(automation.id, {
        limit: 50,
        ...(statusFilter !== 'ALL' ? { status: statusFilter } : {}),
      }),
    // No polling — Socket.IO `automation:run` push handles freshness.
  });

  // Subscribe to live runs. Backend emits to room `org:{orgId}` whenever
  // an AutomationRun is created. We prepend the new row into this query's
  // cache without refetching — single round-trip when the panel mounts,
  // then push-only.
  useEffect(() => {
    const socket = getSocket();
    const handler = (msg: { automationId: string; run: AutomationRun }) => {
      if (msg.automationId !== automation.id) return;
      // Respect the active status filter — runs that don't match are
      // dropped client-side instead of polluting the visible list.
      if (statusFilter !== 'ALL' && msg.run.status !== statusFilter) return;
      qc.setQueryData(
        ['automation-runs', automation.id, statusFilter],
        (prev: { data: AutomationRun[]; nextCursor: string | null } | undefined) => {
          const existing = prev?.data ?? [];
          // Idempotent prepend in case the same event arrives twice
          // (socket reconnect can replay during transports switch).
          if (existing.some((r) => r.id === msg.run.id)) return prev;
          return {
            data: [msg.run, ...existing].slice(0, 50),
            nextCursor: prev?.nextCursor ?? null,
          };
        },
      );
    };
    socket.on('automation:run', handler);
    return () => {
      socket.off('automation:run', handler);
    };
  }, [automation.id, statusFilter, qc]);

  const runs = runsData?.data ?? [];

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* O fundo fecha no clique; no teclado, Esc ou o botão Fechar. */}
      <div aria-hidden="true" className="flex-1 bg-zinc-950/50" onClick={onClose} />
      <div
        {...panelProps}
        className="flex h-full w-full max-w-xl flex-col border-l border-border bg-card shadow-overlay focus:outline-none"
      >
        <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-semibold text-foreground">Histórico de execuções</h2>
            <p className="truncate text-xs text-muted-foreground">{automation.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            title="Fechar"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </header>

        <div className="border-b border-border px-5 py-3">
          <div className="flex flex-wrap gap-1">
            {(['ALL', 'SUCCESS', 'PARTIAL', 'FAILED', 'SKIPPED'] as const).map(
              (s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={statusFilter === s}
                  onClick={() => setStatusFilter(s)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    statusFilter === s
                      ? 'bg-primary/10 text-primary'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {s === 'ALL' ? 'Todas' : STATUS_META[s].label}
                </button>
              ),
            )}
          </div>
          {automation.autoPausedAt && (
            <div className="mt-3 rounded-lg bg-urgent-wash p-3 text-xs text-urgent-ink">
              <strong>Pausada automaticamente:</strong>{' '}
              {automation.autoPausedReason}
              <br />
              <span className="opacity-80">
                Reative para zerar o contador de falhas.
              </span>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading && <LoadingState />}
          {!isLoading && runs.length === 0 && (
            <EmptyState
              size="sm"
              icon={Activity}
              title={
                statusFilter === 'ALL'
                  ? 'Nenhuma execução ainda'
                  : 'Nenhuma execução com esse filtro'
              }
              description={
                statusFilter === 'ALL'
                  ? 'As execuções aparecem aqui assim que a automação rodar.'
                  : undefined
              }
            />
          )}
          <ul className="divide-y divide-border">
            {runs.map((run) => (
              <RunRow
                key={run.id}
                run={run}
                expanded={expandedId === run.id}
                onToggle={() =>
                  setExpandedId(expandedId === run.id ? null : run.id)
                }
              />
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function RunRow({
  run,
  expanded,
  onToggle,
}: {
  run: AutomationRun;
  expanded: boolean;
  onToggle: () => void;
}) {
  const meta = STATUS_META[run.status];
  const Icon = meta.Icon;
  return (
    <li>
      <button
        type="button"
        aria-expanded={expanded}
        className="flex w-full items-start gap-3 px-5 py-3 text-left transition-colors hover:bg-muted"
        onClick={onToggle}
      >
        <span
          className={`mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${meta.cls}`}
        >
          <Icon aria-hidden="true" className="h-3 w-3" />
          {meta.label}
        </span>
        <div className="min-w-0 flex-1 text-sm">
          <div className="flex items-center justify-between gap-2 font-mono text-xs tabular-nums text-muted-foreground">
            <span>{new Date(run.startedAt).toLocaleString('pt-BR')}</span>
            {run.durationMs !== null && (
              <span>{run.durationMs} ms</span>
            )}
          </div>
          {run.errorCode && (
            <div className="mt-1 break-words text-xs text-urgent-ink">
              {run.errorCode}
              {run.errorMessage && `: ${run.errorMessage}`}
            </div>
          )}
          <div className="mt-1 text-xs text-muted-foreground">
            {run.actionsLog.length === 0
              ? 'sem ações executadas'
              : `${run.actionsLog.length} ${
                  run.actionsLog.length === 1 ? 'ação' : 'ações'
                }`}
          </div>
        </div>
      </button>
      {expanded && (
        <div className="bg-muted/50 px-5 py-3">
          {run.actionsLog.length > 0 ? (
            <ol className="space-y-2 text-xs">
              {run.actionsLog.map((entry, i) => (
                <li
                  key={i}
                  className="rounded-lg border border-border bg-card p-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-foreground">
                      {entry.index + 1}. {ACTION_LABELS[entry.type]}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums ${
                        entry.status === 'success'
                          ? 'bg-success-wash text-success-ink'
                          : entry.status === 'skipped'
                            ? 'bg-muted text-muted-foreground'
                            : 'bg-urgent-wash text-urgent-ink'
                      }`}
                    >
                      {ACTION_STATUS_LABELS[entry.status] ?? entry.status} · {entry.durationMs} ms
                    </span>
                  </div>
                  {entry.errorCode && (
                    <div className="mt-1 break-words text-urgent-ink">
                      {entry.errorCode}
                      {entry.errorMessage && `: ${entry.errorMessage}`}
                    </div>
                  )}
                  {entry.output && Object.keys(entry.output).length > 0 && (
                    <pre className="mt-1 overflow-x-auto text-[11px] text-muted-foreground">
                      {JSON.stringify(entry.output, null, 2)}
                    </pre>
                  )}
                </li>
              ))}
            </ol>
          ) : (
            <div className="text-xs text-muted-foreground">
              Nenhuma ação executada (execução ignorada).
            </div>
          )}
          <details className="mt-3 text-xs">
            <summary className="cursor-pointer text-muted-foreground">
              Ver dados do gatilho
            </summary>
            <pre className="mt-2 overflow-x-auto rounded-lg border border-border bg-card p-2 text-[11px] text-foreground">
              {JSON.stringify(run.triggerPayload, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </li>
  );
}
