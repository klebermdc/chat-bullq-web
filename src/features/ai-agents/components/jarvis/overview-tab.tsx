'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  Clock,
  Coins,
  Cpu,
  AlertTriangle,
  CheckCircle2,
  ArrowRightLeft,
} from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';

const CAP_WARNING_PCT = 80;
const CAP_CRITICAL_PCT = 95;

/** Uso do limite mensal em palavra, para a barra não depender só da cor. */
function capUsageWord(percentUsed: number): string {
  if (percentUsed < CAP_WARNING_PCT) return 'dentro do limite';
  if (percentUsed < CAP_CRITICAL_PCT) return 'perto do limite';
  return 'no limite';
}

export function JarvisOverviewTab() {
  const orgId = useOrgId();
  const [period, setPeriod] = useState<Period>('7d');

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['ai-stats', orgId, period],
    queryFn: () => aiAgentsService.orgStats(period),
    refetchInterval: 5000,
  });

  const { data: runs, isLoading: runsLoading } = useQuery({
    queryKey: ['ai-feed', orgId],
    queryFn: () => aiAgentsService.feed({ limit: 50 }),
    refetchInterval: 5000,
  });

  const { data: agents } = useQuery({
    queryKey: ['ai-agents', orgId],
    queryFn: () => aiAgentsService.list(),
  });

  const agentsById = new Map((agents ?? []).map((a) => [a.id, a]));

  const successRate = stats?.runs.successRate ?? null;
  const failedRate =
    stats && stats.runs.total > 0
      ? (stats.runs.failed / stats.runs.total) * 100
      : 0;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Visão geral
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Custo, tokens, execuções e qualidade — atualiza a cada 5 s
          </p>
        </div>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {/* Alerts */}
      {stats?.monthlyCap.percentUsed != null &&
        stats.monthlyCap.percentUsed >= 80 && (
          <div role="status" className="flex items-start gap-3 rounded-lg bg-warning-wash p-3 text-sm text-warning-ink">
            <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">
                Limite mensal: {stats.monthlyCap.percentUsed}% usado
              </p>
              <p className="text-xs">
                {fmtNum(stats.monthlyCap.used)} de{' '}
                {fmtNum(stats.monthlyCap.cap ?? 0)} tokens. A IA vai parar
                automaticamente quando o limite for atingido.
              </p>
            </div>
          </div>
        )}

      {failedRate > 30 && stats && stats.runs.total >= 5 && (
        <div role="alert" className="flex items-start gap-3 rounded-lg bg-urgent-wash p-3 text-sm text-urgent-ink">
          <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">
              Taxa de falha alta: {failedRate.toFixed(0)}%
            </p>
            <p className="text-xs">
              {stats.runs.failed} de {stats.runs.total} execuções falharam no
              período. Veja a tabela abaixo para investigar.
            </p>
          </div>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Custo (USD)"
          value={statsLoading ? '…' : fmtUsdShort(stats?.cost.usd ?? 0)}
          hint={
            stats
              ? `${fmtUsdShort(stats.cost.avgPerRun)} por execução em média`
              : undefined
          }
          icon={Coins}
        />
        <KpiCard
          label="Tokens"
          value={statsLoading ? '…' : fmtNum(stats?.tokens.total ?? 0)}
          hint={
            stats
              ? `${fmtNum(stats.tokens.cacheRead)} lidos do cache`
              : undefined
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
              : successRate != null
                ? `${successRate}%`
                : '—'
          }
          hint={
            stats
              ? `latência p50 ${fmtMs(stats.latency.p50)} · p95 ${fmtMs(stats.latency.p95)}`
              : undefined
          }
          icon={CheckCircle2}
          state={statsLoading ? undefined : successRateState(successRate)}
        />
      </div>

      {/* Cap progress (if cap defined) */}
      {stats?.monthlyCap.cap && (
        <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Limite mensal
            </p>
            <p className="text-xs tabular-nums text-muted-foreground">
              {fmtNum(stats.monthlyCap.used)} / {fmtNum(stats.monthlyCap.cap)} tokens
              ·{' '}
              <span className="font-medium text-foreground">
                {stats.monthlyCap.percentUsed?.toFixed(1)}%
              </span>
              {' · '}
              {capUsageWord(stats.monthlyCap.percentUsed ?? 0)}
            </p>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full ${
                (stats.monthlyCap.percentUsed ?? 0) < CAP_WARNING_PCT
                  ? 'bg-success'
                  : (stats.monthlyCap.percentUsed ?? 0) < CAP_CRITICAL_PCT
                    ? 'bg-warning'
                    : 'bg-urgent'
              }`}
              style={{
                width: `${Math.min(stats.monthlyCap.percentUsed ?? 0, 100)}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Breakdowns */}
      <div className="grid gap-3 lg:grid-cols-3">
        <BreakdownList
          title="Custo por modelo"
          items={(stats?.byModel ?? [])
            .sort((a, b) => b.cost - a.cost)
            .map((m) => ({
              label: formatModelLabel(m.modelId),
              value: Number(m.cost.toFixed(4)),
              secondaryLabel: `${fmtNum(m.tokens)} tokens`,
            }))}
          unit="USD"
          empty="Sem execuções no período."
        />
        <BreakdownList
          title="Por agente"
          items={(stats?.byAgent ?? [])
            .sort((a, b) => b.runs - a.runs)
            .map((a) => ({
              label: agentsById.get(a.agentId)?.name ?? a.agentId.slice(0, 12),
              value: a.runs,
              secondaryLabel: fmtUsdShort(a.cost),
            }))}
          unit="execuções"
          empty="Sem execuções no período."
        />
        <BreakdownList
          title="Ferramentas chamadas"
          items={(stats?.tools ?? [])
            .sort((a, b) => b.calls - a.calls)
            .map((t) => ({ label: t.name, value: t.calls }))}
          unit="chamadas"
          empty="Sem chamadas no período."
        />
      </div>

      {/* Final actions + handoffs */}
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Como as execuções terminaram
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
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
              <EmptyState size="sm" title="Sem execuções no período" className="col-span-full py-6" />
            )}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <ArrowRightLeft aria-hidden="true" className="h-3 w-3" /> Delegações entre agentes
          </p>
          <div className="mt-3 space-y-2">
            {(stats?.handoffs ?? []).length === 0 ? (
              <EmptyState size="sm" title="Sem delegações no período" className="py-6" />
            ) : (
              stats?.handoffs.map((h, i) => {
                const fromName =
                  agentsById.get(h.fromAgentId)?.name ??
                  (h.fromAgentId === 'system' ? 'sistema' : h.fromAgentId.slice(0, 12));
                const toName =
                  agentsById.get(h.toAgentId)?.name ?? h.toAgentId.slice(0, 12);
                return (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-3 rounded-lg bg-muted px-3 py-1.5 text-xs"
                  >
                    <span className="min-w-0 truncate text-foreground">
                      <span className="font-medium">{fromName}</span>
                      <span className="mx-2 text-muted-foreground">→</span>
                      <span className="font-medium">{toName}</span>
                    </span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {h.count} {h.count === 1 ? 'vez' : 'vezes'}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Live feed */}
      <div>
        <div className="mb-2 flex items-center gap-2">
          <Clock aria-hidden="true" className="h-3.5 w-3.5 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">
            Últimas execuções
          </h3>
          <Badge variant="success" className="ml-2">
            <span aria-hidden="true" className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
            Ao vivo
          </Badge>
        </div>
        {runsLoading ? (
          <div className="h-40 animate-pulse rounded-xl bg-muted" />
        ) : (
          <RunsTable runs={runs ?? []} emptyHint="Nenhuma execução ainda." />
        )}
      </div>
    </div>
  );
}
