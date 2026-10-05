'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  X,
  Bot,
  Wrench,
} from 'lucide-react';
import {
  aiAgentsService,
  type FeedRun,
} from '@/features/ai-agents/services/ai-agents.service';
import { useSocket } from '../hooks/use-socket';
import { EmptyState, LoadingState } from '@/components/ui/empty-state';

type ToolCall = FeedRun['toolCalls'][number];

interface AgentRunsSidebarProps {
  conversationId: string;
  onClose: () => void;
}

/**
 * Per-conversation agent execution log. Reactive: subscribes to the
 * `ai:run:*` socket events emitted by the backend's runner so operators
 * see tool calls land in real time as the agent works through a turn.
 *
 * The user joins `conv:<id>` while the chat panel is open (chat-panel.tsx
 * handles join/leave on mount/unmount), so this sidebar inherits that
 * subscription — we don't re-join here.
 */
export function AgentRunsSidebar({
  conversationId,
  onClose,
}: AgentRunsSidebarProps) {
  const queryClient = useQueryClient();
  const { on } = useSocket();

  const queryKey = useMemo(
    () => ['agent-runs', conversationId] as const,
    [conversationId],
  );

  const { data: runs = [], isLoading } = useQuery({
    queryKey,
    queryFn: () =>
      aiAgentsService.feed({ conversationId, period: 'all', limit: 30 }),
    refetchInterval: 30000,
    staleTime: 5000,
  });

  // Auto-expand the most recent run on first load — operators almost
  // always want to see what's happening *right now* without an extra
  // click. Older runs stay collapsed.
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (runs.length === 0) return;
    setExpandedIds((prev) => {
      if (prev.size > 0) return prev;
      return new Set([runs[0].id]);
    });
  }, [runs]);

  // Realtime wiring. We mutate the cache directly so the UI updates
  // without a network roundtrip; tools land instantly as the agent
  // emits them.
  useEffect(() => {
    const unsubStart = on('ai:run:start', (payload: any) => {
      if (payload?.conversationId !== conversationId) return;
      queryClient.setQueryData<FeedRun[]>(queryKey, (prev) => {
        const list = prev ?? [];
        if (list.some((r) => r.id === payload.runId)) return list;
        const fresh: FeedRun = {
          id: payload.runId,
          agentId: payload.agent?.id ?? '',
          conversationId,
          modelId: payload.modelId ?? '',
          status: 'RUNNING',
          finalAction: null,
          errorMessage: null,
          inputTokens: 0,
          outputTokens: 0,
          cacheReadTokens: 0,
          cacheWriteTokens: 0,
          costUsd: '0',
          durationMs: null,
          startedAt: payload.startedAt ?? new Date().toISOString(),
          finishedAt: null,
          agent: payload.agent ?? { id: '', name: 'Agent', kind: 'WORKER' },
          toolCalls: [],
          failedToolCalls: 0,
          hasFailedToolCalls: false,
        };
        return [fresh, ...list];
      });
      // Always expand a freshly started run.
      setExpandedIds((prev) => new Set([payload.runId, ...prev]));
    });

    const unsubTool = on('ai:run:tool-call', (payload: any) => {
      if (payload?.conversationId !== conversationId) return;
      queryClient.setQueryData<FeedRun[]>(queryKey, (prev) => {
        if (!prev) return prev;
        return prev.map((r) => {
          if (r.id !== payload.runId) return r;
          if (r.toolCalls.some((t) => t.id === payload.toolCall?.id)) return r;
          const tc: ToolCall = payload.toolCall;
          const failed = isToolCallFailure(tc);
          return {
            ...r,
            toolCalls: [...r.toolCalls, tc],
            failedToolCalls: (r.failedToolCalls ?? 0) + (failed ? 1 : 0),
            hasFailedToolCalls: r.hasFailedToolCalls || failed,
          };
        });
      });
    });

    const unsubEnd = on('ai:run:end', (payload: any) => {
      if (payload?.conversationId !== conversationId) return;
      queryClient.setQueryData<FeedRun[]>(queryKey, (prev) => {
        if (!prev) return prev;
        return prev.map((r) =>
          r.id === payload.runId
            ? {
                ...r,
                status: payload.status,
                finalAction: payload.finalAction ?? null,
                errorMessage: payload.errorMessage ?? null,
                finishedAt: payload.finishedAt ?? null,
                durationMs: payload.durationMs ?? r.durationMs,
                inputTokens: payload.inputTokens ?? r.inputTokens,
                outputTokens: payload.outputTokens ?? r.outputTokens,
                cacheReadTokens: payload.cacheReadTokens ?? r.cacheReadTokens,
                cacheWriteTokens: payload.cacheWriteTokens ?? r.cacheWriteTokens,
                costUsd: String(payload.costUsd ?? r.costUsd),
              }
            : r,
        );
      });
    });

    return () => {
      unsubStart?.();
      unsubTool?.();
      unsubEnd?.();
    };
  }, [conversationId, on, queryClient, queryKey]);

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <aside className="fixed inset-0 z-50 flex h-full w-full flex-col bg-card lg:static lg:inset-auto lg:z-auto lg:w-80 lg:shrink-0 lg:border-l lg:border-border">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Activity className="h-3.5 w-3.5 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">
            Logs do agente
          </h2>
        </div>
        <button
          onClick={onClose}
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Fechar logs"
          title="Fechar logs"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading ? (
          <LoadingState label="Carregando logs…" />
        ) : runs.length === 0 ? (
          <EmptyState
            icon={Bot}
            size="sm"
            title="Nenhum agente rodou nesta conversa ainda"
            description="Os logs aparecem aqui em tempo real assim que a IA executar."
            className="px-6"
          />
        ) : (
          <div className="flex flex-col">
            {runs.map((run) => (
              <RunCard
                key={run.id}
                run={run}
                expanded={expandedIds.has(run.id)}
                onToggle={() => toggleExpanded(run.id)}
              />
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}

function RunCard({
  run,
  expanded,
  onToggle,
}: {
  run: FeedRun;
  expanded: boolean;
  onToggle: () => void;
}) {
  const isRunning = run.status === 'RUNNING';
  const failed =
    run.status === 'FAILED' || run.hasFailedToolCalls === true;
  return (
    <div className="border-b border-border">
      <button
        onClick={onToggle}
        className="flex w-full items-start gap-2 px-4 py-2.5 text-left hover:bg-muted/50"
      >
        <span className="mt-0.5 shrink-0">
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </span>
        <span className="shrink-0">
          {isRunning ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
          ) : failed ? (
            <XCircle className="h-3.5 w-3.5 text-urgent-ink" />
          ) : (
            <CheckCircle2 className="h-3.5 w-3.5 text-success-ink" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1.5">
            <span className="truncate text-[13px] font-medium text-foreground">
              {run.agent.name}
            </span>
            {isRunning && (
              <span className="text-[11px] font-medium uppercase tracking-wide text-primary">
                Rodando
              </span>
            )}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
            <span>{formatRelative(run.startedAt)}</span>
            {run.durationMs != null && (
              <span>· {formatDuration(run.durationMs)}</span>
            )}
            {run.finalAction && (
              <span className="rounded bg-muted px-1 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {humanFinalAction(run.finalAction)}
              </span>
            )}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="bg-muted/50 px-4 pb-3 pt-1">
          {run.errorMessage && (
            <div className="mb-2 flex items-start gap-1.5 rounded border border-urgent/30 bg-urgent-wash px-2 py-1.5 text-[11px] text-urgent-ink">
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
              <span className="flex-1">{run.errorMessage}</span>
            </div>
          )}

          {run.toolCalls.length === 0 ? (
            <p className="py-1 text-[11px] text-muted-foreground">
              {isRunning ? 'Aguardando a primeira ferramenta…' : 'Nenhuma ferramenta foi chamada.'}
            </p>
          ) : (
            <ul className="space-y-1">
              {run.toolCalls.map((tc) => (
                <ToolCallRow key={tc.id} tc={tc} />
              ))}
            </ul>
          )}

          <RunFooter run={run} />
        </div>
      )}
    </div>
  );
}

function ToolCallRow({ tc }: { tc: ToolCall }) {
  const failed = isToolCallFailure(tc);
  const [open, setOpen] = useState(false);
  return (
    <li>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-1.5 rounded px-1 py-0.5 text-left hover:bg-muted"
      >
        {failed ? (
          <XCircle className="h-3 w-3 shrink-0 text-urgent-ink" />
        ) : (
          <Wrench className="h-3 w-3 shrink-0 text-muted-foreground" />
        )}
        <span
          className={`flex-1 truncate text-[11px] font-medium ${
            failed
              ? 'text-urgent-ink'
              : 'text-foreground'
          }`}
        >
          {tc.toolName}
        </span>
        {tc.durationMs != null && (
          <span className="shrink-0 text-[11px] text-muted-foreground">
            {formatDuration(tc.durationMs)}
          </span>
        )}
      </button>
      {open && (
        <div className="mt-0.5 ml-4 space-y-1.5 rounded border border-border bg-card px-2 py-1.5">
          <JsonBlock label="input" value={tc.input} />
          <JsonBlock label="output" value={tc.output} />
          {tc.error && (
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-urgent-ink">
                error
              </p>
              <p className="mt-0.5 text-[11px] text-urgent-ink">
                {tc.error}
              </p>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function JsonBlock({ label, value }: { label: string; value: unknown }) {
  if (value === null || value === undefined) return null;
  let formatted: string;
  try {
    formatted = JSON.stringify(value, null, 2);
  } catch {
    formatted = String(value);
  }
  // Truncate large payloads — operators rarely need 5KB of JSON inline.
  const truncated =
    formatted.length > 600 ? formatted.slice(0, 600) + '\n…[cortado]' : formatted;
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <pre className="mt-0.5 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded bg-muted/50 px-1.5 py-1 font-mono text-[11px] leading-tight text-foreground">
        {truncated}
      </pre>
    </div>
  );
}

function RunFooter({ run }: { run: FeedRun }) {
  const cost = parseFloat(run.costUsd) || 0;
  const tokens =
    run.inputTokens + run.outputTokens + run.cacheReadTokens + run.cacheWriteTokens;
  if (cost === 0 && tokens === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-0.5 border-t border-border pt-1.5 font-mono text-[11px] tabular-nums text-muted-foreground">
      {tokens > 0 && (
        <span>
          {run.inputTokens} de entrada · {run.outputTokens} de saída
        </span>
      )}
      {cost > 0 && <span>US$ {cost.toFixed(4)}</span>}
    </div>
  );
}

function isToolCallFailure(tc: ToolCall): boolean {
  if (tc.error) return true;
  const out = tc.output as any;
  if (!out || typeof out !== 'object') return false;
  if (out.ok === false) return true;
  const status = out.status ?? out.statusCode;
  if (typeof status === 'number' && status >= 400) return true;
  return false;
}

function humanFinalAction(action: string): string {
  const map: Record<string, string> = {
    REPLIED: 'reply',
    TRANSFERRED: 'transfer',
    DELEGATED: 'delegate',
    HANDED_BACK: 'hand back',
    TAGGED: 'tag',
    CLOSED_CONVERSATION: 'closed',
    NO_ACTION: 'no-op',
  };
  return map[action] ?? action.toLowerCase();
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatRelative(iso: string): string {
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  if (diff < 60_000) return 'agora';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}min`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  });
}
