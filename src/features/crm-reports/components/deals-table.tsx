import { Badge, type BadgeProps } from '@/components/ui/badge';
import type { DealsReport } from '../services/crm-reports.service';
import {
  EmptyRow, Pager, TableCard, formatDate,
  tbodyCls, tdCls, tdMutedCls, tdNumCls, tdTruncateCls, thCls, thNumCls, theadCls, trCls,
} from './table-parts';

const COLUMN_COUNT = 7;

const brl = (n: number | null) =>
  n == null
    ? '—'
    : new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        maximumFractionDigits: 0,
      }).format(n);

const STATUS: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
  OPEN: { label: 'Aberto', variant: 'neutral' },
  WON: { label: 'Ganho', variant: 'success' },
  LOST: { label: 'Perdido', variant: 'urgent' },
};

export function DealsTable({
  report,
  onPage,
}: {
  report: DealsReport;
  onPage: (page: number) => void;
}) {
  return (
    <TableCard
      label="Negócios do período"
      minWidth="min-w-[820px]"
      footer={
        <Pager
          page={report.page}
          totalPages={report.totalPages}
          total={report.total}
          noun="negócios"
          onPage={onPage}
        />
      }
    >
      <thead className={theadCls}>
        <tr>
          <th scope="col" className={thCls}>Cliente</th>
          <th scope="col" className={thCls}>Etapa</th>
          <th scope="col" className={thCls}>Status</th>
          <th scope="col" className={thNumCls}>Valor</th>
          <th scope="col" className={thCls}>Atendente</th>
          <th scope="col" className={thCls}>Criado</th>
          <th scope="col" className={thCls}>Fechado</th>
        </tr>
      </thead>
      <tbody className={tbodyCls}>
        {report.rows.map((r) => {
          const status = STATUS[r.status];
          return (
            <tr key={r.id} className={trCls}>
              <td className={`${tdTruncateCls} w-[28%] font-medium`} title={r.contactName ?? undefined}>
                {r.contactName ?? '—'}
              </td>
              <td className={`${tdTruncateCls} w-[20%]`} title={r.stageName}>{r.stageName}</td>
              <td className={tdCls}>
                <Badge variant={status?.variant ?? 'neutral'}>{status?.label ?? r.status}</Badge>
              </td>
              <td className={tdNumCls}>{brl(r.value)}</td>
              <td className={`${tdTruncateCls} w-[20%]`} title={r.assignedToName ?? undefined}>
                {r.assignedToName ?? '—'}
              </td>
              <td className={`${tdMutedCls} font-mono tabular-nums`}>{formatDate(r.createdAt)}</td>
              <td className={`${tdMutedCls} font-mono tabular-nums`}>{formatDate(r.closedAt)}</td>
            </tr>
          );
        })}
        {report.rows.length === 0 && (
          <EmptyRow colSpan={COLUMN_COUNT}>Nenhum negócio com esses filtros.</EmptyRow>
        )}
      </tbody>
    </TableCard>
  );
}
