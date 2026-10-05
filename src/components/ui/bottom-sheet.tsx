'use client';

import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

/**
 * Folha inferior mobile. Usada no menu de ações do chat, no "Mais" da tab bar
 * e no painel de filtros. Só faz sentido em telas pequenas, mas não se
 * auto-limita — quem chama decide quando abrir (tipicamente < lg).
 */
export function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  return (
    <Dialog open={open} onClose={onClose} className="relative z-50 lg:hidden">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-zinc-950/50 transition-opacity data-[closed]:opacity-0 data-[enter]:duration-200 data-[leave]:duration-150"
      />
      <div className="fixed inset-x-0 bottom-0 flex justify-center">
        <DialogPanel
          transition
          className="w-full max-w-lg rounded-t-2xl border-t border-border bg-card pb-[env(safe-area-inset-bottom)] text-card-foreground shadow-overlay transition duration-200 ease-out data-[closed]:translate-y-full"
        >
          <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-zinc-300 dark:bg-zinc-700" />
          <div className="flex items-center justify-between gap-2 px-4 pb-1 pt-2">
            <DialogTitle className={title ? 'text-sm font-semibold text-foreground' : 'sr-only'}>
              {title ?? 'Ações'}
            </DialogTitle>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
          <div className="max-h-[75vh] overflow-y-auto pb-2">{children}</div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
