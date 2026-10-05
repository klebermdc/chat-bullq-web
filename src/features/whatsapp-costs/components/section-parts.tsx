import type { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { getErrorMessage } from '@/lib/errors';
import { cn } from '@/lib/utils';

const CARD_CLS = 'min-w-0 rounded-xl border border-border bg-card shadow-soft';
const CARD_PADDING = 'p-4 sm:p-5';

/**
 * Cartão da tela: título, subtítulo e ação opcional. `flush` é para tabela,
 * que vai de borda a borda (o cartão corta os cantos e a tabela rola dentro).
 */
export function SectionCard({
  title,
  subtitle,
  actions,
  flush = false,
  className,
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  flush?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn(CARD_CLS, flush ? 'overflow-hidden' : CARD_PADDING, className)}>
      <div className={cn('flex flex-wrap items-start justify-between gap-2', flush && CARD_PADDING)}>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {actions}
      </div>
      <div className={flush ? 'border-t border-border' : 'mt-4'}>{children}</div>
    </section>
  );
}

/** Cartão sem título, para o carregamento, o vazio e o erro de uma seção inteira. */
export function StateCard({ children }: { children: ReactNode }) {
  return <div className={cn(CARD_CLS, 'px-4')}>{children}</div>;
}

/**
 * Moldura de gráfico: dá a altura para o `ResponsiveContainer` e o resumo em
 * texto para leitor de tela (o SVG do Recharts não diz nada sozinho).
 */
export function ChartFrame({
  summary,
  className = 'h-64',
  children,
}: {
  summary: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div role="img" aria-label={summary} className={cn('w-full min-w-0', className)}>
      {children}
    </div>
  );
}

export function SectionError({
  title,
  error,
  onRetry,
  isRetrying,
}: {
  title: string;
  error: unknown;
  onRetry: () => void;
  isRetrying: boolean;
}) {
  return (
    <div role="alert">
      <EmptyState
        size="sm"
        icon={AlertTriangle}
        title={title}
        description={getErrorMessage(error, 'Não foi possível falar com o servidor.')}
        action={
          <Button variant="outline" onClick={onRetry} loading={isRetrying}>
            Tentar de novo
          </Button>
        }
      />
    </div>
  );
}
