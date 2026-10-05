'use client';

import {
  Dialog as HeadlessDialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
  Description,
} from '@headlessui/react';
import { X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Diálogo padrão do app. Substitui os modais feitos à mão (`fixed inset-0`):
 * prende o foco, fecha com Esc e clique fora, devolve o foco a quem abriu e
 * usa sempre o mesmo fundo, raio e sombra.
 *
 * - `dismissible={false}` impede fechar sem querer quando há dado não salvo:
 *   clique fora não faz nada e o Esc pergunta "Descartar alterações?" em vez
 *   de fechar (o X e os botões do rodapé continuam funcionando).
 * - No celular ocupa a largura toda com margem de 16px e rola por dentro.
 */
const SIZES = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
  xl: 'sm:max-w-2xl',
  '2xl': 'sm:max-w-4xl',
} as const;

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  /** Botões de ação; alinhados à direita, o principal por último. */
  footer?: ReactNode;
  size?: keyof typeof SIZES;
  dismissible?: boolean;
  /** Classe extra para o corpo (ex.: `p-0` quando o conteúdo tem a própria borda). */
  bodyClassName?: string;
}

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  dismissible = true,
  bodyClassName,
}: DialogProps) {
  const [askDiscard, setAskDiscard] = useState(false);

  const closeNow = () => {
    setAskDiscard(false);
    onClose();
  };

  return (
    <HeadlessDialog
      open={open}
      // Esc e clique fora caem aqui. Com dado não salvo, em vez de ignorar
      // (o Headless tira o foco do campo e nada acontece), oferece descartar.
      onClose={dismissible ? onClose : () => setAskDiscard(true)}
      className="relative z-50"
    >
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-zinc-950/50 transition-opacity duration-200 data-[closed]:opacity-0"
      />
      <div className="fixed inset-0 flex items-end justify-center p-4 sm:items-center">
        <DialogPanel
          transition
          className={cn(
            'flex max-h-[calc(100dvh-2rem)] w-full flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-overlay',
            'transition duration-200 ease-out data-[closed]:translate-y-2 data-[closed]:opacity-0',
            SIZES[size],
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
            <div className="min-w-0">
              <DialogTitle className="text-base font-semibold text-foreground">{title}</DialogTitle>
              {description && (
                <Description className="mt-0.5 text-sm text-muted-foreground">{description}</Description>
              )}
            </div>
            <button
              type="button"
              onClick={closeNow}
              aria-label="Fechar"
              className="-mr-1.5 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
          {askDiscard && (
            <div
              role="alert"
              className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-warning-wash px-5 py-2.5 text-sm text-warning-ink"
            >
              <span>Descartar o que foi preenchido?</span>
              <span className="flex gap-2">
                <button
                  type="button"
                  autoFocus
                  onClick={() => setAskDiscard(false)}
                  className="rounded-lg border border-input bg-background px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Continuar editando
                </button>
                <button
                  type="button"
                  onClick={closeNow}
                  className="rounded-lg bg-destructive px-2.5 py-1 text-xs font-medium text-white hover:bg-destructive/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Descartar
                </button>
              </span>
            </div>
          )}
          <div className={cn('min-h-0 flex-1 overflow-y-auto px-5 py-4', bodyClassName)}>{children}</div>
          {footer && (
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border px-5 py-3">
              {footer}
            </div>
          )}
        </DialogPanel>
      </div>
    </HeadlessDialog>
  );
}
