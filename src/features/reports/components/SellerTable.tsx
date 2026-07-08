import type { SalesReport } from '../services/sales-reports.service';
import { brl } from './StatCard';

export function SellerTable({ rows }: { rows: SalesReport['bySeller'] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <table className="w-full text-sm">
        <thead className="border-b border-zinc-200 text-left text-zinc-500 dark:border-zinc-800">
          <tr>
            <th className="px-4 py-3 font-medium">Vendedor</th>
            <th className="px-4 py-3 font-medium">Pedidos</th>
            <th className="px-4 py-3 font-medium">Vendas</th>
            <th className="px-4 py-3 font-medium">Comissão</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.vendedor} className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/60">
              <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">{r.vendedor}</td>
              <td className="px-4 py-3">{r.orders}</td>
              <td className="px-4 py-3">{brl(r.venda)}</td>
              <td className="px-4 py-3">{brl(r.comissaoVendedor)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
