import { cn } from '@/lib/utils';
import { PERIOD_OPTIONS, type PeriodKey } from '../lib/period';

/**
 * Seletor de período no mesmo desenho do `PeriodPresets` dos relatórios de
 * CRM. Aquele não serve aqui: os atalhos são outros (Hoje/7/30/Mês) e ele só
 * devolve o início do intervalo.
 */
export function PeriodControl({
  value,
  onChange,
}: {
  value: PeriodKey;
  onChange: (period: PeriodKey) => void;
}) {
  return (
    <div role="group" aria-label="Período" className="inline-flex max-w-full rounded-lg bg-muted p-0.5">
      {PERIOD_OPTIONS.map((option) => {
        const isSelected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onChange(option.value)}
            className={cn(
              // 36px de altura no celular (alvo de toque), 28px a partir de `sm`.
              'h-9 whitespace-nowrap rounded-md px-2.5 text-xs font-medium transition-colors sm:h-7',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              isSelected
                ? 'bg-background text-foreground shadow-soft'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
