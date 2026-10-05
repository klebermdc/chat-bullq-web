'use client';

import { User } from 'lucide-react';
import type { AgentPerformance } from '@/features/dashboard/services/dashboard.service';
import { formatNumber, formatPercent } from '@/features/dashboard/lib/format';
import {
  tableCls, tableScrollCls, tbodyCls, tdBaseCls, tdNumCls, thCls, thNumCls, theadCls, trCls,
} from '@/features/crm-reports/components/table-parts';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { getInitials } from '@/lib/initials';

const RATE_GOOD = 70;
const RATE_FAIR = 40;

function rateVariant(rate: number): BadgeProps['variant'] {
  if (rate >= RATE_GOOD) return 'success';
  if (rate >= RATE_FAIR) return 'hot';
  return 'neutral';
}

function Minutes({ value }: { value: number | null }) {
  if (value === null) return <>—</>;
  return (
    <>
      {formatNumber(value)}
      <span className="ml-0.5 font-sans text-xs text-muted-foreground">min</span>
    </>
  );
}

export function AgentList({ agents }: { agents: AgentPerformance[] }) {
  if (agents.length === 0) {
    return <EmptyState size="sm" title="Nenhum dado de agentes ainda" />;
  }

  const sorted = [...agents].sort((a, b) => b.totalConversations - a.totalConversations);

  return (
    <div className={tableScrollCls}>
      <table aria-label="Performance dos agentes" className={`${tableCls} min-w-[520px]`}>
        <thead className={theadCls}>
          <tr>
            <th scope="col" className={`${thCls} w-full`}>Agente</th>
            <th scope="col" className={thNumCls}>Ativas</th>
            <th scope="col" className={thNumCls}>
              <abbr title="Tempo médio de 1ª resposta" className="no-underline">TMR</abbr>
            </th>
            <th scope="col" className={thNumCls}>
              <abbr title="Tempo médio de atendimento" className="no-underline">TMA</abbr>
            </th>
            <th scope="col" className={thNumCls}>
              <abbr title="Taxa de resolução" className="no-underline">Taxa</abbr>
            </th>
          </tr>
        </thead>
        <tbody className={tbodyCls}>
          {sorted.map((a) => (
            <tr key={a.agent.id} className={trCls}>
              <td className={tdBaseCls}>
                <div className="flex min-w-0 items-center gap-2">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground">
                    {getInitials(a.agent.name) || <User aria-hidden="true" className="h-3.5 w-3.5" />}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{a.agent.name}</p>
                    <p className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">
                      {formatNumber(a.totalConversations)} no período · {formatNumber(a.closedConversations)} fechadas
                    </p>
                  </div>
                </div>
              </td>
              <td className={tdNumCls}>{formatNumber(a.activeConversations)}</td>
              <td className={tdNumCls}><Minutes value={a.avgFirstResponseMinutes} /></td>
              <td className={tdNumCls}><Minutes value={a.avgResolutionMinutes} /></td>
              <td className={tdNumCls}>
                <Badge variant={rateVariant(a.resolutionRate)} className="font-sans tabular-nums">
                  {formatPercent(a.resolutionRate)}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
