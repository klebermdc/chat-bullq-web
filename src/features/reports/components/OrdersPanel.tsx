'use client';
import { useEffect, useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { salesReportsService } from '../services/sales-reports.service';
import type { ReportFilters } from '../services/sales-reports.service';
import { brl } from './StatCard';

export function OrdersPanel({ filters, orgId }: { filters: ReportFilters; orgId: string | null }) {
  const [page, setPage] = useState(1);
  // reset to page 1 whenever filters change
  useEffect(() => { setPage(1); }, [filters]);

  const q = useQuery({
    queryKey: ['sales-orders', orgId, filters, page],
    queryFn: () => salesReportsService.getOrdersPage(filters, page, 50),
    placeholderData: keepPreviousData,
  });

  const rows = (q.data?.data ?? []) as Array<Record<string, unknown>>;
  const total = q.data?.total ?? 0;
  const totalPages = q.data?.totalPages ?? 1;
  const cols = ['Data', 'Pedido', 'Cliente', 'Vendedor', 'Produto', 'Venda', 'Comissão', 'Ganho', 'Status'];

  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
          Pedidos{total ? ` (${total.toLocaleString('pt-BR')})` : ''}
        </h2>
        <div className="flex items-center gap-2 text-sm">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-lg border border-zinc-300 px-2 py-1 disabled:opacity-40 dark:border-zinc-700"
          >
            Anterior
          </button>
          <span className="text-zinc-500">Página {page} de {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded-lg border border-zinc-300 px-2 py-1 disabled:opacity-40 dark:border-zinc-700"
          >
            Próxima
          </button>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-200 text-left text-zinc-500 dark:border-zinc-800">
            <tr>{cols.map((h) => <th key={h} className="whitespace-nowrap px-3 py-2 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((o, i) => (
              <tr key={(o.id as string) ?? i} className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/60">
                <td className="whitespace-nowrap px-3 py-2 text-zinc-500">{(o.data as string) ?? '-'}</td>
                <td className="whitespace-nowrap px-3 py-2 font-medium text-zinc-900 dark:text-zinc-100">{(o.pedido as string) ?? '-'}</td>
                <td className="whitespace-nowrap px-3 py-2">{(o.cliente as string) ?? '-'}</td>
                <td className="whitespace-nowrap px-3 py-2">{(o.vendedor as string) ?? '-'}</td>
                <td className="whitespace-nowrap px-3 py-2">{(o.produto as string) ?? '-'}</td>
                <td className="whitespace-nowrap px-3 py-2 font-medium">{brl(Number(o.venda) || 0)}</td>
                <td className="whitespace-nowrap px-3 py-2 text-amber-600">{brl(Number(o.comissao_total) || 0)}</td>
                <td className="whitespace-nowrap px-3 py-2 font-medium text-green-600">{brl(Number(o.comissao_vendedor) || 0)}</td>
                <td className="whitespace-nowrap px-3 py-2">{(o.status as string) ?? '-'}</td>
              </tr>
            ))}
            {!rows.length && !q.isLoading && (
              <tr><td colSpan={cols.length} className="px-3 py-6 text-center text-zinc-500">Nenhum pedido.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
