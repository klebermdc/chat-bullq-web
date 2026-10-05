'use client';
import { useEffect, useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  EmptyRow, TableCard,
  tbodyCls, tdCls, tdMutedCls, tdNumCls, tdTruncateCls, thCls, thNumCls, theadCls, trCls,
} from '@/features/crm-reports/components/table-parts';
import { cn } from '@/lib/utils';
import { salesReportsService } from '../services/sales-reports.service';
import type { ReportFilters } from '../services/sales-reports.service';
import { brl } from './StatCard';
import { formatOrderDate, orderStatusMeta } from './order-format';

const PAGE_SIZE = 50;

const COLUMNS: Array<{ label: string; align?: 'right' }> = [
  { label: 'Data' },
  { label: 'Pedido' },
  { label: 'Cliente' },
  { label: 'Vendedor' },
  { label: 'Produto' },
  { label: 'Venda', align: 'right' },
  { label: 'Comissão', align: 'right' },
  { label: 'Ganho', align: 'right' },
  { label: 'Status' },
];

const text = (value: unknown): string =>
  value === null || value === undefined || value === '' ? '—' : String(value);

const titleOf = (value: unknown): string | undefined =>
  typeof value === 'string' && value !== '' ? value : undefined;

function StatusCell({ value }: { value: unknown }) {
  const meta = orderStatusMeta(value);
  if (!meta) return <span className="text-muted-foreground">—</span>;
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}

/** Ganho do vendedor: verde só quando há ganho; zero fica apagado. */
function EarningCell({ value }: { value: number }) {
  if (value > 0) return <td className={cn(tdNumCls, 'font-medium text-success-ink')}>{brl(value)}</td>;
  return <td className={`${tdMutedCls} text-right font-mono tabular-nums`}>{brl(value)}</td>;
}

export function OrdersPanel({ filters, orgId }: { filters: ReportFilters; orgId: string | null }) {
  const [page, setPage] = useState(1);
  // reset to page 1 whenever filters change
  useEffect(() => { setPage(1); }, [filters]);

  const q = useQuery({
    queryKey: ['sales-orders', orgId, filters, page],
    queryFn: () => salesReportsService.getOrdersPage(filters, page, PAGE_SIZE),
    placeholderData: keepPreviousData,
  });

  const rows = (q.data?.data ?? []) as Array<Record<string, unknown>>;
  const total = q.data?.total ?? 0;
  const totalPages = q.data?.totalPages ?? 1;

  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">
          Pedidos
          {total ? <span className="ml-1.5 font-normal tabular-nums text-muted-foreground">({total.toLocaleString('pt-BR')})</span> : null}
        </h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            Anterior
          </Button>
          <span className="text-xs tabular-nums text-muted-foreground">Página {page} de {totalPages}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            Próxima
          </Button>
        </div>
      </div>
      {/* Quem rola é a área interna do cartão (TableCard). Cliente, vendedor e
          produto dividem a sobra e cortam com reticências, então em tela de
          1440px a coluna Status cabe inteira sem rolagem. */}
      <TableCard label="Pedidos" minWidth="min-w-[1080px]">
        <thead className={theadCls}>
          <tr>
            {COLUMNS.map((c) => (
              <th key={c.label} scope="col" className={c.align === 'right' ? thNumCls : thCls}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className={tbodyCls}>
          {rows.map((o, i) => (
            <tr key={(o.id as string) ?? i} className={trCls}>
              <td className={`${tdMutedCls} font-mono tabular-nums`}>{formatOrderDate(o.data)}</td>
              <td className={`${tdCls} font-mono font-medium tabular-nums`}>{text(o.pedido)}</td>
              <td className={`${tdTruncateCls} w-[26%]`} title={titleOf(o.cliente)}>{text(o.cliente)}</td>
              <td className={`${tdTruncateCls} w-[18%]`} title={titleOf(o.vendedor)}>{text(o.vendedor)}</td>
              <td className={`${tdTruncateCls} w-[24%]`} title={titleOf(o.produto)}>{text(o.produto)}</td>
              <td className={`${tdNumCls} font-medium`}>{brl(Number(o.venda) || 0)}</td>
              <td className={`${tdMutedCls} text-right font-mono tabular-nums`}>{brl(Number(o.comissao_total) || 0)}</td>
              <EarningCell value={Number(o.comissao_vendedor) || 0} />
              <td className={tdCls}><StatusCell value={o.status} /></td>
            </tr>
          ))}
          {!rows.length && !q.isLoading && (
            <EmptyRow colSpan={COLUMNS.length}>Nenhum pedido com esses filtros.</EmptyRow>
          )}
          {!rows.length && q.isLoading && (
            <EmptyRow colSpan={COLUMNS.length}>Carregando…</EmptyRow>
          )}
        </tbody>
      </TableCard>
    </section>
  );
}
