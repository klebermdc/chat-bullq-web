'use client';
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import type { SalesReport } from '../services/sales-reports.service';

const fmtBRL = (v: number) =>
  'R$ ' + (v || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 });

function ChartCard({
  title,
  data,
  nameKey,
  color,
}: {
  title: string;
  data: Array<Record<string, unknown>>;
  nameKey: string;
  color: string;
}) {
  const height = Math.max(220, data.length * 34 + 40);
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h3 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-200">{title}</h3>
      {data.length === 0 ? (
        <p className="py-8 text-center text-sm text-zinc-400">Sem dados.</p>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
            <XAxis type="number" tickFormatter={fmtBRL} fontSize={11} />
            <YAxis type="category" dataKey={nameKey} width={120} fontSize={11} interval={0} />
            <Tooltip formatter={(v) => fmtBRL(Number(v))} />
            <Bar dataKey="venda" fill={color} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export function ReportCharts({ report }: { report: SalesReport }) {
  const vendedores = report.bySeller.slice(0, 12);
  const produtos = report.byProduct.slice(0, 10);
  const fornecedores = report.byFornecedor.slice(0, 10);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {vendedores.length > 0 && (
        <ChartCard title="Vendas por vendedor" data={vendedores} nameKey="vendedor" color="#7c3aed" />
      )}
      <ChartCard title="Vendas por produto" data={produtos} nameKey="produto" color="#2563eb" />
      <ChartCard title="Vendas por fornecedor" data={fornecedores} nameKey="fornecedor" color="#059669" />
    </div>
  );
}
