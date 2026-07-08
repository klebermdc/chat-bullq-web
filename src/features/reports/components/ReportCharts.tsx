'use client';
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import type { SalesReport } from '../services/sales-reports.service';

const COLORS = ['#7c3aed', '#2563eb', '#059669', '#d97706', '#dc2626', '#0891b2', '#c026d3'];

export function ReportCharts({ report }: { report: SalesReport }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-200">Vendas por mês</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={report.byMonth}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="month" fontSize={12} />
            <YAxis fontSize={12} />
            <Tooltip formatter={(v) => Number(v).toLocaleString('pt-BR')} />
            <Bar dataKey="venda" fill="#7c3aed" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-200">Pedidos por status</h3>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie data={report.byStatus} dataKey="count" nameKey="status" outerRadius={90} label>
              {report.byStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Legend />
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
