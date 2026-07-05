'use client';

import { Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react';
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
        className="fixed inset-0 bg-black/40 transition-opacity data-[closed]:opacity-0 data-[enter]:duration-200 data-[leave]:duration-150"
      />
      <div className="fixed inset-x-0 bottom-0 flex justify-center">
        <DialogPanel
          transition
          className="w-full max-w-lg rounded-t-2xl bg-white pb-[env(safe-area-inset-bottom)] shadow-xl transition duration-200 ease-out data-[closed]:translate-y-full dark:bg-zinc-900"
        >
          <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-zinc-300 dark:bg-zinc-700" />
          {title && (
            <div className="px-4 pb-2 pt-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {title}
            </div>
          )}
          <div className="max-h-[75vh] overflow-y-auto pb-2">{children}</div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
