import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Peças comuns às três barras de filtro dos relatórios de CRM (negócios,
 * leads e conversas): a moldura em uma linha só que quebra, o seletor de
 * período e o campo com rótulo visível em cima.
 */

type PresetDays = number | 'month';

const PRESETS: { label: string; days: PresetDays }[] = [
  { label: 'Hoje', days: 0 },
  { label: '7 dias', days: 7 },
  { label: '30 dias', days: 30 },
  { label: 'Mês', days: 'month' },
];

function presetFrom(p: PresetDays): string {
  const now = new Date();
  if (p === 'month')
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const d = new Date(now);
  d.setDate(d.getDate() - p);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export function FilterBarShell({
  children,
  actions,
}: {
  children: ReactNode;
  /** Ações da barra (ex.: exportar), alinhadas à direita na mesma linha. */
  actions?: ReactNode;
}) {
  // Dois grupos: os filtros quebram entre si dentro do grupo da esquerda; as
  // ações ficam presas à primeira linha, à direita, e nunca caem sozinhas
  // para a linha de baixo. `mt-5` desce as ações da altura do rótulo dos
  // campos (16px de texto + 4px de vão), alinhando com os controles.
  // No mobile não há largura para os dois lado a lado: as ações descem
  // como um grupo inteiro.
  return (
    <div className="flex flex-wrap items-start gap-x-3 gap-y-2.5 rounded-xl border border-border bg-card p-3 shadow-soft sm:flex-nowrap">
      <div className="flex min-w-0 flex-1 basis-full flex-wrap items-end gap-x-3 gap-y-2.5 sm:basis-0">
        {children}
      </div>
      {actions && <div className="ml-auto flex shrink-0 items-center gap-2 sm:mt-5">{actions}</div>}
    </div>
  );
}

export function PeriodPresets({
  from,
  to,
  onSelect,
}: {
  from?: string;
  to?: string;
  onSelect: (from: string) => void;
}) {
  // No dia 1º "Hoje" e "Mês" começam no mesmo instante; marca só o primeiro.
  const selected = to ? undefined : PRESETS.find((p) => presetFrom(p.days) === from);

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">Período</span>
      <div role="group" aria-label="Período" className="inline-flex rounded-lg bg-muted p-0.5">
        {PRESETS.map((p) => {
          const isSelected = selected?.label === p.label;
          return (
            <button
              key={p.label}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onSelect(presetFrom(p.days))}
              className={cn(
                'h-7 whitespace-nowrap rounded-md px-2.5 text-xs font-medium transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                isSelected
                  ? 'bg-background text-foreground shadow-soft'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {p.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Rótulo visível em cima do controle; o `<label>` envolve o controle. */
export function FilterField({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label
      className={cn(
        // 104px de mínimo: seis campos + período + "Exportar CSV" cabem numa
        // linha só a partir de ~1100px de conteúdo.
        'flex min-w-[104px] max-w-[200px] flex-1 flex-col gap-1 text-xs font-medium text-muted-foreground',
        className,
      )}
    >
      {label}
      {children}
    </label>
  );
}
