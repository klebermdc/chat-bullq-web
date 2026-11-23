'use client';

import { Badge, type BadgeProps } from '@/components/ui/badge';
import type { TeamPresenceRow } from '@/features/dashboard/services/dashboard.service';
import {
  avgOnlinePerDay,
  flattenPresenceDays,
  formatClock,
  formatDayLabel,
  formatIdleTotal,
  idleNowLabel,
  formatLastReply,
  formatMinutes,
  presenceExit,
  scheduleLabel,
  statusMeta,
  type ScheduleTone,
} from '@/features/dashboard/lib/team-presence';
import { formatNumber } from '@/features/dashboard/lib/format';
import { tableScrollCls, tbodyCls, thCls, theadCls, trCls } from '@/features/crm-reports/components/table-parts';
import { useState } from 'react';
import { ChevronDown, User } from 'lucide-react';
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
  'md:grid-cols-[minmax(140px,1fr)_100px_minmax(170px,240px)_100px_130px_120px_96px_96px]';
const PERIOD_GRID = 'md:grid-cols-[minmax(140px,1fr)_110px_110px_130px_72px_120px]';
const DAILY_GRID = 'md:grid-cols-[minmax(140px,1fr)_96px_80px_80px_110px_110px_130px]';

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

function Name({ row }: { row: Pick<TeamPresenceRow, 'name'> }) {
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
const NOW_MIN_WIDTH = 'md:min-w-[1060px]';
const PERIOD_MIN_WIDTH = 'md:min-w-[770px]';
const DAILY_MIN_WIDTH = 'md:min-w-[830px]';

/** Status + "Sem usar há X" quando há pausa de 15 min+ no expediente. */
function StatusCell({ row }: { row: TeamPresenceRow }) {
  const idle = idleNowLabel(row.idle);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <StatusBadge status={row.status} />
      {idle && <Badge variant="hot">{idle}</Badge>}
    </div>
  );
}

/** Total inativo com as pausas embaixo (dia ou período). */
function IdleTotal({ totals }: { totals: Parameters<typeof formatIdleTotal>[0] }) {
  const { label, detail } = formatIdleTotal(totals);
  return (
    <>
      <p className={cn(NUM, label === '—' ? 'text-muted-foreground' : 'text-warning-ink')}>{label}</p>
      {detail && <p className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">{detail}</p>}
    </>
  );
}

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
            { label: 'Último uso', align: 'right' },
          ]}
        />
        <div role="rowgroup" className={tbodyCls}>
          {rows.map((r) => {
            const schedule = scheduleLabel(r.schedule);
            return (
              <div key={r.userId} role="row" className={`${ROW_CLASS} ${NOW_GRID}`}>
                <div role="cell" className="col-span-2 flex min-w-0 items-center justify-between gap-2 md:col-span-1">
                  <Name row={r} />
                  <span className="shrink-0 md:hidden"><StatusCell row={r} /></span>
                </div>

                <div role="cell" className="hidden md:block"><StatusCell row={r} /></div>

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
                  {(r.today.idleMinutes ?? 0) > 0 && (
                    <p className="whitespace-nowrap text-xs tabular-nums text-warning-ink">
                      inativo {formatMinutes(r.today.idleMinutes ?? 0)}
                    </p>
                  )}
                </Cell>

                <Cell label="1º acesso" className="md:text-right">
                  <span className={NUM}>{formatClock(r.today.firstSeenAt)}</span>
                </Cell>

                <Cell label="Último uso" className="md:text-right">
                  <span className={NUM}>{formatClock(r.today.lastActiveAt)}</span>
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
  return (
    <>
      <TeamPresenceSummary rows={rows} />
      <TeamPresenceDaily rows={rows} />
    </>
  );
}

function TeamPresenceSummary({ rows }: { rows: TeamPresenceRow[] }) {
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
            { label: 'Inativo', align: 'right' },
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
                <Cell label="Inativo" className="md:text-right">
                  <IdleTotal totals={{ idleMinutes: r.period.idleMinutes }} />
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

const ESTIMATED_EXIT_HINT =
  'Antes de 19/11/2026 não havia registro do último uso: aqui a saída é o último minuto com o Chat aberto.';

/** Ponto dia a dia: entrada (abriu o Chat) e saída (último uso real). */
function TeamPresenceDaily({ rows }: { rows: TeamPresenceRow[] }) {
  const days = flattenPresenceDays(rows);
  const [isOpen, setIsOpen] = useState(false);
  if (days.length === 0) return null;
  const hasEstimated = days.some((d) => presenceExit(d).isEstimated);

  // Fechado por padrão: o resumo do período fica sozinho na tela.
  return (
    <section className="border-t border-border">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-controls="ponto-dia-a-dia"
        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-foreground hover:bg-muted/50"
      >
        <ChevronDown
          className={cn('size-4 shrink-0 text-muted-foreground transition-transform', isOpen && 'rotate-180')}
          aria-hidden
        />
        {isOpen ? 'Esconder ponto dia a dia' : 'Ver ponto dia a dia'}
      </button>
      {isOpen && (
        <div id="ponto-dia-a-dia">
          <p className="px-4 pb-2 text-xs text-muted-foreground">
            Entrada = abriu o sistema. Saída = último uso. Inativo = pausas de 15 min+ no horário de trabalho.
          </p>
          <div className={tableScrollCls}>
            <div role="table" aria-label="Ponto dia a dia" className={DAILY_MIN_WIDTH}>
              <Header
                grid={DAILY_GRID}
                cols={[
                  { label: 'Atendente' },
                  { label: 'Dia' },
                  { label: 'Entrada', align: 'right' },
                  { label: 'Saída', align: 'right' },
                  { label: 'Online', align: 'right' },
                  { label: 'Ativo', align: 'right' },
                  { label: 'Inativo', align: 'right' },
                ]}
              />
              <div role="rowgroup" className={tbodyCls}>
                {days.map((d) => {
                  const exit = presenceExit(d);
                  return (
                    <div key={`${d.userId}-${d.day}`} role="row" className={`${ROW_CLASS} ${DAILY_GRID}`}>
                      <div role="cell" className="col-span-2 min-w-0 md:col-span-1"><Name row={d} /></div>
                      <Cell label="Dia">
                        <span className={NUM}>{formatDayLabel(d.day)}</span>
                      </Cell>
                      <Cell label="Entrada" className="md:text-right">
                        <span className={NUM}>{formatClock(d.firstSeenAt)}</span>
                      </Cell>
                      <Cell label="Saída" className="md:text-right">
                        <span
                          className={cn(NUM, exit.isEstimated && 'text-muted-foreground')}
                          title={exit.isEstimated ? ESTIMATED_EXIT_HINT : undefined}
                        >
                          {exit.isEstimated ? '~' : ''}{formatClock(exit.iso)}
                        </span>
                      </Cell>
                      <Cell label="Online" className="md:text-right">
                        <span className={NUM}>{formatMinutes(d.onlineMinutes)}</span>
                      </Cell>
                      <Cell label="Ativo" className="md:text-right">
                        <span className={NUM}>{formatMinutes(d.activeMinutes)}</span>
                      </Cell>
                      <Cell label="Inativo" className="md:text-right">
                        <IdleTotal totals={d} />
                      </Cell>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          {hasEstimated && (
            <p className="px-4 py-2 text-[11px] text-muted-foreground">~ {ESTIMATED_EXIT_HINT}</p>
          )}
        </div>
      )}
    </section>
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
