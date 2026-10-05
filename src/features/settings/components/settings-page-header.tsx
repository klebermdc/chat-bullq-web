import type { ReactNode } from 'react';

/**
 * Cabeçalho único das sub-páginas de Configurações: título, descrição e a
 * ação principal da página alinhada à direita. O h1 "Configurações" já vem
 * do layout, por isso aqui é h2 e sem ícone.
 */
interface SettingsPageHeaderProps {
  title: string;
  description?: ReactNode;
  /** Ação principal da página (um `<Button>`). */
  action?: ReactNode;
}

export function SettingsPageHeader({ title, description, action }: SettingsPageHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}

/** Cartão de seção das telas de Configurações. */
export const settingsCardCls = 'rounded-xl border border-border bg-card p-5 shadow-soft';
/** Título e texto de ajuda de uma seção. */
export const settingsCardTitleCls = 'text-sm font-medium text-foreground';
export const settingsCardHelpCls = 'text-xs text-muted-foreground';
