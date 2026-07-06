'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, NotebookPen, X } from 'lucide-react';
import { contactsService } from '../services/contacts.service';

const textareaCls =
  'flex w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm leading-relaxed ring-offset-background placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 resize-none';

interface ContactNotesDialogProps {
  open: boolean;
  onClose: () => void;
  contactId: string;
  contactName?: string | null;
  /** Chamado após salvar com sucesso (pra refetch/atualizar indicador). */
  onSaved?: () => void;
}

export function ContactNotesDialog({
  open,
  onClose,
  contactId,
  contactName,
  onSaved,
}: ContactNotesDialogProps) {
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Carrega o notes fresco toda vez que o dialog abre (fonte da verdade p/ edição).
  useEffect(() => {
    if (!open) return;
    let active = true;
    setIsLoading(true);
    setNotes('');
    contactsService
      .getById(contactId)
      .then((c) => {
        if (active) setNotes(c.notes ?? '');
      })
      .catch((err) => {
        if (active) toast.error(err instanceof Error ? err.message : 'Erro ao carregar observações');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [open, contactId]);

  // Fecha no Esc.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await contactsService.update(contactId, { notes: notes.trim() || null });
      toast.success('Observação salva');
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar observação');
    } finally {
      setIsSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-50 w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-zinc-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <NotebookPen className="h-5 w-5 shrink-0 text-primary" />
            <h2 className="truncate text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Observações{contactName ? ` — ${contactName}` : ''}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-md p-1 text-zinc-400 hover:text-zinc-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-1 text-xs text-zinc-500">
          Anotações internas sobre este lead. Ficam salvas no contato e aparecem em qualquer conversa com ele.
        </p>

        <div className="mt-4">
          {isLoading ? (
            <div className="flex h-40 items-center justify-center text-zinc-400">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (
            <textarea
              autoFocus
              placeholder="Anotações sobre o lead..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={7}
              className={textareaCls}
            />
          )}
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isLoading || isSaving}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
