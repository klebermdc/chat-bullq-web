'use client';

import type { UseQueryResult } from '@tanstack/react-query';
import { Calculator, CircleDollarSign, MessageSquare, Wallet } from 'lucide-react';
import { EmptyState, LoadingState } from '@/components/ui/empty-state';
import { StatCard } from '@/components/ui/stat-card';
import { SM_UP_QUERY, useMediaQuery } from '../hooks/use-media-query';
import { formatCost, formatCount, formatRatioPercent, shareOf } from '../lib/format';
import type { BillingResponse } from '../services/whatsapp-costs.service';
import { BillingCharts } from './billing-charts';
import { CategoryTable } from './category-table';
import { SectionError, StateCard } from './section-parts';
import { StatusBanner } from './status-banner';

function BillingKpis({ billing }: { billing: BillingResponse }) {
  const { currency, totals, projectedServiceCost } = billing;
  // No celular os cartões ficam em duas colunas estreitas: o tamanho `sm`
  // evita que um valor em dinheiro estoure a largura do cartão.
  const size = useMediaQuery(SM_UP_QUERY) ? 'md' : 'sm';

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
      <StatCard
        size={size}
        className="min-w-0"
        label="Mensagens"
        value={formatCount(totals.messages)}
        icon={MessageSquare}
      />
      <StatCard
        size={size}
        className="min-w-0"
        label="Cobráveis"
        value={formatCount(totals.billable)}
        hint={`${formatRatioPercent(shareOf(totals.billable, totals.messages))} do total`}
        icon={CircleDollarSign}
      />
      <StatCard
        size={size}
        className="min-w-0"
        label="Custo estimado"
        value={formatCost(totals.estimatedCost, currency)}
        icon={Wallet}
      />
      <StatCard
        size={size}
        className="min-w-0"
        label="Se cobrar atendimento"
        value={formatCost(projectedServiceCost, currency)}
        hint="todo texto livre hoje grátis × tarifa de atendimento"
        icon={Calculator}
      />
    </div>
  );
}

/** Aviso, números, gráficos e tabela de cobrança. Carrega e falha sozinha. */
export function BillingSection({ query }: { query: UseQueryResult<BillingResponse> }) {
  if (query.isPending) {
    return (
      <StateCard>
        <LoadingState label="Carregando cobrança…" />
      </StateCard>
    );
  }

  if (query.isError) {
    return (
      <StateCard>
        <SectionError
          title="Não foi possível carregar a cobrança"
          error={query.error}
          onRetry={() => void query.refetch()}
          isRetrying={query.isFetching}
        />
      </StateCard>
    );
  }

  const billing = query.data;
  const hasMessages = billing.totals.messages > 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      <StatusBanner firstBillableServiceDate={billing.firstBillableServiceDate} />
      {hasMessages ? (
        <>
          <BillingKpis billing={billing} />
          <BillingCharts billing={billing} />
          <CategoryTable rows={billing.totals.byCategory} currency={billing.currency} />
        </>
      ) : (
        <StateCard>
          <EmptyState
            icon={MessageSquare}
            title="Nenhuma mensagem com informação de cobrança neste período"
            description="Os dados começam no dia em que este acompanhamento foi ligado ou em que a carga do histórico rodou. Tente um período mais recente."
          />
        </StateCard>
      )}
    </div>
  );
}
