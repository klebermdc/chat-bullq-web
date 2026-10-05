import { Badge, type BadgeProps } from '@/components/ui/badge';
import type { ConversationsReport } from '../services/crm-reports.service';
import { fmtDuration } from './conversations-metrics';
import {
  EmptyRow, Pager, TableCard, formatDate,
  tbodyCls, tdCls, tdMutedCls, tdNumCls, tdTruncateCls, thCls, thNumCls, theadCls, trCls,
} from './table-parts';

const COLUMN_COUNT = 8;

const STATUS: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
  PENDING: { label: 'Pendente', variant: 'hot' },
  BOT: { label: 'Bot', variant: 'info' },
  OPEN: { label: 'Aberta', variant: 'brand' },
  WAITING: { label: 'Aguardando', variant: 'neutral' },
  CLOSED: { label: 'Finalizada', variant: 'success' },
};

export function ConversationsTable({
  report,
  onPage,
}: {
  report: ConversationsReport;
  onPage: (page: number) => void;
}) {
  return (
    <TableCard
      label="Conversas do período"
      minWidth="min-w-[880px]"
      footer={
        <Pager
          page={report.page}
          totalPages={report.totalPages}
          total={report.total}
          noun="conversas"
          onPage={onPage}
        />
      }
    >
      <thead className={theadCls}>
        <tr>
          <th scope="col" className={thCls}>Contato</th>
          <th scope="col" className={thCls}>Canal</th>
          <th scope="col" className={thCls}>Status</th>
          <th scope="col" className={thCls}>Atendente</th>
          <th scope="col" className={thNumCls}>1ª resposta</th>
          <th scope="col" className={thNumCls}>Reaberturas</th>
          <th scope="col" className={thCls}>Criada</th>
          <th scope="col" className={thCls}>Fechada</th>
        </tr>
      </thead>
      <tbody className={tbodyCls}>
        {report.rows.map((r) => {
          const status = STATUS[r.status];
          return (
            <tr key={r.id} className={trCls}>
              {/* Nome, canal e atendente dividem a sobra e cortam com
                  reticências: as colunas de data nunca saem do cartão. */}
              <td className={`${tdTruncateCls} w-[26%] font-medium`} title={r.contactName ?? undefined}>
                {r.contactName ?? '—'}
              </td>
              <td className={`${tdTruncateCls} w-[18%]`} title={r.channelName ?? undefined}>
                {r.channelName ?? '—'}
              </td>
              <td className={tdCls}>
                <Badge variant={status?.variant ?? 'neutral'}>{status?.label ?? r.status}</Badge>
              </td>
              <td className={`${tdTruncateCls} w-[18%]`} title={r.assignedToName ?? undefined}>
                {r.assignedToName ?? '—'}
              </td>
              <td className={tdNumCls}>{fmtDuration(r.firstResponseSeconds)}</td>
              <td className={tdNumCls}>{r.reopenedCount > 0 ? r.reopenedCount : '—'}</td>
              <td className={`${tdMutedCls} font-mono tabular-nums`}>{formatDate(r.createdAt)}</td>
              <td className={`${tdMutedCls} font-mono tabular-nums`}>{formatDate(r.closedAt)}</td>
            </tr>
          );
        })}
        {report.rows.length === 0 && (
          <EmptyRow colSpan={COLUMN_COUNT}>Nenhuma conversa com esses filtros.</EmptyRow>
        )}
      </tbody>
    </TableCard>
  );
}
