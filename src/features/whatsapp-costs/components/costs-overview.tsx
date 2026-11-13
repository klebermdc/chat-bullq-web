'use client';

import { useState } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { Smartphone } from 'lucide-react';
import { EmptyState, LoadingState } from '@/components/ui/empty-state';
import { formatCost, formatRange } from '../lib/format';
import type { PeriodRange } from '../lib/period';
import { resolveChannelId } from '../lib/selectors';
import type { CostsResponse } from '../services/whatsapp-costs.service';
import { ChannelCostsView } from './channel-costs-view';
import { ChannelSelect } from './channel-select';
import { SectionError, StateCard } from './section-parts';

function totalsText(costs: CostsResponse): string | null {
  if (costs.channels.length <= 1 || costs.totalsByCurrency.length === 0) return null;
  const parts = costs.totalsByCurrency.map((t) => formatCost(t.cost, t.currency));
  return `Todos os números: ${parts.join(' + ')}`;
}

function PeriodLine({ costs }: { costs: CostsResponse }) {
  const totals = totalsText(costs);
  return (
    <p className="text-xs text-muted-foreground">
      {formatRange(costs.from, costs.to)}
      {totals && <span className="block sm:inline sm:before:content-['_·_']">{totals}</span>}
    </p>
  );
}

/** Carregamento, erro, lista vazia e o número escolhido. */
export function CostsOverview({
  query,
  range,
  isCurrentMonth,
}: {
  query: UseQueryResult<CostsResponse>;
  range: PeriodRange;
  isCurrentMonth: boolean;
}) {
  const [chosenId, setChosenId] = useState<string | null>(null);

  if (query.isPending) {
    return (
      <StateCard>
        <LoadingState label="Carregando custos da Meta…" />
      </StateCard>
    );
  }

  if (query.isError) {
    return (
      <StateCard>
        <SectionError
          title="Não foi possível carregar os custos"
          error={query.error}
          onRetry={() => void query.refetch()}
          isRetrying={query.isFetching}
        />
      </StateCard>
    );
  }

  const costs = query.data;
  const channelId = resolveChannelId(costs.channels, chosenId);
  const channel = costs.channels.find((c) => c.channelId === channelId);

  if (!channel) {
    return (
      <StateCard>
        <EmptyState
          icon={Smartphone}
          title="Nenhum número do WhatsApp conectado"
          description="Os custos aparecem aqui depois que um número da API oficial do WhatsApp é conectado em Configurações › Canais."
        />
      </StateCard>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <PeriodLine costs={costs} />
        <ChannelSelect channels={costs.channels} value={channel.channelId} onChange={setChosenId} />
      </div>
      <ChannelCostsView
        key={channel.channelId}
        channel={channel}
        range={range}
        isCurrentMonth={isCurrentMonth}
      />
    </div>
  );
}
