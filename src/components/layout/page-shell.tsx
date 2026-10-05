'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { usePageTitle } from './use-page-title';

/**
 * Moldura única das páginas de topo: rolagem própria, largura máxima e
 * respiro iguais em todas, para o título cair sempre no mesmo x e y.
 *
 * Uso:
 *   <PageShell>
 *     <PageHeader title="Painel" description="Últimos 30 dias" actions={…} />
 *     <div className="mt-6">…</div>
 *   </PageShell>
 */
export function PageShell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="h-full min-h-0 overflow-y-auto">
      <div className={cn('mx-auto w-full max-w-7xl p-4 sm:p-6', className)}>{children}</div>
    </div>
  );
}

interface PageHeaderProps {
  /** Vai no `<h1>` e no título da aba ("Painel · Sendtur"). */
  title: string;
  description?: ReactNode;
  /** Ações da página, à direita do título; descem para baixo dele no mobile. */
  actions?: ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  usePageTitle(title);
  return (
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex min-w-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
