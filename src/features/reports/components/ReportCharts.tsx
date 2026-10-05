'use client';
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import type { SalesReport } from '../services/sales-reports.service';
import { CHART_GRID, CHART_SEQ, chartAxisTick, chartTooltipStyle } from '@/lib/chart-theme';
import { shortenChartLabel } from './chart-label';

const CATEGORY_AXIS_WIDTH = 150;
const ROW_HEIGHT = 34;
const MIN_CHART_HEIGHT = 220;
const CHART_PADDING = 40;

const fmtBRL = (v: number) =>
  'R$ ' + (v || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 });

interface CategoryTickProps {
  x?: number | string;
  y?: number | string;
  payload?: { value?: unknown };
}

/**
 * Rótulo do eixo de categorias sempre em uma linha: o Recharts quebrava
 * "Universal 3-Park…" em duas ou três. O nome inteiro fica no `<title>` e na
 * dica da barra.
 */
function CategoryTick({ x, y, payload }: CategoryTickProps) {
  const fullLabel = payload?.value === null || payload?.value === undefined ? '' : String(payload.value);
  return (
    <text x={x} y={y} dy={4} textAnchor="end" fontSize={chartAxisTick.fontSize} fill={chartAxisTick.fill}>
      <title>{fullLabel}</title>
      {shortenChartLabel(fullLabel)}
    </text>
  );
}

export function ChartCard({
  title,
  data,
  nameKey,
  className = '',
}: {
  title: string;
  data: Array<Record<string, unknown>>;
  nameKey: string;
  className?: string;
}) {
  const height = Math.max(MIN_CHART_HEIGHT, data.length * ROW_HEIGHT + CHART_PADDING);
  return (
    <div className={`min-w-0 rounded-xl border border-border bg-card p-4 shadow-soft sm:p-5 ${className}`}>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {data.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma venda no período.</p>
      ) : (
        <div className="mt-4">
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} horizontal={false} />
              <XAxis type="number" tickFormatter={fmtBRL} tick={chartAxisTick} />
              <YAxis
                type="category"
                dataKey={nameKey}
                width={CATEGORY_AXIS_WIDTH}
                tick={<CategoryTick />}
                interval={0}
                tickLine={false}
              />
              <Tooltip
                contentStyle={chartTooltipStyle}
                cursor={{ fill: 'var(--color-muted)', opacity: 0.6 }}
                formatter={(v) => [fmtBRL(Number(v)), 'Vendas']}
              />
              <Bar dataKey="venda" fill={CHART_SEQ} radius={[0, 4, 4, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export function ReportCharts({ report }: { report: SalesReport }) {
  const vendedores = report.bySeller.slice(0, 12);
  const produtos = report.byProduct.slice(0, 10);
  const fornecedores = report.byFornecedor.slice(0, 10);

  // Vendedores ocupa a linha inteira; produto e fornecedor dividem a de baixo.
  // Com dois gráficos por linha e três gráficos, o último ficava sozinho.
  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      {vendedores.length > 0 && (
        <ChartCard
          className="lg:col-span-2"
          title="Vendas por vendedor"
          data={vendedores}
          nameKey="vendedor"
        />
      )}
      <ChartCard title="Vendas por produto" data={produtos} nameKey="produto" />
      <ChartCard title="Vendas por fornecedor" data={fornecedores} nameKey="fornecedor" />
    </div>
  );
}
