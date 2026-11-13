'use client';

import type { UseQueryResult } from '@tanstack/react-query';
import { Info, Users } from 'lucide-react';
import { LoadingState } from '@/components/ui/empty-state';
import { formatUnitPrice } from '../lib/format';
import { categoryShortLabel } from '../lib/labels';
import { describePerConversation, marketingToServiceRatio } from '../lib/selectors';
import type { BreakdownResponse } from '../services/whatsapp-costs.service';
import { SectionError, StateCard } from './section-parts';
import { SendersTable } from './senders-table';
import { TemplatesTable } from './templates-table';

const ESTIMATE_NOTE = 'Valor por vendedor é estimado: quantidade × preço da Meta no período.';

function unitPricesText(breakdown: BreakdownResponse): string | null {
  const entries = Object.entries(breakdown.unitPrices ?? {}).filter(([, price]) => price > 0);
  if (entries.length === 0) return null;
  const parts = entries.map(
    ([category, price]) => `${categoryShortLabel(category)} ${formatUnitPrice(price, breakdown.currency)}`,
  );
  return `Preço por mensagem: ${parts.join(' · ')}.`;
}

function BreakdownNotes({ breakdown }: { breakdown: BreakdownResponse }) {
  const perConversation = describePerConversation(breakdown.perConversation);
  const prices = unitPricesText(breakdown);
  return (
    <div className="space-y-2 rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm">
      {perConversation && (
        <p className="flex items-start gap-2 text-foreground">
          <Users aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0">{perConversation}</span>
        </p>
      )}
      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <Info aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span className="min-w-0">
          {ESTIMATE_NOTE}
          {prices && ` ${prices}`}
        </span>
      </p>
    </div>
  );
}

/** Quem gera o custo, templates e a conversa típica. Carrega e falha sozinho. */
export function BreakdownSection({ query }: { query: UseQueryResult<BreakdownResponse> }) {
  if (query.isPending) {
    return (
      <StateCard>
        <LoadingState label="Carregando quem gera o custo…" />
      </StateCard>
    );
  }

  if (query.isError) {
    return (
      <StateCard>
        <SectionError
          title="Não foi possível carregar o detalhamento por vendedor"
          error={query.error}
          onRetry={() => void query.refetch()}
          isRetrying={query.isFetching}
        />
      </StateCard>
    );
  }

  const breakdown = query.data;
  return (
    <div className="space-y-4 sm:space-y-6">
      <BreakdownNotes breakdown={breakdown} />
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <SendersTable senders={breakdown.senders} currency={breakdown.currency} />
        <TemplatesTable
          templates={breakdown.templates}
          currency={breakdown.currency}
          marketingRatio={marketingToServiceRatio(breakdown.unitPrices ?? {})}
        />
      </div>
    </div>
  );
}
