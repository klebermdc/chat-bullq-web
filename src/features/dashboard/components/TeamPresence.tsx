'use client';

import { Badge, type BadgeProps } from '@/components/ui/badge';
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
import { formatNumber } from '@/features/dashboard/lib/format';
import { tableScrollCls, tbodyCls, thCls, theadCls, trCls } from '@/features/crm-reports/components/table-parts';
import { User } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { getInitials } from '@/lib/initials';
import { cn } from '@/lib/utils';

// Desktop: tabela em grid, no mesmo desenho das outras tabelas do app
// (cabeçalho em faixa clara, linhas separadas por fio). Mobile: cada linha
// vira um bloco de 2 colunas, com o rótulo de cada célula visível só ali (o
// cabeçalho some).
// O nome fica com a sobra de largura; "Horário" cresce só até o que precisa e
// os números encostam na direita, sem um vão no meio da tabela.
const NOW_GRID =
  'md:grid-cols-[minmax(140px,1fr)_100px_minmax(170px,240px)_100px_130px_120px_96px]';
const PERIOD_GRID = 'md:grid-cols-[minmax(140px,1fr)_110px_110px_72px_120px]';

// Estar fora do horário não é alerta: só "no horário" ganha cor.
const SCHEDULE_VARIANT: Record<ScheduleTone, BadgeProps['variant']> = {
  success: 'success',
  warning: 'neutral',
  muted: 'neutral',
};

const NUM = 'whitespace-nowrap font-mono text-sm tabular-nums text-foreground';

function Cell({
  label, children, className = '',
}: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div role="cell" className={`min-w-0 ${className}`}>
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground md:hidden">{label}</p>
      {children}
    </div>
  );
}

function Name({ row }: { row: TeamPresenceRow }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground">
        {getInitials(row.name) || <User aria-hidden="true" className="h-3.5 w-3.5" />}
      </div>
      <p className="truncate text-sm font-medium text-foreground">{row.name}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: TeamPresenceRow['status'] }) {
  const meta = statusMeta(status);
  return (
    <Badge variant={meta.tone}>
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </Badge>
  );
}

function Header({ grid, cols }: { grid: string; cols: Array<{ label: string; align?: 'right' }> }) {
  return (
    <div role="rowgroup" className={`hidden md:block ${theadCls}`}>
      <div role="row" className={`grid ${grid} items-center gap-3 px-4`}>
        {cols.map((c) => (
          <div
            key={c.label}
            role="columnheader"
            // O respiro horizontal é o da linha (grid com `gap`), não o da célula.
            className={cn(thCls, 'px-0', c.align === 'right' && 'text-right')}
          >
            {c.label}
          </div>
        ))}
      </div>
    </div>
  );
}

const ROW_CLASS = `grid grid-cols-2 items-center gap-x-3 gap-y-2 px-4 py-2.5 ${trCls}`;
// Entre `md` e `lg` a grade pode não caber no cartão: rola em vez de espremer.
const NOW_MIN_WIDTH = 'md:min-w-[960px]';
const PERIOD_MIN_WIDTH = 'md:min-w-[640px]';

export function TeamPresenceNow({ rows }: { rows: TeamPresenceRow[] }) {
  if (rows.length === 0) {
    return <EmptyState size="sm" title="Nenhum atendente na equipe ainda" />;
  }
  const now = new Date();

  return (
    <div className={tableScrollCls}>
      <div role="table" aria-label="Equipe agora" className={NOW_MIN_WIDTH}>
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
        <div role="rowgroup" className={tbodyCls}>
          {rows.map((r) => {
            const schedule = scheduleLabel(r.schedule);
            return (
              <div key={r.userId} role="row" className={`${ROW_CLASS} ${NOW_GRID}`}>
                <div role="cell" className="col-span-2 flex min-w-0 items-center justify-between gap-2 md:col-span-1">
                  <Name row={r} />
                  <span className="shrink-0 md:hidden"><StatusBadge status={r.status} /></span>
                </div>

                <div role="cell" className="hidden md:block"><StatusBadge status={r.status} /></div>

                <Cell label="Horário" className="col-span-2 md:col-span-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant={SCHEDULE_VARIANT[schedule.tone]}>{schedule.label}</Badge>
                    {r.schedule.onCall && <Badge variant="info">Aline de plantão</Badge>}
                  </div>
                </Cell>

                <Cell label="Esperando" className="md:text-right">
                  {r.waitingCount > 0 ? (
                    <Badge variant="hot" className="font-mono tabular-nums">{formatNumber(r.waitingCount)}</Badge>
                  ) : (
                    <span className={cn(NUM, 'text-muted-foreground')}>0</span>
                  )}
                </Cell>

                <Cell label="Última resposta" className="md:text-right">
                  <span className={NUM}>{formatLastReply(r.lastHumanReplyAt, now)}</span>
                </Cell>

                <Cell label="Online hoje" className="md:text-right">
                  <p className={NUM}>{formatMinutes(r.today.onlineMinutes)}</p>
                  <p className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">
                    ativo {formatMinutes(r.today.activeMinutes)}
                  </p>
                </Cell>

                <Cell label="1º acesso" className="md:text-right">
                  <span className={NUM}>{formatClock(r.today.firstSeenAt)}</span>
                </Cell>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function TeamPresencePeriod({ rows }: { rows: TeamPresenceRow[] }) {
  if (rows.length === 0) {
    return <EmptyState size="sm" title="Sem dados de presença no período" />;
  }
  const sorted = [...rows].sort(
    (a, b) => b.period.onlineMinutes - a.period.onlineMinutes || a.name.localeCompare(b.name),
  );

  return (
    <div className={tableScrollCls}>
      <div role="table" aria-label="Tempo online da equipe" className={PERIOD_MIN_WIDTH}>
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
        <div role="rowgroup" className={tbodyCls}>
          {sorted.map((r) => {
            const avg = avgOnlinePerDay(r.period);
            return (
              <div key={r.userId} role="row" className={`${ROW_CLASS} ${PERIOD_GRID}`}>
                <div role="cell" className="col-span-2 min-w-0 md:col-span-1"><Name row={r} /></div>
                <Cell label="Online" className="md:text-right">
                  <span className={NUM}>{formatMinutes(r.period.onlineMinutes)}</span>
                </Cell>
                <Cell label="Ativo" className="md:text-right">
                  <span className={NUM}>{formatMinutes(r.period.activeMinutes)}</span>
                </Cell>
                <Cell label="Dias online" className="md:text-right">
                  <span className={NUM}>{formatNumber(r.period.daysOnline)}</span>
                </Cell>
                <Cell label="Média/dia" className="md:text-right">
                  <span className={NUM}>{avg === null ? '—' : formatMinutes(avg)}</span>
                </Cell>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function TeamPresenceError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="py-6 text-center">
      <p className="text-xs text-urgent-ink">Não foi possível carregar a presença da equipe.</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-2 inline-flex min-h-8 items-center rounded-md px-2 text-xs font-medium text-foreground underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Tentar novamente
      </button>
    </div>
  );
}
