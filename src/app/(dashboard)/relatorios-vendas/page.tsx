'use client';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth-store';
import { salesReportsService } from '@/features/reports/services/sales-reports.service';
import { StatCard, brl } from '@/features/reports/components/StatCard';
import { SellerTable } from '@/features/reports/components/SellerTable';
import { ReportCharts } from '@/features/reports/components/ReportCharts';
import { OrdersTable } from '@/features/reports/components/OrdersTable';

export default function RelatoriosVendasPage() {
  const activeOrgId = useAuthStore((s) => s.activeOrgId);
  const organizations = useAuthStore((s) => s.organizations);
  const role = organizations.find((o) => o.id === activeOrgId)?.role;
  const isAdmin = role === 'OWNER' || role === 'ADMIN';

  const [vendedor, setVendedor] = useState<string>('');
  const includeOrders = !isAdmin || !!vendedor;

  const vendedoresQ = useQuery({
    queryKey: ['sales-vendedores', activeOrgId],
    queryFn: () => salesReportsService.getVendedores(),
    enabled: isAdmin,
  });

  const reportQ = useQuery({
    queryKey: ['sales-report', activeOrgId, vendedor, includeOrders],
    queryFn: () => salesReportsService.getReport({ vendedor: vendedor || undefined, includeOrders }),
  });

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
          <select
            value={vendedor}
            onChange={(e) => setVendedor(e.target.value)}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="">Todos os vendedores</option>
            {vendedoresQ.data?.map((v) => (
              <option key={v.email || v.nome} value={v.nome}>{v.nome}</option>
            ))}
          </select>
        )}
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

      {reportQ.isLoading && <p className="text-sm text-zinc-500">Carregando…</p>}
      {reportQ.isError && (
        <p className="text-sm text-red-600">
          {(reportQ.error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Erro ao carregar relatório.'}
        </p>
      )}

      {report && (
        <>
          <p className="text-sm text-zinc-500">{title}</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Pedidos" value={String(report.totals.orders)} />
            <StatCard label="Total de vendas" value={brl(report.totals.venda)} />
            <StatCard label="Comissão do vendedor" value={brl(report.totals.comissaoVendedor)} />
            <StatCard label="Comissão total" value={brl(report.totals.comissaoTotal)} />
          </div>

          <ReportCharts report={report} />

          {report.scope === 'all' && (
            <section className="space-y-2">
              <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-200">Por vendedor</h2>
              <SellerTable rows={report.bySeller} />
            </section>
          )}

          {report.orders && (
            <section className="space-y-2">
              <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-200">Pedidos</h2>
              <OrdersTable orders={report.orders} />
            </section>
          )}
        </>
      )}
    </div>
  );
}
