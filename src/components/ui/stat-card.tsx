import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Cartão de número — um desenho só para Dashboard, Relatórios de Vendas e
 * Relatórios de CRM. Rótulo pequeno em caixa alta, valor em tinta de texto
 * (nunca colorido) e ícone neutro: a cor fica para o que é estado ou série.
 * Estado ("Crítico", "Tudo certo") entra em `badge`, com palavra.
 */
interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  icon?: LucideIcon;
  /** Selo de estado no canto, no lugar do ícone (ex.: `<Badge variant="urgent">`). */
  badge?: ReactNode;
  /** `sm` para fileiras densas de 5–6 métricas. */
  size?: 'sm' | 'md';
  className?: string;
}

export function StatCard({ label, value, hint, icon: Icon, badge, size = 'md', className }: StatCardProps) {
  const compact = size === 'sm';
  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card shadow-soft',
        compact ? 'p-3.5' : 'p-5',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p
          title={label}
          className="min-w-0 truncate text-xs font-medium uppercase tracking-wider text-muted-foreground"
        >
          {label}
        </p>
        {badge ? (
          <span className="shrink-0">{badge}</span>
        ) : (
          Icon && (
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Icon aria-hidden="true" className="h-4 w-4" />
            </span>
          )
        )}
      </div>
      <p
        className={cn(
          'font-bold tabular-nums tracking-tight text-foreground',
          compact ? 'mt-1 text-xl' : 'mt-2 text-2xl sm:text-3xl',
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
