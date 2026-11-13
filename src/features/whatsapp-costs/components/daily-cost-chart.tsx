'use client';

import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { chartAxisTick } from '@/lib/chart-theme';
import { cn } from '@/lib/utils';
import { buildDailyChart, describeChart, seriesTotal, type ChartMode } from '../lib/chart-series';
import { formatAxisMoney, formatCost, formatCount } from '../lib/format';
import type { CostDay } from '../services/whatsapp-costs.service';
import {
  MAX_BAR_SIZE,
  VALUE_AXIS_WIDTH,
  barCursor,
  dayAxisProps,
  gridProps,
  legendProps,
  tooltipBaseProps,
} from './chart-props';
import { ChartFrame, SectionCard } from './section-parts';

const MODES: ReadonlyArray<{ value: ChartMode; label: string }> = [
  { value: 'cost', label: 'Custo' },
  { value: 'volume', label: 'Mensagens' },
];

const SUBTITLES: Record<ChartMode, string> = {
  cost: 'Quanto a Meta cobrou em cada dia, por tipo de mensagem',
  volume: 'Mensagens cobradas por tipo e, em tom claro, as grátis',
};

function ModeToggle({ value, onChange }: { value: ChartMode; onChange: (mode: ChartMode) => void }) {
  return (
    <div role="group" aria-label="Mostrar no gráfico" className="inline-flex rounded-lg bg-muted p-0.5">
      {MODES.map((mode) => (
        <button
          key={mode.value}
          type="button"
          aria-pressed={mode.value === value}
          onClick={() => onChange(mode.value)}
          className={cn(
            'h-8 rounded-md px-2.5 text-xs font-medium transition-colors sm:h-7',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            mode.value === value
              ? 'bg-background text-foreground shadow-soft'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {mode.label}
        </button>
      ))}
    </div>
  );
}

export function DailyCostChart({ daily, currency }: { daily: ReadonlyArray<CostDay>; currency: string }) {
  const [mode, setMode] = useState<ChartMode>('cost');
  const chart = useMemo(() => buildDailyChart(daily, mode), [daily, mode]);

  const formatValue = (value: number) => (mode === 'cost' ? formatCost(value, currency) : formatCount(value));
  const title = mode === 'cost' ? 'Custo por dia' : 'Mensagens por dia';
  const summary = describeChart(
    title,
    chart.series.map((s) => ({ label: s.label, value: formatValue(seriesTotal(chart.rows, s.key)) })),
  );

  return (
    <SectionCard title={title} subtitle={SUBTITLES[mode]} actions={<ModeToggle value={mode} onChange={setMode} />}>
      <ChartFrame summary={summary} className="h-64 sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chart.rows}>
            <CartesianGrid {...gridProps} />
            <XAxis {...dayAxisProps} />
            <YAxis
              tick={chartAxisTick}
              width={VALUE_AXIS_WIDTH}
              allowDecimals={mode === 'cost'}
              tickFormatter={(value: number) => (mode === 'cost' ? formatAxisMoney(value) : formatCount(value))}
            />
            <Tooltip
              {...tooltipBaseProps}
              cursor={barCursor}
              formatter={(value: unknown) => (typeof value === 'number' ? formatValue(value) : String(value ?? ''))}
            />
            <Legend {...legendProps} />
            {chart.series.map((s) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                name={s.label}
                stackId="day"
                fill={s.color}
                maxBarSize={MAX_BAR_SIZE}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </ChartFrame>
    </SectionCard>
  );
}
