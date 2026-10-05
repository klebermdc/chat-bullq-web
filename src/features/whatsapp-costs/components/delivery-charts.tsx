'use client';

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
import { CHART_SERIES } from '@/lib/chart-theme';
import { describeTotals } from '../lib/billing-series';
import { formatCount } from '../lib/format';
import type { DeliveryDay, DeliveryResponse } from '../services/whatsapp-costs.service';
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

type DayCountKey = Exclude<keyof DeliveryDay, 'date'>;

interface DeliverySeries {
  key: DayCountKey;
  label: string;
  color: string;
}

const STATUS_TITLE = 'Enviadas, entregues, lidas e falhas por dia';
const STATUS_SERIES: ReadonlyArray<DeliverySeries> = [
  { key: 'outbound', label: 'Enviadas', color: CHART_SERIES[0] },
  { key: 'delivered', label: 'Entregues', color: CHART_SERIES[2] },
  { key: 'read', label: 'Lidas', color: CHART_SERIES[3] },
  { key: 'failed', label: 'Falhas', color: CHART_SERIES[1] },
];

const KIND_TITLE = 'Template × texto livre por dia';
const KIND_SERIES: ReadonlyArray<DeliverySeries> = [
  { key: 'templates', label: 'Template', color: CHART_SERIES[4] },
  { key: 'freeForm', label: 'Texto livre', color: CHART_SERIES[5] },
];

function summarize(title: string, series: ReadonlyArray<DeliverySeries>, daily: DeliveryDay[]): string {
  const items = series.map((s) => ({
    label: s.label,
    value: formatCount(daily.reduce((sum, day) => sum + (day[s.key] ?? 0), 0)),
  }));
  return describeTotals(title, items);
}

export function DeliveryCharts({ delivery }: { delivery: DeliveryResponse }) {
  const { daily } = delivery;

  return (
    <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
      <SectionCard title={STATUS_TITLE} subtitle="Mensagens de saída do WhatsApp oficial">
        <ChartFrame summary={summarize(STATUS_TITLE, STATUS_SERIES, daily)} className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={daily}>
              <CartesianGrid {...gridProps} />
              <XAxis {...dayAxisProps} />
              <YAxis {...countAxisProps} />
              <Tooltip {...countTooltipProps} />
              <Legend {...legendProps} />
              {STATUS_SERIES.map((s) => (
                <Line
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.label}
                  stroke={s.color}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </ChartFrame>
      </SectionCard>

      <SectionCard title={KIND_TITLE} subtitle="Quanto do envio depende de template">
        <ChartFrame summary={summarize(KIND_TITLE, KIND_SERIES, daily)} className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={daily}>
              <CartesianGrid {...gridProps} />
              <XAxis {...dayAxisProps} />
              <YAxis {...countAxisProps} />
              <Tooltip {...countTooltipProps} cursor={barCursor} />
              <Legend {...legendProps} />
              {KIND_SERIES.map((s) => (
                <Bar
                  key={s.key}
                  dataKey={s.key}
                  name={s.label}
                  stackId="kind"
                  fill={s.color}
                  maxBarSize={MAX_BAR_SIZE}
                  isAnimationActive={false}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </ChartFrame>
      </SectionCard>
    </div>
  );
}
