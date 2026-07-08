'use client';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth-store';
import { salesReportsService } from '@/features/reports/services/sales-reports.service';
import type { ReportFilters } from '@/features/reports/services/sales-reports.service';
import { ShoppingBag, TrendingUp, Wallet, Coins } from 'lucide-react';
import { StatCard, brl } from '@/features/reports/components/StatCard';
import { SellerTable } from '@/features/reports/components/SellerTable';
import { ReportCharts } from '@/features/reports/components/ReportCharts';
import { OrdersPanel } from '@/features/reports/components/OrdersPanel';
import { ReportFilterBar } from '@/features/reports/components/ReportFilterBar';

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
    onError: () => toast.error('Falha ao sincronizar'),
  });

  const report = reportQ.data;
  const title = useMemo(
    () => (report?.scope === 'seller' ? `Relatório — ${report.seller}` : 'Relatório — todos os vendedores'),
    [report],
  );

  return (
    <div className="h-full min-h-0 space-y-6 overflow-y-auto p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Relatórios de Vendas</h1>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => syncMut.mutate()}
              disabled={syncMut.isPending}
              className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
            >
              {syncMut.isPending ? 'Sincronizando…' : 'Sincronizar agora'}
            </button>
            {syncStateQ.data?.lastSyncAt && (
              <span className="text-xs text-zinc-400">
                Última sync: {new Date(syncStateQ.data.lastSyncAt).toLocaleString('pt-BR')}
              </span>
            )}
          </div>
        )}
      </div>

      <ReportFilterBar
        filters={filters}
        onChange={setFilters}
        facets={facetsQ.data}
        vendedores={vendedoresQ.data}
        isAdmin={isAdmin}
      />

      {reportQ.isLoading && <p className="text-sm text-zinc-500">Carregando…</p>}
      {reportQ.isError && (
        <p className="text-sm text-red-600">
          {(reportQ.error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Erro ao carregar relatório.'}
        </p>
      )}

      {report && (
        <>
          <p className="text-sm text-zinc-500">{title}</p>
          {/* 1) KPIs — hoje */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Hoje ({today.toLocaleDateString('pt-BR')})
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Pedidos" value={(hoje?.orders ?? 0).toLocaleString('pt-BR')} icon={ShoppingBag} tone="violet" />
              <StatCard label="Total de vendas" value={brl(hoje?.venda ?? 0)} icon={TrendingUp} tone="emerald" />
              <StatCard label="Comissão do vendedor" value={brl(hoje?.comissaoVendedor ?? 0)} icon={Wallet} tone="amber" />
              <StatCard label="Comissão total" value={brl(hoje?.comissaoTotal ?? 0)} icon={Coins} tone="sky" />
            </div>
          </div>

          {/* 1b) KPIs — acumulado no período */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Acumulado no período</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Pedidos" value={report.totals.orders.toLocaleString('pt-BR')} icon={ShoppingBag} tone="violet" />
              <StatCard label="Total de vendas" value={brl(report.totals.venda)} icon={TrendingUp} tone="emerald" />
              <StatCard label="Comissão do vendedor" value={brl(report.totals.comissaoVendedor)} icon={Wallet} tone="amber" />
              <StatCard label="Comissão total" value={brl(report.totals.comissaoTotal)} icon={Coins} tone="sky" />
            </div>
          </div>

          {/* 2) Vendas por vendedor */}
          {report.scope === 'all' && (
            <section className="space-y-2">
              <h2 className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-200">
                <span className="h-4 w-1 rounded-full bg-violet-500" aria-hidden />
                Vendas por vendedor
              </h2>
              <SellerTable rows={report.bySeller} />
            </section>
          )}
        </>
      )}

      {/* 3) Pedidos */}
      <OrdersPanel filters={debounced} orgId={activeOrgId} />

      {/* 4) Gráficos */}
      {report && <ReportCharts report={report} />}
    </div>
  );
}
