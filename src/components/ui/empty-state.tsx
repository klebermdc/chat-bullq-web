import type { LucideIcon } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Estado vazio padrão: ícone, o que não existe ainda e o próximo passo.
 * No lugar de "Sem dados." solto no meio da tela.
 */
interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: ReactNode;
  /** Botão ou link com o próximo passo. */
  action?: ReactNode;
  /** `sm` para dentro de cartão ou painel. */
  size?: 'sm' | 'md';
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, size = 'md', className }: EmptyStateProps) {
  const compact = size === 'sm';
  return (
    <div className={cn('flex flex-col items-center justify-center text-center', compact ? 'py-8' : 'py-16', className)}>
      {Icon && (
        <span
          className={cn(
            'flex items-center justify-center rounded-xl bg-muted text-muted-foreground',
            compact ? 'h-9 w-9' : 'h-12 w-12',
          )}
        >
          <Icon aria-hidden="true" className={compact ? 'h-4 w-4' : 'h-5 w-5'} />
        </span>
      )}
      <p className={cn('font-medium text-foreground', Icon && 'mt-3', compact ? 'text-sm' : 'text-base')}>{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Carregamento de área inteira (lista, painel). Em botão use `<Button loading>`. */
export function LoadingState({ label = 'Carregando…', className }: { label?: string; className?: string }) {
  return (
    <div
      role="status"
      className={cn('flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground', className)}
    >
      <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
      {label}
    </div>
  );
}
