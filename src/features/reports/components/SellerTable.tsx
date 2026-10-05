import type { SalesReport } from '../services/sales-reports.service';
import {
  EmptyRow, TableCard,
  tbodyCls, tdNumCls, tdTruncateCls, thCls, thNumCls, theadCls, trCls,
} from '@/features/crm-reports/components/table-parts';
import { brl } from './StatCard';

const COLUMN_COUNT = 4;

export function SellerTable({ rows }: { rows: SalesReport['bySeller'] }) {
  return (
    <TableCard label="Vendas por vendedor" minWidth="min-w-[520px]">
      <thead className={theadCls}>
        <tr>
          <th scope="col" className={`${thCls} w-full`}>Vendedor</th>
          <th scope="col" className={thNumCls}>Pedidos</th>
          <th scope="col" className={thNumCls}>Vendas</th>
          <th scope="col" className={thNumCls}>Comissão</th>
        </tr>
      </thead>
      <tbody className={tbodyCls}>
        {rows.map((r) => (
          <tr key={r.vendedor} className={trCls}>
            <td className={`${tdTruncateCls} w-full font-medium`} title={r.vendedor}>{r.vendedor}</td>
            <td className={tdNumCls}>{r.orders.toLocaleString('pt-BR')}</td>
            <td className={tdNumCls}>{brl(r.venda)}</td>
            <td className={tdNumCls}>{brl(r.comissaoVendedor)}</td>
          </tr>
        ))}
        {rows.length === 0 && <EmptyRow colSpan={COLUMN_COUNT}>Nenhuma venda no período.</EmptyRow>}
      </tbody>
    </TableCard>
  );
}
