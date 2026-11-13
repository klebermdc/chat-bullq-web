import { Badge } from '@/components/ui/badge';
import {
  EmptyRow,
  tableCls,
  tbodyCls,
  tdBaseCls,
  tdNumCls,
  thCls,
  theadCls,
  thNumCls,
  trCls,
} from '@/features/crm-reports/components/table-parts';
import { categoryLabel, isChargedType, typeLabel } from '../lib/labels';
import { formatCost, formatCount } from '../lib/format';
import { sortCategoryRows } from '../lib/selectors';
import type { CategoryRow } from '../services/whatsapp-costs.service';
import { SectionCard } from './section-parts';

const COLUMN_COUNT = 3;

/** Três colunas, que cabem no celular sem rolar para o lado. */
export function CategoryTable({ rows, currency }: { rows: ReadonlyArray<CategoryRow>; currency: string }) {
  const sorted = sortCategoryRows(rows);
  return (
    <SectionCard flush title="Por tipo de mensagem" subtitle="O que a Meta cobrou e o que saiu de graça no período">
      <table aria-label="Mensagens e custo por tipo" className={tableCls}>
        <thead className={theadCls}>
          <tr>
            <th scope="col" className={thCls}>Tipo</th>
            <th scope="col" className={thNumCls}>Mensagens</th>
            <th scope="col" className={thNumCls}>Custo</th>
          </tr>
        </thead>
        <tbody className={tbodyCls}>
          {sorted.length === 0 && <EmptyRow colSpan={COLUMN_COUNT}>Nenhuma mensagem no período.</EmptyRow>}
          {sorted.map((row) => {
            const isCharged = isChargedType(row.type);
            return (
              <tr key={`${row.category}|${row.type}`} className={trCls}>
                <td className={tdBaseCls}>
                  <span className="block font-medium">{categoryLabel(row.category)}</span>
                  <Badge className="mt-1" variant={isCharged ? 'hot' : 'neutral'}>
                    {typeLabel(row.type)}
                  </Badge>
                </td>
                <td className={tdNumCls}>{formatCount(row.volume)}</td>
                <td className={tdNumCls}>{isCharged ? formatCost(row.cost, currency) : 'Grátis'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </SectionCard>
  );
}
