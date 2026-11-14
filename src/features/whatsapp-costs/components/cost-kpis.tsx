'use client';

import { CircleDollarSign, Gift, MessageSquare, TrendingUp } from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import { SM_UP_QUERY, useMediaQuery } from '../hooks/use-media-query';
import { formatCost, formatCount } from '../lib/format';
import { DEFAULT_TIME_ZONE, todayIn } from '../lib/period';
import { type CostForecast, forecastCost } from '../lib/projection';
import type { ChannelCosts } from '../services/whatsapp-costs.service';

type Currency = ChannelCosts['currency'];

function forecastLabel(forecast: CostForecast, isWide: boolean): string {
  if (!isWide) return 'Previsão';
  return forecast.horizon === 'month' ? 'Previsão do mês' : 'Previsão 30 dias';
}

function forecastHint(forecast: CostForecast, currency: Currency): string {
  const perDay = `${formatCost(forecast.dailyAverage, currency)}/dia`;
  if (forecast.remaining === null) return `${perDay} no ritmo do período`;
  return `${perDay} · faltam ${formatCost(forecast.remaining, currency)}`;
}

/**
 * Números do período para um canal. A previsão usa o ritmo dos dias fechados:
 * em "Este mês" é o fechamento do mês; nos outros períodos, os próximos 30 dias.
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
  // No celular o rótulo longo e o ícone não cabem juntos: rótulo curto, sem ícone.
  const isWide = useMediaQuery(SM_UP_QUERY);
  const size = isWide ? 'md' : 'sm';
  const iconIfWide = <T,>(icon: T) => (isWide ? icon : undefined);
  const { currency, totals } = channel;
  const forecast = forecastCost({
    daily: channel.daily,
    periodEnd,
    isCurrentMonth,
    endsToday: periodEnd === todayIn(DEFAULT_TIME_ZONE, new Date()),
  });

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
      <StatCard
        size={size}
        className="min-w-0"
        label={isWide ? 'Custo no período' : 'Custo'}
        value={formatCost(totals.cost, currency)}
        hint="Valor informado pela Meta"
        icon={iconIfWide(CircleDollarSign)}
      />
      {forecast !== null && (
        <StatCard
          size={size}
          className="min-w-0"
          label={forecastLabel(forecast, isWide)}
          value={formatCost(forecast.total, currency)}
          hint={forecastHint(forecast, currency)}
          icon={iconIfWide(TrendingUp)}
        />
      )}
      <StatCard
        size={size}
        className="min-w-0"
        label={isWide ? 'Mensagens cobradas' : 'Cobradas'}
        value={formatCount(totals.billable)}
        icon={iconIfWide(MessageSquare)}
      />
      <StatCard
        size={size}
        className="min-w-0"
        label={isWide ? 'Mensagens grátis' : 'Grátis'}
        value={formatCount(totals.free)}
        hint="Franquia da Meta e quem veio de anúncio"
        icon={iconIfWide(Gift)}
      />
    </div>
  );
}
