'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bot, Coins, Cpu, Activity, CheckCircle2, ArrowRightLeft } from 'lucide-react';
import {
  aiAgentsService,
  formatModelLabel,
  type Period,
} from '../../services/ai-agents.service';
import { useOrgId } from '@/hooks/use-org-query-key';
import { KpiCard, successRateState } from './kpi-card';
import { PeriodSelector } from './period-selector';
import { BreakdownList } from './breakdown-list';
import { RunsTable } from './runs-table';
import { finalActionMeta, fmtMs, fmtNum, fmtUsdShort } from './format';
import { controlCls } from '@/components/ui/control';
import { EmptyState, LoadingState } from '@/components/ui/empty-state';
import { StatCard } from '@/components/ui/stat-card';

export function JarvisAgentTab() {
  const orgId = useOrgId();
  const [period, setPeriod] = useState<Period>('7d');
  const [agentId, setAgentId] = useState<string>('');

  const { data: agents } = useQuery({
    queryKey: ['ai-agents', orgId],
    queryFn: () => aiAgentsService.list(),
  });

  // Auto-select first agent
  useEffect(() => {
    if (!agentId && agents && agents.length > 0) {
      setAgentId(agents[0].id);
    }
  }, [agents, agentId]);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['ai-agent-stats', agentId, period],
    queryFn: () => aiAgentsService.agentStats(agentId, period),
    enabled: !!agentId,
    refetchInterval: 5000,
  });

  const { data: runs, isLoading: runsLoading } = useQuery({
    queryKey: ['ai-agent-feed', agentId],
    queryFn: () => aiAgentsService.feed({ agentId, limit: 50 }),
    enabled: !!agentId,
    refetchInterval: 5000,
  });

  const agent = agents?.find((a) => a.id === agentId);

  if (!agents) {
    return <LoadingState />;
  }

  if (agents.length === 0) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Bot}
          title="Nenhum agente cadastrado ainda"
          description="Crie um agente na aba “Agentes” para começar."
          className="rounded-xl border border-dashed border-border"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <select
            aria-label="Agente"
            value={agentId}
            onChange={(e) => setAgentId(e.target.value)}
            className={`${controlCls} max-w-full font-medium`}
          >
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.kind === 'ORCHESTRATOR' ? 'orquestrador' : a.category ?? 'agente'})
              </option>
            ))}
          </select>
          {agent && (
            <span className="text-xs text-muted-foreground">
              {formatModelLabel(agent.modelId)}
            </span>
          )}
        </div>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {/* KPI cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Custo (USD)"
          value={statsLoading ? '…' : fmtUsdShort(stats?.cost.usd ?? 0)}
          hint={
            stats
              ? `${fmtUsdShort(stats.cost.avgPerRun)} por execução`
              : undefined
          }
          icon={Coins}
        />
        <KpiCard
          label="Tokens"
          value={statsLoading ? '…' : fmtNum(stats?.tokens.total ?? 0)}
          hint={
            stats ? `${fmtNum(stats.tokens.cacheRead)} lidos do cache` : undefined
          }
          icon={Cpu}
        />
        <KpiCard
          label="Execuções"
          value={statsLoading ? '…' : fmtNum(stats?.runs.total ?? 0)}
          hint={
            stats
              ? `${fmtNum(stats.runs.completed)} concluídas · ${fmtNum(stats.runs.failed)} ${stats.runs.failed === 1 ? 'falha' : 'falhas'}`
              : undefined
          }
          icon={Activity}
        />
        <KpiCard
          label="Taxa de sucesso"
          value={
            statsLoading
              ? '…'
              : stats?.runs.successRate != null
                ? `${stats.runs.successRate}%`
                : '—'
          }
          hint={
            stats
              ? `latência p50 ${fmtMs(stats.latency.p50)} · p95 ${fmtMs(stats.latency.p95)}`
              : undefined
          }
          icon={CheckCircle2}
          state={statsLoading ? undefined : successRateState(stats?.runs.successRate)}
        />
      </div>

      {/* Handoffs */}
      <div className="grid gap-3 sm:grid-cols-2">
        <StatCard
          label="Delegações enviadas"
          value={fmtNum(stats?.handoffs.sent ?? 0)}
          hint={
            agent?.kind === 'ORCHESTRATOR'
              ? 'Vezes que delegou para outro agente'
              : 'Vezes que devolveu para o orquestrador ou outro agente'
          }
          icon={ArrowRightLeft}
        />
        <StatCard
          label="Delegações recebidas"
          value={fmtNum(stats?.handoffs.received ?? 0)}
          hint="Vezes que outro agente delegou para este"
          icon={ArrowRightLeft}
        />
      </div>

      {/* Final actions */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Como as execuções terminaram
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-6">
          {Object.entries(stats?.byFinalAction ?? {}).map(([action, count]) => (
            <div
              key={action}
              className="rounded-lg bg-muted px-3 py-2"
            >
              <p className="truncate text-[11px] text-muted-foreground">{finalActionMeta(action).label}</p>
              <p className="text-base font-semibold tabular-nums text-foreground">
                {count}
              </p>
            </div>
          ))}
          {Object.keys(stats?.byFinalAction ?? {}).length === 0 && (
            <EmptyState size="sm" title="Nenhuma execução no período" className="col-span-full py-6" />
          )}
        </div>
      </div>

      {/* Tools used */}
      <BreakdownList
        title={`Ferramentas usadas por ${agent?.name ?? 'este agente'}`}
        items={(stats?.tools ?? [])
          .sort((a, b) => b.calls - a.calls)
          .map((t) => ({ label: t.name, value: t.calls }))}
        unit="chamadas"
        empty="Esse agente ainda não chamou nenhuma ferramenta."
      />

      {/* Runs deste agent */}
      <div>
        <h3 className="mb-2 text-sm font-semibold text-foreground">
          Execuções recentes
        </h3>
        {runsLoading ? (
          <div className="h-40 animate-pulse rounded-xl bg-muted" />
        ) : (
          <RunsTable
            runs={runs ?? []}
            emptyHint={`${agent?.name ?? 'Esse agente'} ainda não rodou.`}
          />
        )}
      </div>
    </div>
  );
}
