'use client';

import type { UseQueryResult } from '@tanstack/react-query';
import { CheckCheck, Eye, Send, XCircle } from 'lucide-react';
import { EmptyState, LoadingState } from '@/components/ui/empty-state';
import { StatCard } from '@/components/ui/stat-card';
import { SM_UP_QUERY, useMediaQuery } from '../hooks/use-media-query';
import { formatCount, formatRatioPercent } from '../lib/format';
import type { DeliveryResponse } from '../services/whatsapp-costs.service';
import { DeliveryCharts } from './delivery-charts';
import { FailureReasonsTable } from './failure-reasons-table';
import { SectionError, StateCard } from './section-parts';

const messagesNoun = (count: number) => (count === 1 ? 'mensagem' : 'mensagens');

function DeliveryKpis({ totals }: { totals: DeliveryResponse['totals'] }) {
  const size = useMediaQuery(SM_UP_QUERY) ? 'md' : 'sm';

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
      <StatCard
        size={size}
        className="min-w-0"
        label="Taxa de entrega"
        value={formatRatioPercent(totals.deliveryRate)}
        hint={`${formatCount(totals.delivered)} de ${formatCount(totals.outbound)} enviadas`}
        icon={CheckCheck}
      />
      <StatCard
        size={size}
        className="min-w-0"
        label="Taxa de leitura"
        value={formatRatioPercent(totals.readRate)}
        hint={`${formatCount(totals.read)} de ${formatCount(totals.delivered)} entregues`}
        icon={Eye}
      />
      <StatCard
        size={size}
        className="col-span-2 min-w-0 sm:col-span-1"
        label="Falhas"
        value={formatRatioPercent(totals.failureRate)}
        hint={`${formatCount(totals.failed)} ${messagesNoun(totals.failed)}`}
        icon={XCircle}
      />
    </div>
  );
}

function DeliveryBody({ query }: { query: UseQueryResult<DeliveryResponse> }) {
  if (query.isPending) {
    return (
      <StateCard>
        <LoadingState label="Carregando entrega…" />
      </StateCard>
    );
  }

  if (query.isError) {
    return (
      <StateCard>
        <SectionError
          title="Não foi possível carregar a entrega"
          error={query.error}
          onRetry={() => void query.refetch()}
          isRetrying={query.isFetching}
        />
      </StateCard>
    );
  }

  const delivery = query.data;
  if (delivery.totals.outbound === 0) {
    return (
      <StateCard>
        <EmptyState
          icon={Send}
          title="Nenhuma mensagem enviada neste período"
          description="Aqui entram as mensagens de saída dos canais de WhatsApp oficial. Tente um período maior."
        />
      </StateCard>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <DeliveryKpis totals={delivery.totals} />
      <DeliveryCharts delivery={delivery} />
      <FailureReasonsTable reasons={delivery.failuresByReason} totalFailed={delivery.totals.failed} />
    </div>
  );
}

/** Seção "Entrega". Carrega e falha sem depender da cobrança. */
export function DeliverySection({ query }: { query: UseQueryResult<DeliveryResponse> }) {
  return (
    <section aria-labelledby="whatsapp-costs-delivery-title">
      <h2 id="whatsapp-costs-delivery-title" className="text-lg font-semibold text-foreground">
        Entrega
      </h2>
      <p className="mt-0.5 text-sm text-muted-foreground">
        Quantas mensagens enviadas chegaram, foram lidas ou falharam.
      </p>
      <div className="mt-4">
        <DeliveryBody query={query} />
      </div>
    </section>
  );
}
