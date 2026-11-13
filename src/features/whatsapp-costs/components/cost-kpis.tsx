'use client';

import { CircleDollarSign, Gift, MessageSquare, TrendingUp } from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import { SM_UP_QUERY, useMediaQuery } from '../hooks/use-media-query';
import { formatCost, formatCount } from '../lib/format';
import { projectMonthCost } from '../lib/projection';
import type { ChannelCosts } from '../services/whatsapp-costs.service';

/**
 * Números do período para um canal. A projeção só aparece em "Este mês":
 * em período fechado ou corrido ela não quer dizer nada.
 */
export function CostKpis({
  channel,
  periodEnd,
  isCurrentMonth,
}: {
  channel: ChannelCosts;
  /** Último dia do período ('YYYY-MM-DD'), que em "Este mês" é hoje. */
  periodEnd: string;
  isCurrentMonth: boolean;
}) {
  // No celular os cartões ficam em duas colunas estreitas: o tamanho `sm`
  // evita que um valor em dinheiro estoure a largura do cartão.
  const size = useMediaQuery(SM_UP_QUERY) ? 'md' : 'sm';
  const { currency, totals } = channel;
  const projection = isCurrentMonth ? projectMonthCost(totals.cost, periodEnd) : null;

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
      <StatCard
        size={size}
        className="min-w-0"
        label="Custo no período"
        value={formatCost(totals.cost, currency)}
        hint="Valor informado pela Meta"
        icon={CircleDollarSign}
      />
      {projection !== null && (
        <StatCard
          size={size}
          className="min-w-0"
          label="Projeção do mês"
          value={formatCost(projection, currency)}
          hint="Se o ritmo de até hoje continuar"
          icon={TrendingUp}
        />
      )}
      <StatCard
        size={size}
        className="min-w-0"
        label="Mensagens cobradas"
        value={formatCount(totals.billable)}
        icon={MessageSquare}
      />
      <StatCard
        size={size}
        className="min-w-0"
        label="Mensagens grátis"
        value={formatCount(totals.free)}
        hint="Franquia da Meta e quem veio de anúncio"
        icon={Gift}
      />
    </div>
  );
}
