'use client';

import { useId, useState } from 'react';
import { Activity, ChevronDown, ChevronRight } from 'lucide-react';
import { formatModelLabel, type FeedRun } from '../../services/ai-agents.service';
import {
  finalActionMeta,
  runStatusMeta,
  fmtMs,
  fmtNum,
  fmtRelative,
  fmtUsd,
} from './format';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import {
  TableCard,
  tbodyCls, tdBaseCls, tdMutedCls, tdNumCls, thCls, thNumCls, theadCls, trCls,
} from '@/features/crm-reports/components/table-parts';
import { cn } from '@/lib/utils';

const COLUMN_COUNT = 9;

interface RunsTableProps {
  runs: FeedRun[];
  emptyHint?: string;
}

export function RunsTable({ runs, emptyHint }: RunsTableProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (!runs.length) {
    return (
      <EmptyState
        size="sm"
        icon={Activity}
        title={emptyHint ?? 'Nenhuma execução ainda.'}
        className="rounded-xl border border-dashed border-border"
      />
    );
  }

  return (
    <TableCard label="Execuções dos agentes" minWidth="min-w-[860px]">
        <thead className={theadCls}>
          <tr>
            <th scope="col" className={cn(thCls, 'w-10 pr-0')}><span className="sr-only">Detalhes</span></th>
            <th scope="col" className={thCls}>Quando</th>
            <th scope="col" className={thCls}>Agente</th>
            <th scope="col" className={thCls}>Modelo</th>
            <th scope="col" className={thCls}>Resultado</th>
            <th scope="col" className={thCls}>Ação final</th>
            <th scope="col" className={thNumCls}>Tokens</th>
            <th scope="col" className={thNumCls}>Custo</th>
            <th scope="col" className={thNumCls}>Latência</th>
          </tr>
        </thead>
        <tbody className={tbodyCls}>
          {runs.map((r) => {
            const isExpanded = expanded === r.id;
            const action = finalActionMeta(r.finalAction);
            const status = runStatusMeta(r.status);
            const tokens = r.inputTokens + r.outputTokens;
            return (
              <RunRow
                key={r.id}
                run={r}
                isExpanded={isExpanded}
                onToggle={() =>
                  setExpanded((prev) => (prev === r.id ? null : r.id))
                }
                action={action}
                status={status}
                tokens={tokens}
              />
            );
          })}
        </tbody>
    </TableCard>
  );
}

function RunRow({
  run,
  isExpanded,
  onToggle,
  action,
  status,
  tokens,
}: {
  run: FeedRun;
  isExpanded: boolean;
  onToggle: () => void;
  action: { label: string; color: string };
  status: { label: string; color: string };
  tokens: number;
}) {
  const detailId = useId();
  const Chevron = isExpanded ? ChevronDown : ChevronRight;
  return (
    <>
      {/* A linha inteira continua clicável com o mouse; o botão da primeira
          célula é o caminho de teclado e de leitor de tela. */}
      <tr className={cn(trCls, 'cursor-pointer')} onClick={onToggle}>
        <td className={cn(tdBaseCls, 'w-10 py-1.5 pr-0')}>
          <button
            type="button"
            aria-expanded={isExpanded}
            aria-controls={isExpanded ? detailId : undefined}
            aria-label={`${isExpanded ? 'Ocultar' : 'Ver'} detalhes da execução de ${run.agent.name}`}
            title={isExpanded ? 'Ocultar detalhes' : 'Ver detalhes'}
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Chevron aria-hidden="true" className="h-4 w-4" />
          </button>
        </td>
        <td className={tdMutedCls}>
          {fmtRelative(run.startedAt)}
        </td>
        <td className={tdBaseCls}>
          <div className="flex items-center gap-2 whitespace-nowrap">
            <span className="font-medium text-foreground">
              {run.agent.name}
            </span>
            <Badge variant="neutral" className="font-medium">
              {run.agent.kind === 'ORCHESTRATOR' ? 'Orquestrador' : 'Agente'}
            </Badge>
          </div>
        </td>
        <td className={tdMutedCls}>
          {formatModelLabel(run.modelId)}
        </td>
        <td className={tdBaseCls}>
          <span
            className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ${status.color}`}
          >
            {status.label}
          </span>
        </td>
        <td className={tdBaseCls}>
          <span
            className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ${action.color}`}
          >
            {action.label}
          </span>
        </td>
        <td className={tdNumCls}>
          {fmtNum(tokens)}
        </td>
        <td className={tdNumCls}>
          {fmtUsd(Number(run.costUsd))}
        </td>
        <td className={cn(tdNumCls, 'text-muted-foreground')}>
          {fmtMs(run.durationMs)}
        </td>
      </tr>
      {isExpanded && <RunDetail id={detailId} run={run} fallbackError={run.errorMessage} />}
    </>
  );
}

function RunDetail({
  id,
  run,
  fallbackError,
}: {
  id: string;
  run: FeedRun;
  fallbackError: string | null;
}) {
  const tools = run.toolCalls ?? [];
  return (
    <tr id={id} className="bg-muted/50">
      <td colSpan={COLUMN_COUNT} className="px-4 py-3">
        {fallbackError && (
          <p className="mb-2 text-xs text-urgent-ink">
            <strong>Erro:</strong> {fallbackError}
          </p>
        )}
        <div className="grid gap-3 text-xs sm:grid-cols-2 md:grid-cols-3">
          <div>
            <p className="text-[11px] font-semibold uppercase text-muted-foreground">
              ID da execução
            </p>
            <code className="mt-0.5 block truncate rounded bg-muted px-1.5 py-0.5 text-[11px]">
              {run.id}
            </code>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase text-muted-foreground">
              Conversa
            </p>
            <code className="mt-0.5 block truncate rounded bg-muted px-1.5 py-0.5 text-[11px]">
              {run.conversationId}
            </code>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase text-muted-foreground">
              Cache
            </p>
            <p className="mt-0.5 tabular-nums text-foreground">
              {fmtNum(run.cacheReadTokens)} lidos · {fmtNum(run.cacheWriteTokens)} gravados
            </p>
          </div>
        </div>
        {tools.length > 0 && (
          <div className="mt-3">
            <p className="text-[11px] font-semibold uppercase text-muted-foreground">
              Chamadas de ferramenta ({tools.length})
            </p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {tools.map((t, i) => (
                <span
                  key={i}
                  className="rounded bg-muted px-2 py-0.5 text-[11px] text-foreground"
                >
                  {t.toolName}
                </span>
              ))}
            </div>
          </div>
        )}
      </td>
    </tr>
  );
}
