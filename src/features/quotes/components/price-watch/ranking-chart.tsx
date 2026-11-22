'use client';

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CHART_MUTED, CHART_SERIES, chartAxisTick, chartTooltipStyle } from '@/lib/chart-theme';
import { formatQuoteMoney } from '../../lib/quote-format';
import { rankingRows } from '../../lib/price-watch';
import type { CompetitorComparison, CompetitorItemResult } from '../../types';

const ROW_HEIGHT = 22;
const NAME_AXIS_WIDTH = 150;
const OURS_COLOR = CHART_SERIES[0];

/** Posição da OFP entre as lojas mais baratas do item (barras deitadas, do mais barato ao mais caro). */
export function RankingChart({
  item,
  result,
  currency,
}: {
  item: CompetitorItemResult;
  result: CompetitorComparison;
  currency: string;
}) {
  const rows = rankingRows(item, result);
  if (rows.length < 2) return null;
  const position = rows.findIndex((r) => r.isOurs) + 1;
  const summary = `OFP em ${position}º lugar entre ${rows.length} preços mostrados`;
  return (
    <figure className="space-y-1">
      <figcaption className="text-[11px] text-muted-foreground">
        {summary} (só as lojas mais baratas aparecem)
      </figcaption>
      <div role="img" aria-label={summary} style={{ height: rows.length * ROW_HEIGHT + 16 }} className="w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 0 }} barCategoryGap={2}>
            <XAxis type="number" hide domain={['dataMin - 50', 'dataMax']} />
            <YAxis
              type="category"
              dataKey="name"
              width={NAME_AXIS_WIDTH}
              tick={chartAxisTick}
              tickFormatter={(v: string) => (v.length > 22 ? `${v.slice(0, 21)}…` : v)}
              interval={0}
            />
            <Tooltip
              contentStyle={chartTooltipStyle}
              cursor={{ fill: 'var(--color-muted)', opacity: 0.6 }}
              formatter={(value: unknown) => [
                typeof value === 'number' ? formatQuoteMoney(value, currency) : String(value ?? ''),
                'Preço',
              ]}
            />
            <Bar dataKey="total" radius={[0, 4, 4, 0]} isAnimationActive={false}>
              {rows.map((r) => (
                <Cell key={r.name} fill={r.isOurs ? OURS_COLOR : CHART_MUTED} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
