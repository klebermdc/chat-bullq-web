import { brl } from './StatCard';

type Row = Record<string, any>;

export function OrdersTable({ orders }: { orders: Row[] }) {
  if (!orders?.length) return <p className="text-sm text-zinc-500">Sem pedidos para exibir.</p>;
  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <table className="w-full text-sm">
        <thead className="border-b border-zinc-200 text-left text-zinc-500 dark:border-zinc-800">
          <tr>
            {['Pedido', 'Cliente', 'Vendedor', 'Produto', 'Venda', 'Comissão', 'Status', 'Data'].map((h) => (
              <th key={h} className="whitespace-nowrap px-3 py-2 font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {orders.map((o, i) => (
            <tr key={(o.id as string) ?? i} className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/60">
              <td className="whitespace-nowrap px-3 py-2">{o.pedido ?? '-'}</td>
              <td className="whitespace-nowrap px-3 py-2">{o.cliente ?? '-'}</td>
              <td className="whitespace-nowrap px-3 py-2">{o.vendedor ?? '-'}</td>
              <td className="whitespace-nowrap px-3 py-2">{o.produto ?? '-'}</td>
              <td className="whitespace-nowrap px-3 py-2">{brl(Number(o.venda) || 0)}</td>
              <td className="whitespace-nowrap px-3 py-2">{brl(Number(o.comissao_vendedor) || 0)}</td>
              <td className="whitespace-nowrap px-3 py-2">{o.status ?? '-'}</td>
              <td className="whitespace-nowrap px-3 py-2">{o.data ?? '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
