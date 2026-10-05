'use client';

import {
  Bar, BarChart, Line, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import type { MarketingDailyPoint } from '../services/marketing.service';
import {
  CHART_GRID, CHART_SERIES, chartAxisTick, chartTooltipStyle, formatChartDay,
} from '@/lib/chart-theme';

const fmtBRL = (v: number) => 'R$ ' + v.toLocaleString('pt-BR', { maximumFractionDigits: 0 });

const SPEND_COLOR = CHART_SERIES[0];
const LEADS_COLOR = CHART_SERIES[2];
const Y_AXIS_WIDTH = 64;
const MARGIN = { top: 4, right: 8, left: 0, bottom: 0 };

function Caption({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
      <span aria-hidden="true" className="h-2 w-2 rounded-sm" style={{ backgroundColor: color }} />
      {children}
    </p>
  );
}

/**
 * Investimento e leads por dia. São duas medidas de escalas diferentes, então
 * vão em dois gráficos com o mesmo eixo de datas — um gráfico só com dois
 * eixos Y deixa o cruzamento das linhas parecer um dado, e não é.
 */
export function SpendLeadsChart({ data }: { data: MarketingDailyPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        Sem dados no período.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <Caption color={SPEND_COLOR}>Investimento por dia</Caption>
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={data} margin={MARGIN} syncId="spend-leads">
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
            <XAxis dataKey="date" tick={chartAxisTick} tickFormatter={formatChartDay} />
            <YAxis tick={chartAxisTick} tickFormatter={fmtBRL} width={Y_AXIS_WIDTH} />
            <Tooltip
              contentStyle={chartTooltipStyle}
              cursor={{ fill: 'var(--color-muted)', opacity: 0.6 }}
              labelFormatter={formatChartDay}
              formatter={(value) => [fmtBRL(Number(value)), 'Investimento']}
            />
            <Bar dataKey="spend" name="Investimento" fill={SPEND_COLOR} radius={[4, 4, 0, 0]} maxBarSize={18} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div>
        <Caption color={LEADS_COLOR}>Leads por dia</Caption>
        <ResponsiveContainer width="100%" height={130}>
          <LineChart data={data} margin={MARGIN} syncId="spend-leads">
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
            <XAxis dataKey="date" tick={chartAxisTick} tickFormatter={formatChartDay} />
            <YAxis tick={chartAxisTick} allowDecimals={false} width={Y_AXIS_WIDTH} />
            <Tooltip
              contentStyle={chartTooltipStyle}
              labelFormatter={formatChartDay}
              formatter={(value) => [value, 'Leads']}
            />
            <Line type="monotone" dataKey="leads" name="Leads" stroke={LEADS_COLOR} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
