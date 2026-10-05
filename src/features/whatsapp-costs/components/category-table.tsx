import { Badge } from '@/components/ui/badge';
import {
  EmptyRow,
  tableCls,
  tableScrollCls,
  tbodyCls,
  tdCls,
  tdNumCls,
  thCls,
  theadCls,
  thNumCls,
  trCls,
} from '@/features/crm-reports/components/table-parts';
import { cn } from '@/lib/utils';
import { categoryLabel } from '../lib/billing-series';
import { formatCost, formatCount } from '../lib/format';
import type { BillingCategoryRow } from '../services/whatsapp-costs.service';
import { SectionCard } from './section-parts';

const COLUMN_COUNT = 4;

export function CategoryTable({ rows, currency }: { rows: BillingCategoryRow[]; currency: string }) {
  return (
    <SectionCard
      flush
      title="Por categoria"
      subtitle="O que a Meta marcou como cobrado e como grátis no período"
    >
      <div className={tableScrollCls}>
        <table aria-label="Mensagens e custo estimado por categoria" className={cn(tableCls, 'min-w-[480px]')}>
          <thead className={theadCls}>
            <tr>
              <th scope="col" className={thCls}>Categoria</th>
              <th scope="col" className={thCls}>Situação</th>
              <th scope="col" className={thNumCls}>Mensagens</th>
              <th scope="col" className={thNumCls}>Custo estimado</th>
            </tr>
          </thead>
          <tbody className={tbodyCls}>
            {rows.length === 0 && <EmptyRow colSpan={COLUMN_COUNT}>Nenhuma mensagem no período.</EmptyRow>}
            {rows.map((row) => (
              <tr key={`${row.category}|${row.type ?? ''}|${row.billable}`} className={trCls}>
                <td className={tdCls}>{categoryLabel(row.category)}</td>
                <td className={tdCls}>
                  <Badge variant={row.billable ? 'hot' : 'success'}>{row.billable ? 'Cobrada' : 'Grátis'}</Badge>
                </td>
                <td className={tdNumCls}>{formatCount(row.count)}</td>
                <td className={tdNumCls}>{formatCost(row.estimatedCost, currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}
