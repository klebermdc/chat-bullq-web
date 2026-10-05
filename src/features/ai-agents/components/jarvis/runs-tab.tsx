'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock,
  Filter,
  XCircle,
  ExternalLink,
  X,
} from 'lucide-react';
import {
  aiAgentsService,
  type FeedRun,
  type Period,
} from '../../services/ai-agents.service';
import { Button } from '@/components/ui/button';
import { controlSmCls } from '@/components/ui/control';
import { EmptyState } from '@/components/ui/empty-state';
import { finalActionMeta, runStatusMeta } from './format';
import { useDrawerDialog } from '@/components/layout/use-drawer-dialog';

type RunStatus = FeedRun['status'];

const iconBtnCls =
  'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors ' +
  'hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

/**
 * "Execuções" tab for Jarvis. Lists every agent run with full tool-call
 * history so the operator can spot silent skill failures (e.g. resetPassword
 * returning 404). Auto-refreshes every 10s while the tab is open.
 */
export function JarvisRunsTab() {
  const [period, setPeriod] = useState<Period | 'all'>('7d');
  const [status, setStatus] = useState<RunStatus | ''>('');
  const [hasErrors, setHasErrors] = useState(false);
  const [agentId, setAgentId] = useState<string>('');
  const [selectedRun, setSelectedRun] = useState<FeedRun | null>(null);

  const { data: agents } = useQuery({
    queryKey: ['ai-agents'],
    queryFn: () => aiAgentsService.list(),
  });

  const { data: runs, isLoading } = useQuery({
    queryKey: ['ai-agents-runs-feed', { period, status, hasErrors, agentId }],
    queryFn: () =>
      aiAgentsService.feed({
        period: period === 'all' ? 'all' : period,
        status: status || undefined,
        hasErrors: hasErrors || undefined,
        agentId: agentId || undefined,
        limit: 100,
      }),
    refetchInterval: 10_000,
  });

  const errorCount = useMemo(
    () => (runs ?? []).filter((r) => r.hasFailedToolCalls || r.status === 'FAILED').length,
    [runs],
  );

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border bg-background px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Execuções
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Histórico de execuções e chamadas de ferramenta — atualiza a cada 10 s
            </p>
          </div>
          {errorCount > 0 && (
            <div className="inline-flex items-center gap-2 rounded-lg bg-urgent-wash px-3 py-1.5 text-sm text-urgent-ink">
              <AlertTriangle aria-hidden="true" className="h-4 w-4" />
              <span className="font-medium tabular-nums">{errorCount}</span> com falha
            </div>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Filter aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
          <select
            aria-label="Período"
            value={period}
            onChange={(e) => setPeriod(e.target.value as Period | 'all')}
            className={controlSmCls}
          >
            <option value="24h">Últimas 24 h</option>
            <option value="7d">7 dias</option>
            <option value="30d">30 dias</option>
            <option value="all">Tudo</option>
          </select>
          <select
            aria-label="Resultado"
            value={status}
            onChange={(e) => setStatus(e.target.value as RunStatus | '')}
            className={controlSmCls}
          >
            <option value="">Todos os resultados</option>
            <option value="COMPLETED">Concluída</option>
            <option value="FAILED">Falhou</option>
            <option value="RUNNING">Em andamento</option>
            <option value="SKIPPED">Ignorada</option>
          </select>
          <select
            aria-label="Agente"
            value={agentId}
            onChange={(e) => setAgentId(e.target.value)}
            className={`${controlSmCls} max-w-full`}
          >
            <option value="">Todos os agentes</option>
            {(agents ?? []).map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-input bg-background px-2.5 text-xs text-foreground shadow-soft">
            <input
              type="checkbox"
              checked={hasErrors}
              onChange={(e) => setHasErrors(e.target.checked)}
              className="h-3.5 w-3.5 accent-primary"
            />
            Só com erros
          </label>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-2 p-4 sm:p-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-lg bg-muted"
              />
            ))}
          </div>
        ) : (runs?.length ?? 0) === 0 ? (
          <EmptyState
            icon={Activity}
            title="Nenhuma execução com esse filtro"
            description="Amplie o período ou limpe os filtros para ver mais execuções."
            className="h-full"
          />
        ) : (
          <div className="divide-y divide-border">
            {runs!.map((run) => (
              <RunRow
                key={run.id}
                run={run}
                onSelect={() => setSelectedRun(run)}
              />
            ))}
          </div>
        )}
      </div>

      {selectedRun && (
        <RunDetailDrawer run={selectedRun} onClose={() => setSelectedRun(null)} />
      )}
    </div>
  );
}

function RunRow({ run, onSelect }: { run: FeedRun; onSelect: () => void }) {
  const failed = run.hasFailedToolCalls || run.status === 'FAILED';
  const cost = parseFloat(run.costUsd) || 0;
  return (
    <button
      onClick={onSelect}
      type="button"
      className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-6 ${
        failed ? 'bg-urgent-wash/40' : ''
      }`}
    >
      <div className="w-4 flex-shrink-0">
        {failed ? (
          <XCircle aria-hidden="true" className="h-4 w-4 text-urgent-ink" />
        ) : run.status === 'COMPLETED' ? (
          <CheckCircle2 aria-hidden="true" className="h-4 w-4 text-success-ink" />
        ) : (
          <Clock aria-hidden="true" className="h-4 w-4 text-warning-ink" />
        )}
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-medium text-foreground">
              {run.agent.name}
            </span>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${runStatusMeta(run.status).color}`}
            >
              {runStatusMeta(run.status).label}
            </span>
            {run.finalAction && (
              <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                {finalActionMeta(run.finalAction).label}
              </span>
            )}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] tabular-nums text-muted-foreground">
            <span>{new Date(run.startedAt).toLocaleString('pt-BR')}</span>
            <span>·</span>
            <span>{run.modelId}</span>
            {run.durationMs != null && (
              <>
                <span>·</span>
                <span>{(run.durationMs / 1000).toFixed(1)} s</span>
              </>
            )}
            {cost > 0 && (
              <>
                <span>·</span>
                <span>${cost.toFixed(4)}</span>
              </>
            )}
            <span>·</span>
            <span>
              {run.toolCalls.length}{' '}
              {run.toolCalls.length === 1 ? 'chamada de ferramenta' : 'chamadas de ferramenta'}
            </span>
            {(run.failedToolCalls ?? 0) > 0 && (
              <span className="inline-flex items-center gap-1 font-medium text-urgent-ink">
                <AlertTriangle aria-hidden="true" className="h-3 w-3" />
                {run.failedToolCalls} {run.failedToolCalls === 1 ? 'falhou' : 'falharam'}
              </span>
            )}
          </div>
          {run.errorMessage && (
            <div className="mt-1 truncate text-[11px] text-urgent-ink">
              {run.errorMessage}
            </div>
          )}
        </div>
        <span className="flex-shrink-0 text-muted-foreground">
          <ChevronRight aria-hidden="true" className="h-4 w-4" />
        </span>
      </div>
    </button>
  );
}

function RunDetailDrawer({ run, onClose }: { run: FeedRun; onClose: () => void }) {
  const router = useRouter();
  const { panelProps, titleId } = useDrawerDialog(onClose);

  const isFailedToolCall = (tc: FeedRun['toolCalls'][number]) => {
    if (tc.error) return true;
    const out = tc.output as Record<string, any> | null;
    if (!out || typeof out !== 'object') return false;
    if (out.ok === false) return true;
    const status = Number(out.status);
    return Number.isFinite(status) && status >= 400;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-zinc-950/50"
      onClick={onClose}
    >
      <div
        {...panelProps}
        className="flex h-full w-full max-w-2xl flex-col border-l border-border bg-card shadow-overlay focus:outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <h3 id={titleId} className="text-lg font-semibold text-foreground">
              Execução de {run.agent.name}
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${runStatusMeta(run.status).color}`}
              >
                {runStatusMeta(run.status).label}
              </span>
              {run.finalAction && (
                <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                  {finalActionMeta(run.finalAction).label}
                </span>
              )}
              <span className="tabular-nums">{new Date(run.startedAt).toLocaleString('pt-BR')}</span>
              {run.durationMs != null && (
                <span className="tabular-nums">· {(run.durationMs / 1000).toFixed(1)} s</span>
              )}
              <span>· {run.modelId}</span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                router.push(`/inbox?conversationId=${run.conversationId}`)
              }
            >
              <ExternalLink aria-hidden="true" className="h-3 w-3" /> Ver conversa
            </Button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              title="Fechar"
              className={iconBtnCls}
            >
              <X aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          {run.errorMessage && (
            <div className="mb-4 rounded-lg bg-urgent-wash p-3 text-sm text-urgent-ink">
              <div className="flex items-start gap-2">
                <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium">Erro da execução</p>
                  <p className="mt-0.5 break-words text-xs">{run.errorMessage}</p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Chamadas de ferramenta ({run.toolCalls.length})
            </p>
            {run.toolCalls.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma ferramenta foi chamada nesta execução.
              </p>
            ) : (
              run.toolCalls.map((tc) => {
                const failed = isFailedToolCall(tc);
                return (
                  <div
                    key={tc.id}
                    className={`rounded-lg border p-3 ${
                      failed
                        ? 'border-urgent/30 bg-urgent-wash/50'
                        : 'border-border'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        {failed ? (
                          <XCircle aria-hidden="true" className="h-4 w-4 shrink-0 text-urgent-ink" />
                        ) : (
                          <CheckCircle2 aria-hidden="true" className="h-4 w-4 shrink-0 text-success-ink" />
                        )}
                        <code className="truncate text-sm font-medium text-foreground">
                          {tc.toolName}
                        </code>
                        <span className="sr-only">{failed ? 'Falhou' : 'Concluída'}</span>
                      </div>
                      <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
                        {new Date(tc.createdAt).toLocaleTimeString('pt-BR')}
                        {tc.durationMs != null && ` · ${tc.durationMs} ms`}
                      </span>
                    </div>
                    {tc.error && (
                      <p className="mt-2 rounded bg-urgent-wash px-2 py-1 text-[11px] text-urgent-ink">
                        {tc.error}
                      </p>
                    )}
                    <details className="mt-2 group">
                      <summary className="cursor-pointer select-none text-[11px] text-muted-foreground hover:text-foreground">
                        Entrada
                      </summary>
                      <pre className="mt-1 overflow-x-auto rounded bg-muted p-2 text-[11px] text-foreground">
                        {JSON.stringify(tc.input, null, 2)}
                      </pre>
                    </details>
                    <details className="mt-1 group">
                      <summary className="cursor-pointer select-none text-[11px] text-muted-foreground hover:text-foreground">
                        Saída
                      </summary>
                      <pre
                        className={`mt-1 overflow-x-auto rounded p-2 text-[11px] ${
                          failed
                            ? 'bg-urgent-wash text-urgent-ink'
                            : 'bg-muted text-foreground'
                        }`}
                      >
                        {JSON.stringify(tc.output, null, 2)}
                      </pre>
                    </details>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
