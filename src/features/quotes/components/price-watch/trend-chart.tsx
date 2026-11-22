'use client';

import { useState } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  CHART_GRID,
  CHART_MUTED,
  CHART_SERIES,
  chartAxisTick,
  chartTooltipStyle,
  formatChartDay,
} from '@/lib/chart-theme';
import { formatQuoteMoney } from '../../lib/quote-format';
import type { PriceWatchItemTrend } from '../../types';

const SERIES = [
  { key: 'ours', label: 'OFP', color: CHART_SERIES[0], dash: undefined },
  { key: 'min', label: 'Mais barato do mercado', color: CHART_SERIES[1], dash: undefined },
  { key: 'avg', label: 'Média das lojas', color: CHART_MUTED, dash: '4 3' },
] as const;

const money = (v: unknown) => (typeof v === 'number' ? (formatQuoteMoney(v, 'BRL') ?? '') : String(v ?? ''));

/** Linha do tempo de um item da cesta: nosso preço × mais barato × média. */
export function TrendChart({ items }: { items: PriceWatchItemTrend[] }) {
  const [key, setKey] = useState(items[0]?.key ?? '');
  const item = items.find((i) => i.key === key) ?? items[0];
  if (!item) return null;
  const last = item.points[item.points.length - 1];
  const summary = `${item.label}: OFP ${money(last?.ours)}, mais barato ${money(last?.min)} (${last?.minStoreName ?? '—'}) no último dia`;
  return (
    <section className="space-y-2 rounded-md border border-border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-medium">Tendência de preço</h2>
        <select
          value={item.key}
          onChange={(e) => setKey(e.target.value)}
          aria-label="Item da cesta"
          className="h-8 max-w-full rounded-md border border-border bg-background px-2 text-xs"
        >
          {items.map((i) => (
            <option key={i.key} value={i.key}>
              {i.label}
            </option>
          ))}
        </select>
      </div>
      <p className="text-xs text-muted-foreground">
        {summary}. {last ? `${last.cheaperCount} de ${last.storeCount} lojas abaixo de nós.` : ''}
      </p>
      <div role="img" aria-label={summary} className="h-64 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={item.points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
            <XAxis dataKey="day" tick={chartAxisTick} tickFormatter={formatChartDay} minTickGap={16} />
            <YAxis
              tick={chartAxisTick}
              width={64}
              domain={['auto', 'auto']}
              tickFormatter={(v: number) => `R$ ${Math.round(v)}`}
            />
            <Tooltip
              contentStyle={chartTooltipStyle}
              labelFormatter={formatChartDay}
              formatter={(v: unknown) => money(v)}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} iconSize={8} />
            {SERIES.map((s) => (
              <Line
                key={s.key}
                dataKey={s.key}
                name={s.label}
                stroke={s.color}
                strokeWidth={2}
                strokeDasharray={s.dash}
                dot={{ r: 4 }}
                connectNulls
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
