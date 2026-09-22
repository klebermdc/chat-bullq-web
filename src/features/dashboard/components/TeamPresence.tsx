'use client';

import { Badge } from '@/components/ui/badge';
import type { TeamPresenceRow } from '@/features/dashboard/services/dashboard.service';
import {
  avgOnlinePerDay,
  formatClock,
  formatLastReply,
  formatMinutes,
  scheduleLabel,
  statusMeta,
  type ScheduleTone,
} from '@/features/dashboard/lib/team-presence';

// Desktop: tabela em grid. Mobile: cada linha vira um cartão 2 colunas, com o
// rótulo de cada célula visível só no mobile (o cabeçalho some).
const NOW_GRID =
  'md:grid-cols-[minmax(0,1.5fr)_88px_minmax(0,1.6fr)_72px_96px_104px_72px]';
const PERIOD_GRID = 'md:grid-cols-[minmax(0,1.5fr)_96px_96px_56px_96px]';

const SCHEDULE_TONE: Record<ScheduleTone, string> = {
  success: 'text-emerald-700 dark:text-emerald-400',
  warning: 'text-amber-700 dark:text-amber-400',
  muted: 'text-zinc-400',
};

function Cell({
  label, children, className = '',
}: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`min-w-0 ${className}`}>
      <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400 md:hidden">{label}</p>
      {children}
    </div>
  );
}

function Name({ row }: { row: TeamPresenceRow }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-[10px] font-semibold text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200">
        {row.name.slice(0, 2).toUpperCase()}
      </div>
      <p className="truncate text-xs font-medium text-zinc-800 dark:text-zinc-200">{row.name}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: TeamPresenceRow['status'] }) {
  const meta = statusMeta(status);
  return (
    <Badge variant={meta.tone}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </Badge>
  );
}

function Header({ grid, cols }: { grid: string; cols: Array<{ label: string; align?: 'right' }> }) {
  return (
    <div className={`hidden ${grid} items-center gap-3 px-3 text-[10px] font-medium uppercase tracking-wider text-zinc-400 md:grid`}>
      {cols.map((c) => (
        <div key={c.label} className={c.align === 'right' ? 'text-right' : undefined}>{c.label}</div>
      ))}
    </div>
  );
}

const ROW_CLASS = 'grid grid-cols-2 items-center gap-x-3 gap-y-2 rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-800/60';

export function TeamPresenceNow({ rows }: { rows: TeamPresenceRow[] }) {
  if (rows.length === 0) {
    return <p className="py-8 text-center text-xs text-zinc-400">Nenhum atendente na equipe ainda</p>;
  }
  const now = new Date();

  return (
    <div className="space-y-2">
      <Header
        grid={NOW_GRID}
        cols={[
          { label: 'Atendente' },
          { label: 'Status' },
          { label: 'Horário' },
          { label: 'Esperando', align: 'right' },
          { label: 'Última resposta', align: 'right' },
          { label: 'Online hoje', align: 'right' },
          { label: '1º acesso', align: 'right' },
        ]}
      />
      {rows.map((r) => {
        const schedule = scheduleLabel(r.schedule);
        return (
          <div key={r.userId} className={`${ROW_CLASS} ${NOW_GRID}`}>
            <div className="col-span-2 flex items-center justify-between gap-2 md:col-span-1">
              <Name row={r} />
              <span className="md:hidden"><StatusBadge status={r.status} /></span>
            </div>

            <div className="hidden md:block"><StatusBadge status={r.status} /></div>

            <Cell label="Horário" className="col-span-2 md:col-span-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className={`text-xs ${SCHEDULE_TONE[schedule.tone]}`}>{schedule.label}</span>
                {r.schedule.onCall && <Badge variant="info">Aline de plantão</Badge>}
              </div>
            </Cell>

            <Cell label="Esperando" className="md:text-right">
              {r.waitingCount > 0 ? (
                <span className="inline-flex rounded bg-amber-100 px-1.5 py-0.5 text-xs font-bold tabular-nums text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                  {r.waitingCount}
                </span>
              ) : (
                <span className="text-xs tabular-nums text-zinc-400">0</span>
              )}
            </Cell>

            <Cell label="Última resposta" className="md:text-right">
              <span className="text-xs text-zinc-700 dark:text-zinc-200">{formatLastReply(r.lastHumanReplyAt, now)}</span>
            </Cell>

            <Cell label="Online hoje" className="md:text-right">
              <p className="text-xs font-semibold tabular-nums text-zinc-700 dark:text-zinc-200">
                {formatMinutes(r.today.onlineMinutes)}
              </p>
              <p className="text-[10px] text-zinc-400">ativo {formatMinutes(r.today.activeMinutes)}</p>
            </Cell>

            <Cell label="1º acesso" className="md:text-right">
              <span className="text-xs tabular-nums text-zinc-700 dark:text-zinc-200">{formatClock(r.today.firstSeenAt)}</span>
            </Cell>
          </div>
        );
      })}
    </div>
  );
}

export function TeamPresencePeriod({ rows }: { rows: TeamPresenceRow[] }) {
  if (rows.length === 0) {
    return <p className="py-8 text-center text-xs text-zinc-400">Sem dados de presença no período</p>;
  }
  const sorted = [...rows].sort(
    (a, b) => b.period.onlineMinutes - a.period.onlineMinutes || a.name.localeCompare(b.name),
  );

  return (
    <div className="space-y-2">
      <Header
        grid={PERIOD_GRID}
        cols={[
          { label: 'Atendente' },
          { label: 'Online', align: 'right' },
          { label: 'Ativo', align: 'right' },
          { label: 'Dias', align: 'right' },
          { label: 'Média/dia', align: 'right' },
        ]}
      />
      {sorted.map((r) => {
        const avg = avgOnlinePerDay(r.period);
        return (
          <div key={r.userId} className={`${ROW_CLASS} ${PERIOD_GRID}`}>
            <div className="col-span-2 md:col-span-1"><Name row={r} /></div>
            <Cell label="Online" className="md:text-right">
              <span className="text-xs font-semibold tabular-nums text-zinc-700 dark:text-zinc-200">
                {formatMinutes(r.period.onlineMinutes)}
              </span>
            </Cell>
            <Cell label="Ativo" className="md:text-right">
              <span className="text-xs tabular-nums text-zinc-700 dark:text-zinc-200">{formatMinutes(r.period.activeMinutes)}</span>
            </Cell>
            <Cell label="Dias online" className="md:text-right">
              <span className="text-xs tabular-nums text-zinc-700 dark:text-zinc-200">{r.period.daysOnline}</span>
            </Cell>
            <Cell label="Média/dia" className="md:text-right">
              <span className="text-xs tabular-nums text-zinc-700 dark:text-zinc-200">
                {avg === null ? '—' : formatMinutes(avg)}
              </span>
            </Cell>
          </div>
        );
      })}
    </div>
  );
}

export function TeamPresenceError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="py-6 text-center">
      <p className="text-xs text-red-600 dark:text-red-400">Não foi possível carregar a presença da equipe.</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-2 text-xs font-medium text-zinc-600 underline-offset-2 hover:underline dark:text-zinc-300"
      >
        Tentar novamente
      </button>
    </div>
  );
}
