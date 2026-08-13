'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, RefreshCw, AlertTriangle, Settings2, Megaphone } from 'lucide-react';
import { marketingService } from '@/features/marketing/services/marketing.service';
import { HealthTrafficLight } from '@/features/marketing/components/health-traffic-light';
import { SpendLeadsChart } from '@/features/marketing/components/spend-leads-chart';
import { GoalsEditor } from '@/features/marketing/components/goals-editor';
import { AttributionTable } from '@/features/marketing/components/attribution-table';
import { CreativesTable } from '@/features/marketing/components/creatives-table';
import { useOrgId } from '@/hooks/use-org-query-key';

type PeriodKey = 'this-month' | 'last-month' | 'last-30-days';

const PERIODS: Array<{ key: PeriodKey; label: string }> = [
  { key: 'this-month', label: 'Este mês' },
  { key: 'last-month', label: 'Mês passado' },
  { key: 'last-30-days', label: 'Últimos 30 dias' },
];

function toYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function periodRange(key: PeriodKey): { from: string; to: string } {
  const now = new Date();
  if (key === 'this-month') {
    return { from: toYMD(new Date(now.getFullYear(), now.getMonth(), 1)), to: toYMD(now) };
  }
  if (key === 'last-month') {
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const to = new Date(now.getFullYear(), now.getMonth(), 0);
    return { from: toYMD(from), to: toYMD(to) };
  }
  const from = new Date(now);
  from.setDate(from.getDate() - 29);
  return { from: toYMD(from), to: toYMD(now) };
}

function formatRelative(iso: string | null): string {
  if (!iso) return 'nunca sincronizado';
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'atualizado agora mesmo';
  if (diffMin < 60) return `atualizado há ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `atualizado há ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  return `atualizado há ${diffD}d`;
}

function fmtCurrency(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(value);
  } catch {
    return `${currency} ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}

function fmtPercent(value: number | null): string {
  if (value === null) return '—';
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';
}

function fmtNumber(value: number): string {
  return value.toLocaleString('pt-BR');
}

function KpiCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="mt-1.5 text-2xl font-bold tabular-nums" style={{ color: accent }}>
        {value}
      </p>
    </div>
  );
}

function KpiSkeleton() {
  return (
    <div className="h-[76px] animate-pulse rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900" />
  );
}

export default function MarketingPage() {
  const orgId = useOrgId();
  const [period, setPeriod] = useState<PeriodKey>('this-month');
  const [goalsOpen, setGoalsOpen] = useState(false);
  const { from, to } = periodRange(period);

  const {
    data: overview,
    isLoading: loadingOverview,
    isFetching: fetchingOverview,
    refetch: refetchOverview,
  } = useQuery({
    queryKey: ['marketing-overview', orgId, from, to],
    queryFn: () => marketingService.overview(from, to),
  });

  const { data: daily, refetch: refetchDaily } = useQuery({
    queryKey: ['marketing-daily', orgId, from, to],
    queryFn: () => marketingService.daily(from, to),
    enabled: Boolean(overview?.hasConnection),
  });

  const { data: attribution, refetch: refetchAttribution } = useQuery({
    queryKey: ['marketing-attribution', orgId, from, to],
    queryFn: () => marketingService.attribution(from, to),
    enabled: Boolean(overview?.hasConnection),
  });

  const { data: creatives, refetch: refetchCreatives } = useQuery({
    queryKey: ['marketing-creatives', orgId, from, to],
    queryFn: () => marketingService.creatives(from, to),
    enabled: Boolean(overview?.hasConnection),
  });

  const handleRefresh = () => {
    refetchOverview();
    if (overview?.hasConnection) {
      refetchDaily();
      refetchAttribution();
      refetchCreatives();
    }
  };

  return (
    <div className="h-full min-h-0 overflow-y-auto">
      <div className="mx-auto w-full max-w-6xl p-4 lg:p-6">
        <div className="flex items-start gap-2">
          <TrendingUp className="mt-1 h-5 w-5 text-primary" />
          <div>
            <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Marketing</h1>
            <p className="mt-0.5 text-sm text-zinc-500">
              Desempenho dos anúncios Meta cruzado com leads e vendas do CRM.
            </p>
          </div>
        </div>

        {/* Toolbar: período, atualização e metas */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  period === p.key
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            {overview && <span className="text-xs text-zinc-400">{formatRelative(overview.lastSyncAt)}</span>}
            <button
              onClick={handleRefresh}
              disabled={fetchingOverview}
              className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${fetchingOverview ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
            <button
              onClick={() => setGoalsOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              <Settings2 className="h-3.5 w-3.5" />
              Metas
            </button>
          </div>
        </div>

        {goalsOpen && (
          <div className="mt-4">
            <GoalsEditor open={goalsOpen} onClose={() => setGoalsOpen(false)} />
          </div>
        )}

        {loadingOverview ? (
          <div className="mt-6 space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <KpiSkeleton />
              <KpiSkeleton />
              <KpiSkeleton />
              <KpiSkeleton />
              <KpiSkeleton />
              <KpiSkeleton />
            </div>
            <div className="h-64 animate-pulse rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900" />
          </div>
        ) : !overview || !overview.hasConnection ? (
          <section className="mt-6 rounded-xl border border-dashed border-zinc-300 p-10 text-center dark:border-zinc-700">
            <Megaphone className="mx-auto h-8 w-8 text-zinc-300 dark:text-zinc-600" />
            <p className="mt-3 text-sm font-medium text-zinc-700 dark:text-zinc-200">
              Nenhuma conta de anúncios conectada.
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              Conecte uma conta Meta Ads para ver investimento, leads e ROI aqui.
            </p>
            <Link
              href="/settings/meta-ads"
              className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Ir para Configurações → Meta Ads
            </Link>
          </section>
        ) : (
          <div className="mt-6 space-y-6">
            {overview.brokenConnection && (
              <section className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p>
                    A conexão{' '}
                    <strong>{overview.brokenConnection.accountName ?? 'do Meta Ads'}</strong> parou de
                    sincronizar. Os números abaixo são reais, mas <strong>param na última sincronização</strong> —
                    não refletem o gasto de hoje.
                  </p>
                  {overview.brokenConnection.lastSyncError && (
                    <p className="mt-1 font-mono text-xs opacity-80">
                      {overview.brokenConnection.lastSyncError}
                    </p>
                  )}
                  <Link
                    href="/settings/meta-ads"
                    className="mt-2 inline-block font-medium underline underline-offset-2"
                  >
                    Reconectar em Configurações → Meta Ads
                  </Link>
                </div>
              </section>
            )}

            {overview.currencyMismatch && (
              <section className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-300">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  A conta de anúncios fatura em <strong>{overview.media.currency}</strong>, mas a receita do
                  CRM é registrada em <strong>BRL</strong>. CPL e ROI abaixo misturam essas duas moedas — trate
                  os dois com cautela até unificar a moeda de cobrança.
                </p>
              </section>
            )}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <KpiCard
                label="Investimento"
                value={fmtCurrency(overview.media.spend, overview.media.currency)}
                accent="#3b82f6"
              />
              <KpiCard label="Leads" value={fmtNumber(overview.crm.leads)} accent="#8b5cf6" />
              <KpiCard
                label="CPL"
                value={overview.derived.cpl === null ? '—' : fmtCurrency(overview.derived.cpl, overview.media.currency)}
                accent="#f59e0b"
              />
              <KpiCard label="Vendas ganhas" value={fmtNumber(overview.crm.wonDeals)} accent="#10b981" />
              <KpiCard label="Receita" value={fmtCurrency(overview.crm.wonRevenue, 'BRL')} accent="#059669" />
              <KpiCard label="ROI" value={fmtPercent(overview.derived.roiPct)} accent="#ec4899" />
            </div>

            <section>
              <h2 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">Farol de saúde</h2>
              <HealthTrafficLight indicators={overview.indicators} onConfigureGoals={() => setGoalsOpen(true)} />
            </section>

            <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                Investimento × leads por dia
              </h2>
              <SpendLeadsChart data={daily ?? []} />
            </section>

            {attribution && (
              <section>
                <h2 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  Atribuição por anúncio
                </h2>
                <AttributionTable attribution={attribution} />
              </section>
            )}

            {creatives && (
              <section>
                <h2 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  Ranking de criativos
                </h2>
                <CreativesTable creatives={creatives} />
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
