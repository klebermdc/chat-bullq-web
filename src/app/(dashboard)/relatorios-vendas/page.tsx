'use client';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth-store';
import { salesReportsService } from '@/features/reports/services/sales-reports.service';
import type { ReportFilters } from '@/features/reports/services/sales-reports.service';
import { ShoppingBag, TrendingUp, Wallet } from 'lucide-react';
import { StatCard, brl } from '@/features/reports/components/StatCard';
import { SellerTable } from '@/features/reports/components/SellerTable';
import { ReportCharts, ChartCard } from '@/features/reports/components/ReportCharts';
import { OrdersPanel } from '@/features/reports/components/OrdersPanel';
import { ReconciliationPanel } from '@/features/reports/components/ReconciliationPanel';
import { ReportFilterBar } from '@/features/reports/components/ReportFilterBar';
import { getErrorMessage } from '@/lib/errors';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/ui/empty-state';
import { PageHeader, PageShell } from '@/components/layout/page-shell';

export default function RelatoriosVendasPage() {
  const activeOrgId = useAuthStore((s) => s.activeOrgId);
  const organizations = useAuthStore((s) => s.organizations);
  const role = organizations.find((o) => o.id === activeOrgId)?.role;
  const isAdmin = role === 'OWNER' || role === 'ADMIN';

  // Abre sempre no mês/ano atual (o usuário pode limpar p/ ver tudo).
  const currentMonthFilters = (): ReportFilters => {
    const now = new Date();
    return { month: now.getMonth() + 1, year: now.getFullYear() };
  };
  const [filters, setFilters] = useState<ReportFilters>(currentMonthFilters);
  const [debounced, setDebounced] = useState<ReportFilters>(currentMonthFilters);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(filters), 300);
    return () => clearTimeout(t);
  }, [filters]);

  const includeOrders = false;

  const vendedoresQ = useQuery({
    queryKey: ['sales-vendedores', activeOrgId],
    queryFn: () => salesReportsService.getVendedores(),
    enabled: isAdmin,
  });

  const facetsQ = useQuery({
    queryKey: ['sales-facets', activeOrgId],
    queryFn: () => salesReportsService.getFacets(),
  });

  const reportQ = useQuery({
    queryKey: ['sales-report', activeOrgId, debounced, includeOrders],
    queryFn: () => salesReportsService.getReport({ ...debounced, includeOrders }),
  });

  // "Hoje": mesmos filtros de categoria (vendedor/status/produto/…), mas escopado no dia de hoje.
  const today = new Date();
  const todayReportQ = useQuery({
    queryKey: [
      'sales-report-today', activeOrgId,
      debounced.vendedor, debounced.status, debounced.produto, debounced.fornecedor, debounced.search,
    ],
    queryFn: () =>
      salesReportsService.getReport({
        vendedor: debounced.vendedor,
        status: debounced.status,
        produto: debounced.produto,
        fornecedor: debounced.fornecedor,
        search: debounced.search,
        day: today.getDate(),
        month: today.getMonth() + 1,
        year: today.getFullYear(),
        includeOrders: false,
      }),
  });
  const hoje = todayReportQ.data?.totals;

  const qc = useQueryClient();
  const syncStateQ = useQuery({
    queryKey: ['sales-sync-state', activeOrgId],
    queryFn: () => salesReportsService.getSyncState(),
    enabled: isAdmin,
  });
  const syncMut = useMutation({
    mutationFn: () => salesReportsService.syncNow(),
    onSuccess: (r) => {
      if (r.skipped) {
        toast.info('Sincronização já em andamento…');
        return;
      }
      toast.success(`Sincronizado: ${r.count} pedidos`);
      qc.invalidateQueries({ queryKey: ['sales-report'] });
      qc.invalidateQueries({ queryKey: ['sales-sync-state'] });
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, 'Falha ao sincronizar'));
      // Atualiza o estado para exibir o lastError persistido pelo backend.
      qc.invalidateQueries({ queryKey: ['sales-sync-state'] });
    },
  });

  const report = reportQ.data;
  const title = useMemo(
    () => (report?.scope === 'seller' ? `Relatório — ${report.seller}` : 'Relatório — todos os vendedores'),
    [report],
  );

  return (
    <PageShell>
      <PageHeader
        title="Relatórios de Vendas"
        description={report ? title : 'Pedidos, vendas e comissões do período.'}
        actions={
          isAdmin ? (
            <div className="flex min-w-0 flex-col items-start gap-1 sm:items-end">
              <Button onClick={() => syncMut.mutate()} loading={syncMut.isPending}>
                {syncMut.isPending ? 'Sincronizando…' : 'Sincronizar agora'}
              </Button>
              {syncStateQ.data?.lastSyncAt && (
                <p className="text-xs tabular-nums text-muted-foreground">
                  Última sincronização: {new Date(syncStateQ.data.lastSyncAt).toLocaleString('pt-BR')}
                </p>
              )}
              {syncStateQ.data?.lastError && (
                <p
                  className="max-w-xs truncate text-xs text-urgent-ink"
                  title={syncStateQ.data.lastError}
                >
                  Último erro: {syncStateQ.data.lastError}
                </p>
              )}
            </div>
          ) : undefined
        }
      />

      <div className="mt-6 space-y-6">
      <ReportFilterBar
        filters={filters}
        onChange={setFilters}
        facets={facetsQ.data}
        vendedores={vendedoresQ.data}
        isAdmin={isAdmin}
      />

      {reportQ.isLoading && <LoadingState />}
      {reportQ.isError && (
        <p role="alert" className="rounded-lg bg-urgent-wash px-3 py-2 text-sm text-urgent-ink">
          {getErrorMessage(reportQ.error, 'Erro ao carregar relatório.')}
        </p>
      )}

      {report && (
        <>
          {/* 1) KPIs — hoje */}
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Hoje ({today.toLocaleDateString('pt-BR')})
            </p>
            <div className="grid items-stretch gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
              <StatCard label="Pedidos" value={(hoje?.orders ?? 0).toLocaleString('pt-BR')} icon={ShoppingBag} />
              <StatCard label="Total de vendas" value={brl(hoje?.venda ?? 0)} icon={TrendingUp} />
              <StatCard label="Comissão do vendedor" value={brl(hoje?.comissaoVendedor ?? 0)} icon={Wallet} />
            </div>
          </div>

          {/* 1a) Vendas por vendedor — hoje (entre Hoje e Acumulado) */}
          {report.scope === 'all' && (
            <ChartCard
              title={`Vendas por vendedor — hoje (${today.toLocaleDateString('pt-BR')})`}
              data={(todayReportQ.data?.bySeller ?? []).slice(0, 12)}
              nameKey="vendedor"
            />
          )}

          {/* 1b) KPIs — acumulado no período */}
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Acumulado no período</p>
            <div className="grid items-stretch gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
              <StatCard label="Pedidos" value={report.totals.orders.toLocaleString('pt-BR')} icon={ShoppingBag} />
              <StatCard label="Total de vendas" value={brl(report.totals.venda)} icon={TrendingUp} />
              <StatCard label="Comissão do vendedor" value={brl(report.totals.comissaoVendedor)} icon={Wallet} />
            </div>
          </div>

          {/* 2) Vendas por vendedor */}
          {report.scope === 'all' && (
            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-foreground">Vendas por vendedor</h2>
              <SellerTable rows={report.bySeller} />
            </section>
          )}
        </>
      )}

      {/* 3) Pedidos */}
      <OrdersPanel filters={debounced} orgId={activeOrgId} />

      {/* 3.5) Reconciliação (E5.2c) — pedidos do HUB sem card, admin-only */}
      {isAdmin && <ReconciliationPanel />}

      {/* 4) Gráficos */}
      {report && <ReportCharts report={report} />}
      </div>
    </PageShell>
  );
}
