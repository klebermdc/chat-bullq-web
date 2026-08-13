'use client';

import {
  Bar, Line, ComposedChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import type { MarketingDailyPoint } from '../services/marketing.service';

// Mesma paleta e "contentStyle" de tooltip usados no dashboard
// (src/app/(dashboard)/dashboard/page.tsx), pra manter os gráficos consistentes.
const tooltipStyle = {
  background: 'rgba(24,24,27,0.92)', border: 'none', borderRadius: 6,
  fontSize: 11, padding: '6px 10px', color: '#fff',
};

const SPEND_COLOR = '#3b82f6';
const LEADS_COLOR = '#10b981';

const fmtBRL = (v: number) => 'R$ ' + v.toLocaleString('pt-BR', { maximumFractionDigits: 0 });

export function SpendLeadsChart({ data }: { data: MarketingDailyPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-zinc-400">
        Sem dados no período.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d: string) => d.slice(5)} />
        <YAxis
          yAxisId="spend"
          orientation="left"
          tick={{ fontSize: 10, fill: SPEND_COLOR }}
          tickFormatter={fmtBRL}
          width={64}
        />
        <YAxis
          yAxisId="leads"
          orientation="right"
          tick={{ fontSize: 10, fill: LEADS_COLOR }}
          allowDecimals={false}
          width={36}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          labelFormatter={(d) => (typeof d === 'string' ? d : '')}
          formatter={(value, name) => (name === 'Investimento' ? [fmtBRL(Number(value)), name] : [value, name])}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} iconSize={8} />
        <Bar yAxisId="spend" dataKey="spend" name="Investimento" fill={SPEND_COLOR} radius={[4, 4, 0, 0]} barSize={18} />
        <Line
          yAxisId="leads"
          type="monotone"
          dataKey="leads"
          name="Leads"
          stroke={LEADS_COLOR}
          strokeWidth={2}
          dot={{ r: 3 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
