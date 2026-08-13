'use client';

import { cn } from '@/lib/utils';
import type { MarketingIndicator } from '../services/marketing.service';

const COLOR_STYLES: Record<MarketingIndicator['color'], { border: string; dot: string }> = {
  green: { border: 'border-l-green-500', dot: 'bg-green-500' },
  yellow: { border: 'border-l-amber-500', dot: 'bg-amber-500' },
  red: { border: 'border-l-red-500', dot: 'bg-red-500' },
  grey: { border: 'border-l-zinc-300 dark:border-l-zinc-600', dot: 'bg-zinc-400' },
};

function formatIndicatorValue(value: number | null, format: MarketingIndicator['format']): string {
  if (value === null) return '—';
  if (format === 'currency') {
    return 'R$ ' + value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (format === 'percent') {
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';
  }
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

interface HealthTrafficLightProps {
  /** Sempre as seis chaves vindas da API — a grade nunca reordena nem oculta uma. */
  indicators: MarketingIndicator[];
  /** Chamado ao clicar num indicador cinza ("sem meta"), pra abrir o editor de metas. */
  onConfigureGoals?: () => void;
}

export function HealthTrafficLight({ indicators, onConfigureGoals }: HealthTrafficLightProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {indicators.map((indicator) => {
        const style = COLOR_STYLES[indicator.color];
        // Cinza é o sinal de "meta não configurada" — nunca de erro. O cartão
        // convida a configurar em vez de parecer quebrado.
        const isUnset = indicator.color === 'grey';

        return (
          <div
            key={indicator.key}
            role={isUnset ? 'button' : undefined}
            tabIndex={isUnset ? 0 : undefined}
            onClick={isUnset ? onConfigureGoals : undefined}
            onKeyDown={
              isUnset
                ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') onConfigureGoals?.();
                  }
                : undefined
            }
            className={cn(
              'rounded-lg border-y border-r border-zinc-200 border-l-4 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900',
              style.border,
              isUnset && 'cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/60',
            )}
          >
            <div className="flex items-center gap-1.5">
              <span className={cn('h-2 w-2 shrink-0 rounded-full', style.dot)} />
              <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                {indicator.label}
              </span>
            </div>
            <p className="mt-1.5 text-2xl font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
              {formatIndicatorValue(indicator.value, indicator.format)}
            </p>
            <p className="mt-0.5 text-xs text-zinc-400">
              {indicator.target !== null
                ? `Meta: ${formatIndicatorValue(indicator.target, indicator.format)}`
                : isUnset
                  ? 'Sem meta — clique para definir'
                  : 'Sem meta definida'}
            </p>
          </div>
        );
      })}
    </div>
  );
}
