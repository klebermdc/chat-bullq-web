'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle, Megaphone, Percent, RefreshCw, Settings2, Target, TrendingUp, Trophy, Users, Wallet,
} from 'lucide-react';
import { marketingService } from '@/features/marketing/services/marketing.service';
import { HealthTrafficLight } from '@/features/marketing/components/health-traffic-light';
import { SpendLeadsChart } from '@/features/marketing/components/spend-leads-chart';
import { GoalsEditor } from '@/features/marketing/components/goals-editor';
import { AttributionTable } from '@/features/marketing/components/attribution-table';
import { CreativesTable } from '@/features/marketing/components/creatives-table';
import { CrmReportsPanel } from '@/features/crm-reports/components/crm-reports-panel';
import { useOrgId } from '@/hooks/use-org-query-key';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { StatCard } from '@/components/ui/stat-card';
import { PageHeader, PageShell } from '@/components/layout/page-shell';

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

function KpiSkeleton() {
  return <div className="h-[116px] animate-pulse rounded-xl border border-border bg-muted" />;
}

const SECTION_TITLE = 'mb-3 text-lg font-semibold text-foreground';
// Seis cartões com valor em moeda: três por linha no desktop (duas linhas
// alinhadas), dois no tablet, um no mobile — o mesmo desenho de Vendas.
const KPI_GRID = 'grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3';

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
    <PageShell>
        <PageHeader
          title="Marketing"
          description="Desempenho dos anúncios Meta cruzado com leads e vendas do CRM."
        />

        {/* Toolbar: período, atualização e metas */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div role="group" aria-label="Período" className="inline-flex max-w-full rounded-lg bg-muted p-0.5">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                type="button"
                aria-pressed={period === p.key}
                onClick={() => setPeriod(p.key)}
                className={`h-8 whitespace-nowrap rounded-md px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm ${
                  period === p.key
                    ? 'bg-background text-foreground shadow-soft'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {overview && <span className="text-xs text-muted-foreground">{formatRelative(overview.lastSyncAt)}</span>}
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={fetchingOverview}>
              <RefreshCw aria-hidden="true" className={`h-3.5 w-3.5 ${fetchingOverview ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button
              variant="outline"
              size="sm"
              aria-expanded={goalsOpen}
              onClick={() => setGoalsOpen((v) => !v)}
            >
              <Settings2 aria-hidden="true" className="h-3.5 w-3.5" />
              Metas
            </Button>
          </div>
        </div>

        {goalsOpen && (
          <div className="mt-4">
            <GoalsEditor open={goalsOpen} onClose={() => setGoalsOpen(false)} />
          </div>
        )}

        {loadingOverview ? (
          <div className="mt-6 space-y-6">
            <div className={KPI_GRID}>
              <KpiSkeleton />
              <KpiSkeleton />
              <KpiSkeleton />
              <KpiSkeleton />
              <KpiSkeleton />
              <KpiSkeleton />
            </div>
            <div className="h-64 animate-pulse rounded-xl border border-border bg-muted" />
          </div>
        ) : !overview || !overview.hasConnection ? (
          <section className="mt-6 rounded-xl border border-dashed border-border">
            <EmptyState
              icon={Megaphone}
              title="Nenhuma conta de anúncios conectada"
              description="Conecte uma conta Meta Ads para ver investimento, leads e ROI aqui."
              action={
                <Link
                  href="/settings/meta-ads"
                  className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-soft hover:bg-primary/90"
                >
                  Ir para Configurações → Meta Ads
                </Link>
              }
            />
          </section>
        ) : (
          <div className="mt-6 space-y-6">
            {overview.brokenConnection && (
              <section role="alert" className="flex items-start gap-2 rounded-xl bg-urgent-wash p-4 text-sm text-urgent-ink">
                <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p>
                    A conexão{' '}
                    <strong>{overview.brokenConnection.accountName ?? 'do Meta Ads'}</strong> parou de
                    sincronizar. Os números abaixo são reais, mas <strong>param na última sincronização</strong> —
                    não refletem o gasto de hoje.
                  </p>
                  {overview.brokenConnection.lastSyncError && (
                    <p className="mt-1 break-words font-mono text-xs opacity-80">
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
              <section className="flex items-start gap-2 rounded-xl bg-warning-wash p-4 text-sm text-warning-ink">
                <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  A conta de anúncios fatura em <strong>{overview.media.currency}</strong>, mas a receita do
                  CRM é registrada em <strong>BRL</strong>. CPL e ROI abaixo misturam essas duas moedas — trate
                  os dois com cautela até unificar a moeda de cobrança.
                </p>
              </section>
            )}

            <div className={KPI_GRID}>
              <StatCard
                label="Investimento"
                value={fmtCurrency(overview.media.spend, overview.media.currency)}
                icon={Wallet}
              />
              <StatCard label="Leads" value={fmtNumber(overview.crm.leads)} icon={Users} />
              <StatCard
                label="CPL"
                value={overview.derived.cpl === null ? '—' : fmtCurrency(overview.derived.cpl, overview.media.currency)}
                icon={Target}
              />
              <StatCard label="Vendas ganhas" value={fmtNumber(overview.crm.wonDeals)} icon={Trophy} />
              <StatCard label="Receita" value={fmtCurrency(overview.crm.wonRevenue, 'BRL')} icon={TrendingUp} />
              <StatCard label="ROI" value={fmtPercent(overview.derived.roiPct)} icon={Percent} />
            </div>

            <section>
              <h2 className={SECTION_TITLE}>Farol de saúde</h2>
              <HealthTrafficLight indicators={overview.indicators} onConfigureGoals={() => setGoalsOpen(true)} />
            </section>

            <section className="rounded-xl border border-border bg-card p-4 shadow-soft sm:p-5">
              <h2 className="mb-3 text-sm font-semibold text-foreground">
                Investimento × leads por dia
              </h2>
              <SpendLeadsChart data={daily ?? []} />
            </section>

            {attribution && (
              <section>
                <h2 className={SECTION_TITLE}>Atribuição por anúncio</h2>
                <AttributionTable attribution={attribution} />
              </section>
            )}

            {creatives && (
              <section>
                <h2 className={SECTION_TITLE}>Ranking de criativos</h2>
                <CreativesTable creatives={creatives} />
              </section>
            )}
          </div>
        )}

        {/* Relatórios de CRM: mesmo painel da rota /relatorios. Fica fora do
            ramo que exige Meta Ads conectado — com o token vencido o gestor
            perdia o acesso a Negócios, Leads e Conversas. */}
        <section className="mt-8">
          <h2 className={SECTION_TITLE}>Relatórios</h2>
          <CrmReportsPanel />
        </section>
    </PageShell>
  );
}
