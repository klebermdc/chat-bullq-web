'use client';

import { useState } from 'react';
import { User } from 'lucide-react';
import type {
  LeadDistributionRow,
  ScoreboardSparkPoint,
} from '@/features/dashboard/services/dashboard.service';
import { formatNumber } from '@/features/dashboard/lib/format';
import {
  tableCls, tableScrollCls, tbodyCls, tdBaseCls, tdNumCls, thCls, thNumCls, theadCls, trCls,
} from '@/features/crm-reports/components/table-parts';
import { EmptyState } from '@/components/ui/empty-state';
import { CHART_SEQ } from '@/lib/chart-theme';
import { getInitials } from '@/lib/initials';

const PODIUM_SIZE = 3;

function Avatar({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  const [broken, setBroken] = useState(false);
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-[11px] font-semibold text-muted-foreground">
      {avatarUrl && !broken ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setBroken(true)}
        />
      ) : (
        getInitials(name) || <User aria-hidden="true" className="h-3.5 w-3.5" />
      )}
    </div>
  );
}

function Sparkline({ points }: { points: ScoreboardSparkPoint[] }) {
  const max = Math.max(1, ...points.map((p) => p.count));
  return (
    <div className="ml-auto flex h-8 w-fit items-end gap-[2px]" aria-hidden>
      {points.map((p) => (
        <div
          key={p.date}
          title={`${p.date}: ${p.count}`}
          className="w-1.5 rounded-sm opacity-70"
          style={{
            backgroundColor: CHART_SEQ,
            height: `${Math.round((p.count / max) * 100)}%`,
            minHeight: p.count > 0 ? 2 : 1,
          }}
        />
      ))}
    </div>
  );
}

function Rank({ position }: { position: number }) {
  const isPodium = position <= PODIUM_SIZE;
  return (
    <span
      className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums ${
        isPodium ? 'bg-primary/10 text-primary' : 'text-muted-foreground'
      }`}
    >
      {position}
    </span>
  );
}

export function LeadDistributionScoreboard({ rows }: { rows: LeadDistributionRow[] }) {
  if (rows.length === 0) {
    return <EmptyState size="sm" title="Nenhum lead distribuído ainda" />;
  }

  const sorted = [...rows].sort(
    (a, b) =>
      b.month - a.month ||
      b.today - a.today ||
      a.agent.name.localeCompare(b.agent.name),
  );

  return (
    <div className={tableScrollCls}>
      <table aria-label="Placar de distribuição de leads" className={`${tableCls} min-w-[480px]`}>
        <thead className={theadCls}>
          <tr>
            <th scope="col" className={`${thCls} text-center`}>
              <abbr title="Posição" className="no-underline">#</abbr>
            </th>
            <th scope="col" className={`${thCls} w-full`}>Atendente</th>
            <th scope="col" className={thNumCls}>14 dias</th>
            <th scope="col" className={thNumCls}>Hoje</th>
            <th scope="col" className={thNumCls}>Mês</th>
          </tr>
        </thead>
        <tbody className={tbodyCls}>
          {sorted.map((r, i) => (
            <tr key={r.agent.id} className={trCls}>
              <td className={`${tdBaseCls} text-center`}><Rank position={i + 1} /></td>
              <td className={tdBaseCls}>
                <div className="flex min-w-0 items-center gap-2">
                  <Avatar name={r.agent.name} avatarUrl={r.agent.avatarUrl} />
                  <p className="truncate font-medium text-foreground">{r.agent.name}</p>
                </div>
              </td>
              <td className={tdBaseCls}><Sparkline points={r.spark} /></td>
              <td className={`${tdNumCls} font-semibold`}>{formatNumber(r.today)}</td>
              <td className={tdNumCls}>{formatNumber(r.month)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
