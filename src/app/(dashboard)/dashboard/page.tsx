'use client';

import { useSyncExternalStore } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  AreaChart, Area,
} from 'recharts';
import {
  Activity, Clock, Target, CheckCircle2, TrendingUp, TrendingDown, Minus,
  Star, RotateCcw, ShieldCheck,
} from 'lucide-react';
import { dashboardService, type SparklinePoint, type TeamPresenceRow } from '@/features/dashboard/services/dashboard.service';
import { useOrgId } from '@/hooks/use-org-query-key';
import { Heatmap } from '@/features/dashboard/components/Heatmap';
import { localUtcOffsetHours, shiftHeatmapHours } from '@/features/dashboard/lib/heatmap';
import { CHART_GRID, CHART_MUTED, CHART_SEQ, CHART_SERIES, chartAxisTick, chartTooltipStyle, formatChartDay } from '@/lib/chart-theme';
import { AgentList } from '@/features/dashboard/components/AgentList';
import { LeadDistributionScoreboard } from '@/features/dashboard/components/LeadDistributionScoreboard';
import { TeamPresenceNow, TeamPresencePeriod, TeamPresenceError } from '@/features/dashboard/components/TeamPresence';
import { InactivityWidget } from '@/features/scheduling/components/inactivity-widget';
import { formatNumber, formatPercent } from '@/features/dashboard/lib/format';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader, PageShell } from '@/components/layout/page-shell';
import { cn } from '@/lib/utils';

// Equipe agora: status ao vivo precisa de refresh curto (o resto do dashboard
// é histórico e só carrega uma vez).
const TEAM_PRESENCE_REFRESH_MS = 30_000;

// Abaixo de `sm` os cartões de número ficam em duas colunas estreitas: o
// minigráfico não cabe e nem chega a ser montado.
const SM_UP_QUERY = '(min-width: 640px)';

function subscribeSmUp(onChange: () => void) {
  const mql = window.matchMedia(SM_UP_QUERY);
  mql.addEventListener('change', onChange);
  return () => mql.removeEventListener('change', onChange);
}

function useIsSmUp(): boolean {
  return useSyncExternalStore(
    subscribeSmUp,
    () => window.matchMedia(SM_UP_QUERY).matches,
    () => false,
  );
}

type TrendDirection = 'higher-is-better' | 'lower-is-better';

function TrendBadge({ value, direction }: { value: number; direction: TrendDirection }) {
  if (value === 0) {
    return (
      <span
        role="img"
        aria-label="sem variação"
        className="flex items-center gap-0.5 whitespace-nowrap text-xs font-medium text-muted-foreground"
      >
        <Minus aria-hidden="true" className="h-3.5 w-3.5" /> 0%
      </span>
    );
  }
  const isPositive = direction === 'higher-is-better' ? value > 0 : value < 0;
  const Icon = value > 0 ? TrendingUp : TrendingDown;
  const magnitude = formatNumber(Math.abs(value));
  return (
    <span
      role="img"
      aria-label={`${value > 0 ? 'subiu' : 'caiu'} ${magnitude}%`}
      className={`flex items-center gap-0.5 whitespace-nowrap text-xs font-medium ${isPositive ? 'text-success-ink' : 'text-urgent-ink'}`}
    >
      <Icon aria-hidden="true" className="h-3.5 w-3.5" />
      {magnitude}%
    </span>
  );
}

function KpiSparkline({
  id, points, suffix,
}: { id: string; points: SparklinePoint[]; suffix?: string }) {
  const accent = CHART_SEQ;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={points} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity={0.35} />
            <stop offset="100%" stopColor={accent} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Tooltip
          cursor={{ stroke: accent, strokeWidth: 1, strokeDasharray: '3 3' }}
          contentStyle={chartTooltipStyle}
          labelFormatter={formatChartDay}
          formatter={(v) => [`${typeof v === 'number' ? formatNumber(v) : v}${suffix ?? ''}`, '']}
          separator=""
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={accent}
          strokeWidth={1.75}
          fill={`url(#${id})`}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function HeroKpi({
  label, value, suffix, trend, trendDirection, icon: Icon, sparkline, sparklineSuffix, footer, className = '', isWide = false,
}: {
  label: string;
  /** Já formatado em pt-BR (`formatNumber`). */
  value: string;
  suffix?: string;
  trend?: number;
  trendDirection?: TrendDirection;
  icon: React.ElementType;
  sparkline?: SparklinePoint[];
  sparklineSuffix?: string;
  footer?: React.ReactNode;
  className?: string;
  /**
   * Cartão de duas colunas: o minigráfico vai ao lado do número (não embaixo),
   * preenchendo a largura sem deixar o cartão mais alto que os vizinhos.
   */
  isWide?: boolean;
}) {
  const isSmUp = useIsSmUp();
  const gradientId = `grad-${label.replace(/[^a-zA-Z0-9]+/g, '-')}`;
  const points = sparkline ?? [];
  const hasSparkline = points.length > 0;

  const number = (
    <div className="flex flex-wrap items-end gap-x-2 gap-y-0.5">
      <span className="text-2xl font-bold tabular-nums tracking-tight text-foreground sm:text-3xl">
        {value}
        {suffix && <span className="ml-0.5 text-base font-semibold text-muted-foreground sm:text-lg">{suffix}</span>}
      </span>
      {trend !== undefined && trendDirection && (
        <span className="pb-1"><TrendBadge value={trend} direction={trendDirection} /></span>
      )}
    </div>
  );
  const footerCls = 'text-[11px] leading-snug text-muted-foreground';

  return (
    <div className={`flex h-full min-w-0 flex-col rounded-xl border border-border bg-card p-3 shadow-soft sm:p-5 ${className}`}>
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0 text-xs font-medium uppercase leading-tight tracking-wider text-muted-foreground">{label}</span>
        <div className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground sm:flex">
          <Icon aria-hidden="true" className="h-4 w-4" />
        </div>
      </div>

      {isWide ? (
        <div className="mt-2 flex flex-1 items-end gap-4 sm:mt-3">
          <div className="min-w-0 max-w-[60%] shrink-0">
            {number}
            {footer && <div className={`pt-2 ${footerCls}`}>{footer}</div>}
          </div>
          {hasSparkline && (
            <div className="h-14 min-w-0 flex-1">
              <KpiSparkline id={gradientId} points={points} suffix={sparklineSuffix} />
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="mt-2 sm:mt-3">{number}</div>
          {isSmUp && hasSparkline && (
            <div className="-mx-1 mt-3 h-12">
              <KpiSparkline id={gradientId} points={points} suffix={sparklineSuffix} />
            </div>
          )}
          {footer && <div className={`mt-auto pt-2 ${footerCls}`}>{footer}</div>}
        </>
      )}
    </div>
  );
}

function HeroSkeleton({ className = '' }: { className?: string }) {
  return <div className={`h-28 animate-pulse rounded-xl border border-border bg-muted sm:h-44 ${className}`} />;
}

function PanelSkeleton({ className = 'h-32' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-muted ${className}`} />;
}

const CARD_PADDING = 'p-4 sm:p-5';

/**
 * Cartão de seção do Painel: título só em texto (sem ícone), subtítulo e
 * conteúdo. `flush` é para tabela: o conteúdo vai de borda a borda do
 * cartão, que corta os cantos; quem rola na horizontal é a própria tabela.
 */
function ChartCard({
  title, children, height = 'h-64', subtitle, flush = false,
}: {
  title: string;
  children: React.ReactNode;
  height?: string;
  subtitle?: string;
  flush?: boolean;
}) {
  return (
    <div
      className={cn(
        'min-w-0 rounded-xl border border-border bg-card shadow-soft',
        flush ? 'overflow-hidden' : CARD_PADDING,
      )}
    >
      <div className={flush ? CARD_PADDING : undefined}>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      <div className={flush ? 'border-t border-border' : `mt-4 ${height}`}>{children}</div>
    </div>
  );
}

/** Respiro para o que não é tabela dentro de um cartão `flush` (esqueleto, erro). */
function FlushPad({ children }: { children: React.ReactNode }) {
  return <div className={CARD_PADDING}>{children}</div>;
}

const tooltipStyle = chartTooltipStyle;

// Eixos e dicas dos gráficos no mesmo formato pt-BR dos cartões.
const formatAxisNumber = (value: number) => formatNumber(value);
const formatTooltipNumber = (value: unknown) =>
  typeof value === 'number' ? formatNumber(value) : String(value ?? '');

export default function DashboardPage() {
  const orgId = useOrgId();
  const { data: overview, isLoading: loadingOverview } = useQuery({
    queryKey: ['dashboard-overview', orgId],
    queryFn: () => dashboardService.getOverview(),
  });
  const { data: sparklines } = useQuery({
    queryKey: ['dashboard-sparklines', orgId],
    queryFn: () => dashboardService.getKpiSparklines(),
  });
  const { data: volumeFlow } = useQuery({
    queryKey: ['dashboard-volume-flow', orgId],
    queryFn: () => dashboardService.getVolumeFlow(),
  });
  const { data: messagesFlow } = useQuery({
    queryKey: ['dashboard-messages-flow', orgId],
    queryFn: () => dashboardService.getMessagesFlow(),
  });
  const { data: peakHours } = useQuery({
    queryKey: ['dashboard-peak-hours', orgId],
    queryFn: () => dashboardService.getPeakHours(),
  });
  const { data: volumeByChannel } = useQuery({
    queryKey: ['dashboard-volume-channel', orgId],
    queryFn: () => dashboardService.getVolumeByChannel(),
  });
  const { data: botPerf } = useQuery({
    queryKey: ['dashboard-bot-performance', orgId],
    queryFn: () => dashboardService.getBotPerformance(),
  });
  const { data: topTags } = useQuery({
    queryKey: ['dashboard-top-tags', orgId],
    queryFn: () => dashboardService.getTopTags(),
  });
  const { data: agents } = useQuery({
    queryKey: ['dashboard-agents', orgId],
    queryFn: () => dashboardService.getAgentPerformance(),
  });
  const { data: scoreboard } = useQuery({
    queryKey: ['dashboard-lead-scoreboard', orgId],
    queryFn: () => dashboardService.getLeadDistributionScoreboard(),
  });
  // Sem filtro de período na página: o backend usa os últimos 7 dias.
  const teamPresence = useQuery({
    queryKey: ['dashboard-team-presence', orgId],
    queryFn: () => dashboardService.getTeamPresence(),
    refetchInterval: TEAM_PRESENCE_REFRESH_MS,
    refetchOnWindowFocus: true,
  });
  const { data: csat } = useQuery({
    queryKey: ['dashboard-csat', orgId],
    queryFn: () => dashboardService.getCsat(),
  });
  const { data: reopens } = useQuery({
    queryKey: ['dashboard-reopens', orgId],
    queryFn: () => dashboardService.getReopens(),
  });

  return (
    <PageShell>
      <PageHeader title="Painel" description="Últimos 30 dias" />

      {/* KPIs — uma grade só de 4 colunas (2 no mobile). São sete cartões: o
          último ("Taxa de reabertura") ocupa duas colunas, com o minigráfico
          ao lado do número para preencher a largura. As duas linhas fecham em
          4 + 4 e todas as bordas se alinham; no mobile são 3 × 2 e o último
          na linha inteira. */}
      <div className="mt-6 grid grid-cols-2 items-stretch gap-3 sm:gap-4 lg:grid-cols-4">
        {loadingOverview || !overview ? (
          <>
            <HeroSkeleton /><HeroSkeleton /><HeroSkeleton /><HeroSkeleton />
            <HeroSkeleton /><HeroSkeleton />
            <HeroSkeleton className="col-span-2" />
          </>
        ) : (
          <>
            <HeroKpi
              label="Conversas ativas"
              value={formatNumber(overview.activeConversations)}
              icon={Activity}
              sparkline={sparklines?.active}
              footer={
                <span>
                  {formatNumber(overview.activeBreakdown.pending)} fila · {formatNumber(overview.activeBreakdown.open)} aberta · {formatNumber(overview.activeBreakdown.waiting)} aguardando
                  {overview.stuckConversations > 0 ? (
                    <>
                      {' · '}
                      <a
                        href="/inbox?stuck=true"
                        className="font-medium text-warning-ink hover:underline"
                      >
                        {formatNumber(overview.stuckConversations)} presa{overview.stuckConversations === 1 ? '' : 's'}
                      </a>
                    </>
                  ) : null}
                </span>
              }
            />
            <HeroKpi
              label="Tempo 1ª resposta"
              value={formatNumber(overview.avgFirstResponseMinutes)}
              suffix={overview.avgFirstResponseMinutes !== null ? 'min' : undefined}
              trend={overview.avgFirstResponseTrend}
              trendDirection="lower-is-better"
              icon={Clock}
              sparkline={sparklines?.firstResponse}
              sparklineSuffix="min"
              footer={<span>Média do período · menor é melhor</span>}
            />
            <HeroKpi
              label="Dentro do SLA"
              value={formatNumber(overview.slaCompliancePercent)}
              suffix={overview.slaCompliancePercent !== null ? '%' : undefined}
              trend={overview.slaTrend}
              trendDirection="higher-is-better"
              icon={Target}
              sparkline={sparklines?.sla}
              sparklineSuffix="%"
              footer={
                overview.slaCompliancePercent === null
                  ? <span className="text-warning-ink">SLA do departamento não configurado</span>
                  : <span>% das conversas dentro do SLA</span>
              }
            />
            <HeroKpi
              label="Taxa de resolução"
              value={formatNumber(overview.resolutionRatePercent)}
              suffix={overview.resolutionRatePercent !== null ? '%' : undefined}
              trend={overview.resolutionTrend}
              trendDirection="higher-is-better"
              icon={CheckCircle2}
              sparkline={sparklines?.resolution}
              sparklineSuffix="%"
              footer={<span>Fechadas / abertas no período</span>}
            />
            <HeroKpi
              label="Satisfação (CSAT)"
              value={formatNumber(overview.csatScore)}
              suffix={overview.csatScore !== null ? '/5' : undefined}
              trend={overview.csatScore !== null ? Math.round(overview.csatTrend * 10) : 0}
              trendDirection="higher-is-better"
              icon={Star}
              footer={
                overview.csatResponses === 0
                  ? <span>Aguardando as primeiras avaliações</span>
                  : <span>{formatNumber(overview.csatResponses)} resposta{overview.csatResponses === 1 ? '' : 's'} no período</span>
              }
            />
            <HeroKpi
              label="Resolvidas de primeira"
              value={formatNumber(overview.fcrPercent)}
              suffix={overview.fcrPercent !== null ? '%' : undefined}
              icon={ShieldCheck}
              footer={<span>% das fechadas que não foram reabertas</span>}
            />
            <HeroKpi
              className="col-span-2"
              isWide
              sparkline={reopens?.series}
              label="Taxa de reabertura"
              value={formatNumber(reopens?.reopenRate)}
              suffix={reopens?.reopenRate !== null && reopens?.reopenRate !== undefined ? '%' : undefined}
              icon={RotateCcw}
              footer={
                reopens
                  ? <span>{formatNumber(reopens.uniqueConversationsReopened)} conversa{reopens.uniqueConversationsReopened === 1 ? '' : 's'} reaberta{reopens.uniqueConversationsReopened === 1 ? '' : 's'} · {formatNumber(reopens.totalReopens)} total</span>
                  : <span>Carregando…</span>
              }
            />
          </>
        )}
      </div>

      {/* ROW 1 — fluxo + heatmap (o mapa tem a mesma altura do gráfico) */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <ChartCard title="Volume × resolução" subtitle="Conversas criadas vs fechadas por dia">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={volumeFlow || []}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
              <XAxis dataKey="date" tick={chartAxisTick} tickFormatter={formatChartDay} />
              <YAxis tick={chartAxisTick} tickFormatter={formatAxisNumber} />
              <Tooltip contentStyle={tooltipStyle} labelFormatter={formatChartDay} formatter={formatTooltipNumber} />
              <Legend wrapperStyle={{ fontSize: 11 }} iconSize={8} />
              <Line type="monotone" dataKey="created" name="Criadas" stroke={CHART_SERIES[0]} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="closed" name="Fechadas" stroke={CHART_SERIES[2]} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Picos de horário"
          subtitle="Dia da semana × hora, no seu horário"
          height=""
        >
          {peakHours ? (
            <Heatmap matrix={shiftHeatmapHours(peakHours.matrix, localUtcOffsetHours())} max={peakHours.max} />
          ) : (
            <PanelSkeleton className="h-48 lg:h-64" />
          )}
        </ChartCard>
      </div>

      {/* ROW 2 — mensagens + canal */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <ChartCard title="Mensagens" subtitle="Recebidas vs enviadas">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={messagesFlow || []}>
              <defs>
                <linearGradient id="grad-in" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_SERIES[0]} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={CHART_SERIES[0]} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="grad-out" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_SERIES[1]} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={CHART_SERIES[1]} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
              <XAxis dataKey="date" tick={chartAxisTick} tickFormatter={formatChartDay} />
              <YAxis tick={chartAxisTick} tickFormatter={formatAxisNumber} />
              <Tooltip contentStyle={tooltipStyle} labelFormatter={formatChartDay} formatter={formatTooltipNumber} />
              <Legend wrapperStyle={{ fontSize: 11 }} iconSize={8} />
              <Area type="monotone" dataKey="inbound" name="Recebidas" stroke={CHART_SERIES[0]} fill="url(#grad-in)" strokeWidth={2} />
              <Area type="monotone" dataKey="outbound" name="Enviadas" stroke={CHART_SERIES[1]} fill="url(#grad-out)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Por canal" subtitle="Volume de conversas">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={volumeByChannel || []} layout="vertical" margin={{ left: 8, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} horizontal={false} />
              <XAxis type="number" tick={chartAxisTick} allowDecimals={false} tickFormatter={formatAxisNumber} />
              <YAxis type="category" dataKey="channelName" tick={chartAxisTick} width={120} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--color-muted)', opacity: 0.6 }} formatter={formatTooltipNumber} />
              <Bar dataKey="count" name="Conversas" radius={[0, 4, 4, 0]} fill={CHART_SEQ} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ROW 3 — bot + tags. `items-start`: cada cartão tem a altura do
          próprio conteúdo, em vez de esticar e ficar meio vazio. */}
      <div className="mt-6 grid items-start gap-6 lg:grid-cols-2">
        <ChartCard title="Desempenho do bot" subtitle="Resolvidas pelo bot vs encaminhadas" height="">
          {botPerf ? <BotPerformancePanel data={botPerf} /> : <PanelSkeleton />}
        </ChartCard>

        <ChartCard title="Principais motivos" subtitle="Tags mais frequentes" height="">
          {topTags ? <TopTagsPanel tags={topTags} /> : <PanelSkeleton />}
        </ChartCard>
      </div>

      {/* ROW 4 — CSAT + reaberturas */}
      <div className="mt-6 grid items-start gap-6 lg:grid-cols-2">
        <ChartCard title="Satisfação em detalhe" subtitle="Distribuição das notas e comentários recentes" height="">
          {csat ? <CsatPanel data={csat} /> : <PanelSkeleton />}
        </ChartCard>

        <ChartCard title="Reaberturas" subtitle="Conversas que voltaram após fechamento" height="">
          {reopens ? <ReopensPanel data={reopens} /> : <PanelSkeleton />}
        </ChartCard>
      </div>

      {/* ROW 4b — equipe agora (full width) */}
      <div className="mt-6">
        <ChartCard title="Equipe agora" subtitle="Status ao vivo · atualiza a cada 30s" flush>
          <TeamPresenceBody query={teamPresence} view="now" />
        </ChartCard>
      </div>
      <div className="mt-6">
        <ChartCard title="Tempo online da equipe" subtitle="Últimos 7 dias" flush>
          <TeamPresenceBody query={teamPresence} view="period" />
        </ChartCard>
      </div>

      {/* ROW 5 — agentes (full width) */}
      <div className="mt-6">
        <ChartCard title="Performance dos agentes" subtitle="Carga atual e métricas no período" flush>
          <AgentList agents={agents || []} />
        </ChartCard>
      </div>

      {/* ROW 5b — placar de distribuição de leads (full width) */}
      <div className="mt-6">
        <ChartCard
          title="Placar de distribuição de leads"
          subtitle="Leads recebidos por atendente — hoje e no mês"
          flush
        >
          {scoreboard ? (
            <LeadDistributionScoreboard rows={scoreboard.rows} />
          ) : (
            <FlushPad><PanelSkeleton /></FlushPad>
          )}
        </ChartCard>
      </div>

      {/* ROW 6 — inatividade */}
      <div className="mt-6">
        <InactivityWidget />
      </div>
    </PageShell>
  );
}

function TeamPresenceBody({
  query, view,
}: {
  query: { data?: TeamPresenceRow[]; isError: boolean; refetch: () => unknown };
  view: 'now' | 'period';
}) {
  // Erro só derruba o card quando não há dado anterior: num refetch de 30s que
  // falha, seguimos mostrando a última foto em vez de piscar o erro.
  if (query.data) {
    return view === 'now' ? <TeamPresenceNow rows={query.data} /> : <TeamPresencePeriod rows={query.data} />;
  }
  if (query.isError) return <FlushPad><TeamPresenceError onRetry={() => { void query.refetch(); }} /></FlushPad>;
  return <FlushPad><PanelSkeleton /></FlushPad>;
}

function BotPerformancePanel({ data }: { data: NonNullable<Awaited<ReturnType<typeof dashboardService.getBotPerformance>>> }) {
  if (data.total === 0) {
    return <EmptyState size="sm" title="Sem conversas no período" />;
  }

  const segments = [
    { label: 'Bot resolveu', value: data.botResolved, color: CHART_SERIES[0] },
    { label: 'Encaminhada', value: data.humanHandled, color: CHART_SERIES[1] },
    { label: 'Em andamento', value: data.inFlight, color: CHART_MUTED },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Stat
          label="Resolução pelo bot"
          value={formatPercent(data.botResolutionRate)}
          hint={`${formatNumber(data.botResolved)} conversa${data.botResolved === 1 ? '' : 's'}`}
        />
        <Stat
          label="Taxa de transbordo"
          value={formatPercent(data.escalationRate)}
          hint={`${formatNumber(data.humanHandled)} transferida${data.humanHandled === 1 ? '' : 's'}`}
        />
      </div>

      <div>
        <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
          {segments.map((s) => (
            <div
              key={s.label}
              style={{ backgroundColor: s.color, width: `${(s.value / data.total) * 100}%` }}
              title={`${s.label}: ${formatNumber(s.value)}`}
            />
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
          {segments.map((s) => (
            <span key={s.label} className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
              {s.label} <span className="font-medium tabular-nums text-foreground">{formatNumber(s.value)}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="min-w-0 rounded-lg bg-muted px-3 py-2.5">
      <p className="text-[11px] font-medium uppercase leading-tight tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums text-foreground">{value}</p>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function CsatPanel({ data }: { data: NonNullable<Awaited<ReturnType<typeof dashboardService.getCsat>>> }) {
  if (data.totalResponses === 0) {
    return <EmptyState size="sm" title="Nenhuma avaliação respondida ainda" />;
  }
  const max = Math.max(...Object.values(data.distribution));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Nota média" value={data.avgScore !== null ? `${formatNumber(data.avgScore)}/5` : '—'} />
        <Stat
          label="Respostas"
          value={formatNumber(data.totalResponses)}
          hint={`de ${formatNumber(data.totalRequested)} pedidas`}
        />
        <Stat label="Taxa de resposta" value={formatPercent(data.responseRate)} />
      </div>

      <div className="space-y-1.5">
        {[5, 4, 3, 2, 1].map((s) => {
          const count = data.distribution[s] ?? 0;
          return (
            <div key={s} className="flex items-center gap-2 text-xs">
              <span className="w-3 text-right tabular-nums text-muted-foreground">{s}</span>
              <Star aria-hidden="true" className="h-3 w-3 fill-warning text-warning" />
              <div className="relative h-3 flex-1 overflow-hidden rounded bg-muted">
                <div
                  className="h-full rounded"
                  style={{
                    width: max > 0 ? `${(count / max) * 100}%` : '0%',
                    backgroundColor: s >= 4 ? 'var(--color-success)' : s === 3 ? 'var(--color-warning)' : 'var(--color-urgent)',
                    opacity: 0.8,
                  }}
                />
              </div>
              <span className="w-8 text-right tabular-nums text-muted-foreground">{formatNumber(count)}</span>
            </div>
          );
        })}
      </div>

      {data.recentComments.length > 0 && (
        <div className="space-y-2 border-t border-border pt-3">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Comentários recentes</p>
          {data.recentComments.map((c) => (
            <div key={c.id} className="rounded-lg bg-muted px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate text-xs font-medium text-foreground">{c.contactName}</span>
                <span role="img" aria-label={`Nota ${c.score} de 5`} className="flex shrink-0 items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} aria-hidden="true" className={`h-3 w-3 ${i < c.score ? 'fill-warning text-warning' : 'text-border'}`} />
                  ))}
                </span>
              </div>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{c.comment}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ReopensPanel({ data }: { data: NonNullable<Awaited<ReturnType<typeof dashboardService.getReopens>>> }) {
  if (data.totalReopens === 0 && data.uniqueConversationsReopened === 0) {
    return <EmptyState size="sm" title="Nenhuma reabertura no período" />;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Reaberturas" value={formatNumber(data.totalReopens)} />
        <Stat label="Conversas únicas" value={formatNumber(data.uniqueConversationsReopened)} />
        <Stat label="Taxa" value={formatPercent(data.reopenRate)} />
      </div>

      {/* Série em cor neutra de magnitude: vermelho é para estado, não para métrica. */}
      <div className="h-24">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data.series}>
            <defs>
              <linearGradient id="grad-reopen" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART_SEQ} stopOpacity={0.35} />
                <stop offset="100%" stopColor={CHART_SEQ} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Tooltip
              contentStyle={tooltipStyle}
              labelFormatter={formatChartDay}
              formatter={(v) => [typeof v === 'number' ? formatNumber(v) : v, 'reaberturas']}
            />
            <Area type="monotone" dataKey="value" stroke={CHART_SEQ} fill="url(#grad-reopen)" strokeWidth={1.75} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {data.worstOffenders.length > 0 && (
        <div className="space-y-1.5 border-t border-border pt-3">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Mais reabertas</p>
          {data.worstOffenders.map((o) => (
            <div key={o.conversationId} className="flex items-center justify-between gap-2 rounded-lg bg-muted px-3 py-1.5">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-foreground">{o.contactName}</p>
                <p className="truncate text-[11px] text-muted-foreground">{o.agentName ?? 'Sem responsável'}</p>
              </div>
              <Badge variant="neutral" className="shrink-0 bg-card tabular-nums text-foreground">
                {formatNumber(o.reopenedCount)}×
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TopTagsPanel({ tags }: { tags: Array<{ id: string; name: string; color: string; count: number }> }) {
  if (tags.length === 0) {
    return <EmptyState size="sm" title="Nenhuma tag aplicada no período" />;
  }
  const max = Math.max(...tags.map((t) => t.count));

  return (
    <div className="space-y-2.5">
      {tags.map((t) => (
        <div key={t.id} className="flex items-center gap-3">
          <div className="flex w-24 min-w-0 shrink-0 items-center gap-2 sm:w-32">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: t.color }} />
            <span className="truncate text-xs font-medium text-foreground">{t.name}</span>
          </div>
          <div className="flex flex-1 items-center gap-2">
            <div className="relative h-5 flex-1 overflow-hidden rounded bg-muted">
              <div
                className="h-full rounded transition-all"
                style={{ width: `${(t.count / max) * 100}%`, backgroundColor: t.color, opacity: 0.85 }}
              />
            </div>
            <span className="w-10 text-right text-xs font-semibold tabular-nums text-foreground">
              {formatNumber(t.count)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
