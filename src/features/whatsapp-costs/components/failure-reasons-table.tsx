import {
  EmptyRow,
  tableCls,
  tableScrollCls,
  tbodyCls,
  tdBaseCls,
  tdNumCls,
  thCls,
  theadCls,
  thNumCls,
  trCls,
} from '@/features/crm-reports/components/table-parts';
import { cn } from '@/lib/utils';
import { formatCount, formatRatioPercent, shareOf } from '../lib/format';
import { SectionCard } from './section-parts';

const COLUMN_COUNT = 3;

interface FailureReason {
  reason: string;
  count: number;
}

export function FailureReasonsTable({
  reasons,
  totalFailed,
}: {
  reasons: FailureReason[];
  /** Total de falhas do período; a parcela de cada motivo é sobre ele. */
  totalFailed: number;
}) {
  // A API lista só os motivos principais: a parcela é sobre todas as falhas.
  const listedTotal = reasons.reduce((sum, r) => sum + r.count, 0);
  const total = Math.max(totalFailed, listedTotal);

  return (
    <SectionCard flush title="Motivos de falha" subtitle="Por que as mensagens não chegaram, do mais comum ao menos comum">
      <div className={tableScrollCls}>
        <table aria-label="Motivos de falha no envio" className={cn(tableCls, 'min-w-[420px]')}>
          <thead className={theadCls}>
            <tr>
              <th scope="col" className={thCls}>Motivo</th>
              <th scope="col" className={thNumCls}>Falhas</th>
              <th scope="col" className={thNumCls}>Parcela</th>
            </tr>
          </thead>
          <tbody className={tbodyCls}>
            {reasons.length === 0 && <EmptyRow colSpan={COLUMN_COUNT}>Nenhuma falha no período.</EmptyRow>}
            {reasons.map((row) => (
              <tr key={row.reason} className={trCls}>
                <td className={tdBaseCls}>{row.reason}</td>
                <td className={tdNumCls}>{formatCount(row.count)}</td>
                <td className={tdNumCls}>{formatRatioPercent(shareOf(row.count, total))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}
