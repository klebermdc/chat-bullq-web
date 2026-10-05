'use client';

import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CHART_SEQ, chartAxisTick, chartTooltipStyle, formatChartDay } from '@/lib/chart-theme';
import { buildBillingChart, describeTotals } from '../lib/billing-series';
import { formatCost, formatCount } from '../lib/format';
import type { BillingResponse } from '../services/whatsapp-costs.service';
import {
  MAX_BAR_SIZE,
  barCursor,
  countAxisProps,
  countTooltipProps,
  dayAxisProps,
  gridProps,
  legendProps,
} from './chart-props';
import { ChartFrame, SectionCard } from './section-parts';

const MESSAGES_TITLE = 'Cobráveis e grátis por dia';
const COST_TITLE = 'Custo estimado por dia';
const COST_AXIS_WIDTH = 52;

const formatCostAxis = (value: number) =>
  value.toLocaleString('pt-BR', { maximumFractionDigits: 2 });

export function BillingCharts({ billing }: { billing: BillingResponse }) {
  const { currency, daily, totals } = billing;
  const chart = useMemo(() => buildBillingChart(daily), [daily]);

  const messagesSummary = describeTotals(
    MESSAGES_TITLE,
    chart.series.map((s) => ({ label: s.label, value: formatCount(chart.totals[s.key]) })),
  );
  const costSummary = describeTotals(COST_TITLE, [
    { label: 'Custo estimado', value: formatCost(totals.estimatedCost, currency) },
  ]);

  return (
    <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
      <SectionCard
        className="lg:col-span-2"
        title={MESSAGES_TITLE}
        subtitle="Mensagens por dia, como a Meta marcou cada uma"
      >
        <ChartFrame summary={messagesSummary} className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart.rows}>
              <CartesianGrid {...gridProps} />
              <XAxis {...dayAxisProps} />
              <YAxis {...countAxisProps} />
              <Tooltip {...countTooltipProps} cursor={barCursor} />
              <Legend {...legendProps} />
              {chart.series.map((s) => (
                <Bar
                  key={s.key}
                  dataKey={s.key}
                  name={s.label}
                  stackId="messages"
                  fill={s.color}
                  maxBarSize={MAX_BAR_SIZE}
                  isAnimationActive={false}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </ChartFrame>
      </SectionCard>

      <SectionCard title={COST_TITLE} subtitle="Cobráveis do dia × tarifa da categoria">
        <ChartFrame summary={costSummary} className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={daily}>
              <CartesianGrid {...gridProps} />
              <XAxis {...dayAxisProps} />
              <YAxis tick={chartAxisTick} width={COST_AXIS_WIDTH} tickFormatter={formatCostAxis} />
              <Tooltip
                contentStyle={chartTooltipStyle}
                labelFormatter={formatChartDay}
                formatter={(value: unknown) =>
                  typeof value === 'number' ? formatCost(value, currency) : String(value ?? '')
                }
              />
              <Line
                type="monotone"
                dataKey="estimatedCost"
                name="Custo estimado"
                stroke={CHART_SEQ}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartFrame>
      </SectionCard>
    </div>
  );
}
