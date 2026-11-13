import { cn } from '@/lib/utils';
import { PERIOD_OPTIONS, type PeriodKey } from '../lib/period';

/**
 * Seletor de período no desenho do `PeriodPresets` dos relatórios. No
 * celular os quatro botões dividem a largura e usam o rótulo curto.
 */
export function PeriodControl({
  value,
  onChange,
}: {
  value: PeriodKey;
  onChange: (period: PeriodKey) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Período"
      className="grid w-full grid-cols-4 rounded-lg bg-muted p-0.5 sm:inline-flex sm:w-auto"
    >
      {PERIOD_OPTIONS.map((option) => {
        const isSelected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isSelected}
            aria-label={option.label}
            onClick={() => onChange(option.value)}
            className={cn(
              // 36px de altura no celular (alvo de toque), 28px a partir de `sm`.
              'h-9 whitespace-nowrap rounded-md px-2 text-xs font-medium transition-colors sm:h-7 sm:px-2.5',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              isSelected
                ? 'bg-background text-foreground shadow-soft'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <span className="sm:hidden">{option.shortLabel}</span>
            <span className="hidden sm:inline">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
