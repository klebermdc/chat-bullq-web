'use client';

import type { LeadDistributionRow } from '@/features/dashboard/services/dashboard.service';

const MEDALS = ['🥇', '🥈', '🥉'];

function Sparkline({ points }: { points: { date: string; count: number }[] }) {
  const max = Math.max(1, ...points.map((p) => p.count));
  return (
    <div className="flex h-8 items-end gap-[2px]" aria-hidden>
      {points.map((p) => (
        <div
          key={p.date}
          title={`${p.date}: ${p.count}`}
          className="w-1.5 rounded-sm bg-violet-400/70 dark:bg-violet-500/60"
          style={{ height: `${Math.round((p.count / max) * 100)}%`, minHeight: p.count > 0 ? 2 : 1 }}
        />
      ))}
    </div>
  );
}

export function LeadDistributionScoreboard({ rows }: { rows: LeadDistributionRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-xs text-zinc-400">Nenhum lead distribuído ainda</p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[28px_1fr_auto_56px_56px] items-center gap-3 px-3 text-[10px] font-medium uppercase tracking-wider text-zinc-400">
        <div>#</div>
        <div>Atendente</div>
        <div className="text-center">14 dias</div>
        <div className="text-right">Hoje</div>
        <div className="text-right">Mês</div>
      </div>
      {rows.map((r, i) => (
        <div
          key={r.agent.id}
          className="grid grid-cols-[28px_1fr_auto_56px_56px] items-center gap-3 rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-800/60"
        >
          <div className="text-center text-sm">
            {MEDALS[i] ?? <span className="text-xs font-semibold text-zinc-400">{i + 1}</span>}
          </div>

          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-200 text-[10px] font-semibold text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200">
              {r.agent.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.agent.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                r.agent.name.slice(0, 2).toUpperCase()
              )}
            </div>
            <p className="truncate text-xs font-medium text-zinc-800 dark:text-zinc-200">{r.agent.name}</p>
          </div>

          <Sparkline points={r.spark} />

          <div className="text-right">
            <p className="text-base font-bold tabular-nums text-violet-600 dark:text-violet-400">{r.today}</p>
          </div>
          <div className="text-right">
            <p className="text-base font-semibold tabular-nums text-zinc-700 dark:text-zinc-200">{r.month}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
