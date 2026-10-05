'use client';

import { cn } from '@/lib/utils';
import type { MarketingIndicator } from '../services/marketing.service';

// A cor sozinha não basta para quem não distingue verde de vermelho: cada
// estado também tem nome, lido pelo leitor de tela e mostrado no `title`.
const COLOR_LABEL: Record<MarketingIndicator['color'], string> = {
  green: 'Dentro da meta',
  yellow: 'Atenção',
  red: 'Fora da meta',
  grey: 'Sem meta',
};

const COLOR_STYLES: Record<MarketingIndicator['color'], { border: string; dot: string }> = {
  green: { border: 'border-l-success', dot: 'bg-success' },
  yellow: { border: 'border-l-warning', dot: 'bg-warning' },
  red: { border: 'border-l-urgent', dot: 'bg-urgent' },
  grey: { border: 'border-l-border', dot: 'bg-muted-foreground/50' },
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
              'rounded-xl border-y border-r border-border border-l-4 bg-card p-4 shadow-soft',
              style.border,
              isUnset && 'cursor-pointer hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            )}
          >
            <div className="flex items-center gap-1.5">
              <span
                role="img"
                aria-label={COLOR_LABEL[indicator.color]}
                title={COLOR_LABEL[indicator.color]}
                className={cn('h-2 w-2 shrink-0 rounded-full', style.dot)}
              />
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {indicator.label}
              </span>
            </div>
            <p className="mt-1.5 text-2xl font-bold tabular-nums tracking-tight text-foreground">
              {formatIndicatorValue(indicator.value, indicator.format)}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
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
