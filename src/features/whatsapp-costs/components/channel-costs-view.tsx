'use client';

import { AlertTriangle, MessageSquare } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { useWhatsappCostsBreakdown } from '../hooks/use-whatsapp-costs';
import type { PeriodRange } from '../lib/period';
import { hasActivity } from '../lib/selectors';
import type { ChannelCosts } from '../services/whatsapp-costs.service';
import { BreakdownSection } from './breakdown-section';
import { CategoryTable } from './category-table';
import { CostKpis } from './cost-kpis';
import { DailyCostChart } from './daily-cost-chart';
import { StateCard } from './section-parts';

/** A Meta falhou só para este número: mostra o motivo, os outros seguem. */
function ChannelError({ channel }: { channel: ChannelCosts }) {
  return (
    <StateCard>
      <div role="alert">
        <EmptyState
          size="sm"
          icon={AlertTriangle}
          title={`A Meta não devolveu os custos de ${channel.channelName}`}
          description={channel.error ?? 'Tente de novo em alguns minutos. Os outros números continuam na lista.'}
        />
      </div>
    </StateCard>
  );
}

function NoActivity() {
  return (
    <StateCard>
      <EmptyState
        icon={MessageSquare}
        title="Nenhuma mensagem neste período"
        description="A Meta não registrou mensagem cobrada nem grátis para este número. Tente outro período."
      />
    </StateCard>
  );
}

export function ChannelCostsView({
  channel,
  range,
  isCurrentMonth,
}: {
  channel: ChannelCosts;
  range: PeriodRange;
  isCurrentMonth: boolean;
}) {
  const isHealthy = channel.status === 'ok';
  const isActive = isHealthy && hasActivity(channel);
  // O detalhamento só vale a consulta quando houve mensagem.
  const breakdown = useWhatsappCostsBreakdown(channel.channelId, range, isActive);

  if (!isHealthy) return <ChannelError channel={channel} />;
  if (!isActive) return <NoActivity />;

  return (
    <div className="space-y-4 sm:space-y-6">
      <CostKpis channel={channel} periodEnd={range.to} isCurrentMonth={isCurrentMonth} />
      <div className="grid gap-4 sm:gap-6 xl:grid-cols-3">
        <div className="min-w-0 xl:col-span-2">
          <DailyCostChart daily={channel.daily} currency={channel.currency} />
        </div>
        <CategoryTable rows={channel.totals.byCategory} currency={channel.currency} />
      </div>
      <BreakdownSection query={breakdown} />
    </div>
  );
}
