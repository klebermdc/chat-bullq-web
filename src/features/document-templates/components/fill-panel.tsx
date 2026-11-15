import type { ReactNode } from 'react';
import { X } from 'lucide-react';

interface FillPanelProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/** Moldura dos painéis da barra de ações do preenchimento. */
export function FillPanel({ title, onClose, children }: FillPanelProps) {
  return (
    <section aria-label={title} className="space-y-3 rounded-xl border border-border bg-muted/40 p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>
      {children}
    </section>
  );
}
