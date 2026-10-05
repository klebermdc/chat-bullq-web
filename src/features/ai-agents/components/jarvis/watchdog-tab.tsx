'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Eye,
  Timer,
  Activity,
  AlertTriangle,
  RefreshCw,
  ShieldCheck,
  ShieldOff,
} from 'lucide-react';
import { aiAgentsService, type WatchdogConversationLite } from '../../services/ai-agents.service';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState, LoadingState } from '@/components/ui/empty-state';
import { KpiCard } from './kpi-card';
import { conversationStatusLabel } from './format';
import {
  TableCard,
  tbodyCls, tdCls, tdMutedCls, tdNumCls, tdTruncateCls, thCls, thNumCls, theadCls, trCls,
} from '@/features/crm-reports/components/table-parts';

/**
 * Aba "Watchdog" do Jarvis. Monitoramento das conversas presas:
 * - 4 KPI cards (timers ativos, checks 24h, reativações 24h, conversas presas)
 * - Estado do watchdog (enabled + thresholds)
 * - Lista de conversas em alerta (stuckAttempts > 0)
 * - Lista de conversas marcadas isStuck=true (precisam revisão humana)
 */
export function JarvisWatchdogTab() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['watchdog-stats'],
    queryFn: () => aiAgentsService.watchdogStats(),
    refetchInterval: 15_000, // refetch automático a cada 15s
    staleTime: 5_000,
  });

  if (isLoading || !data) {
    return (
      <LoadingState />
    );
  }

  const { enabled, config, stats, topAlert, recentStuck } = data;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Watchdog
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Monitor de conversas presas — atualiza a cada 15 s
          </p>
        </div>
        <Badge variant={enabled ? 'success' : 'neutral'} className="px-2.5 py-1 text-xs">
          {enabled ? (
            <>
              <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5" />
              Ativo
            </>
          ) : (
            <>
              <ShieldOff aria-hidden="true" className="h-3.5 w-3.5" />
              Desativado
            </>
          )}
        </Badge>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={Timer}
          label="Timers ativos"
          value={stats.activeTimers}
          hint="Verificações agendadas, aguardando o cliente avançar"
        />
        <KpiCard
          icon={Eye}
          label="Verificações em 24 h"
          value={stats.checks24h}
          hint="Conversas avaliadas pelo watchdog"
        />
        <KpiCard
          icon={Activity}
          label="Reativações em 24 h"
          value={stats.reactivations24h}
          hint="A IA reassumiu depois de detectar travamento"
        />
        <KpiCard
          icon={AlertTriangle}
          label="Conversas presas"
          value={stats.stuck}
          hint={`Atingiram o limite de ${config.maxAttempts} tentativas`}
          state={
            stats.stuck > 0
              ? { label: 'Requer ação', tone: 'urgent' }
              : { label: 'Tudo certo', tone: 'success' }
          }
        />
      </div>

      {/* Configuração */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Limites atuais
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Tempo parado, por status da conversa, até o watchdog agir.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <ConfigItem label="No bot" value={`${config.delayBotMin} min`} />
          <ConfigItem label="Pendente" value={`${config.delayPendingMin} min`} />
          <ConfigItem label="Aberta" value={`${config.delayHumanIdleMin} min`} />
          <ConfigItem label="Máx. de tentativas" value={String(config.maxAttempts)} />
        </div>
      </div>

      {/* Lista: em alerta */}
      <Section
        title={`Em alerta (${topAlert.length})`}
        subtitle="Conversas com tentativas de reativação registradas — atenção se subirem"
        empty="Nenhuma conversa em alerta no momento"
        list={topAlert}
        config={config}
      />

      {/* Lista: presas */}
      {recentStuck.length > 0 && (
        <Section
          title={`Presas (${recentStuck.length})`}
          subtitle="Atingiram o limite de tentativas — precisam de intervenção humana"
          empty=""
          list={recentStuck}
          config={config}
          danger
        />
      )}

      <Button variant="outline" size="sm" onClick={() => refetch()}>
        <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" /> Atualizar agora
      </Button>
    </div>
  );
}

function ConfigItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="font-mono text-sm tabular-nums text-foreground">{value}</p>
    </div>
  );
}

function Section({
  title,
  subtitle,
  empty,
  list,
  config,
  danger,
}: {
  title: string;
  subtitle: string;
  empty: string;
  list: WatchdogConversationLite[];
  config: { maxAttempts: number };
  danger?: boolean;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground">
        {title}
      </h3>
      <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
      {list.length === 0 ? (
        <EmptyState
          size="sm"
          icon={ShieldCheck}
          title={empty}
          className="mt-2 rounded-xl border border-dashed border-border"
        />
      ) : (
        <TableCard label={title} minWidth="min-w-[760px]" className="mt-2">
            <thead className={theadCls}>
              <tr>
                <th scope="col" className={thCls}>Cliente</th>
                <th scope="col" className={thCls}>Canal</th>
                <th scope="col" className={thCls}>Status</th>
                <th scope="col" className={thNumCls}>Tentativas</th>
                <th scope="col" className={thCls}>Última verificação</th>
                <th scope="col" className={thCls}><span className="sr-only">Ações</span></th>
              </tr>
            </thead>
            <tbody className={tbodyCls}>
              {list.map((c) => {
                const ratio = c.stuckAttempts / config.maxAttempts;
                return (
                  <tr key={c.id} className={trCls}>
                    <td
                      className={`${tdTruncateCls} w-[32%] font-medium`}
                      title={c.contact.name ?? c.contact.phone ?? undefined}
                    >
                      {c.contact.name ?? c.contact.phone ?? '—'}
                    </td>
                    <td className={`${tdTruncateCls} w-[22%]`} title={c.channel.name}>
                      {c.channel.name}
                    </td>
                    <td className={tdCls}>
                      <Badge variant="neutral" className="font-medium">
                        {conversationStatusLabel(c.status)}
                      </Badge>
                    </td>
                    <td className={tdNumCls}>
                      <span
                        className={`inline-flex items-center justify-end gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums ${
                          danger
                            ? 'bg-urgent-wash text-urgent-ink'
                            : ratio >= 0.66
                              ? 'bg-warning-wash text-warning-ink'
                              : 'bg-muted text-foreground'
                        }`}
                      >
                        {c.stuckAttempts}/{config.maxAttempts}
                      </span>
                    </td>
                    <td className={`${tdMutedCls} font-mono tabular-nums`}>
                      {c.lastWatchdogCheckAt
                        ? new Date(c.lastWatchdogCheckAt).toLocaleString('pt-BR')
                        : '—'}
                    </td>
                    <td className={`${tdCls} text-right`}>
                      <Link
                        href={`/inbox?conversationId=${c.id}`}
                        className="whitespace-nowrap text-xs font-medium text-primary underline-offset-2 hover:underline"
                      >
                        Abrir conversa
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
        </TableCard>
      )}
    </div>
  );
}
