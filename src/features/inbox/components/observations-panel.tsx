'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, NotebookPen, X } from 'lucide-react';
import { contactsService } from '@/features/contacts/services/contacts.service';

const textareaCls =
  'flex w-full flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm leading-relaxed ring-offset-background placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 resize-none';

interface ObservationsPanelProps {
  contactId: string;
  contactName?: string | null;
  onClose: () => void;
}

/**
 * Painel Observações: mostra e edita as anotações internas do contato
 * (Contact.notes) direto na lateral direita do Inbox, sem precisar abrir o
 * popup ContactNotesDialog. Carrega o notes fresco ao montar (fonte da
 * verdade pra edição) e salva via PATCH /contacts/:id.
 */
export function ObservationsPanel({ contactId, contactName, onClose }: ObservationsPanelProps) {
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
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
  }, [contactId]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await contactsService.update(contactId, { notes: notes.trim() || null });
      toast.success('Observação salva');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar observação');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <aside className="hidden w-[320px] shrink-0 flex-col overflow-y-auto border-l border-border bg-card p-4 lg:flex">
      <div className="mb-3 flex items-center justify-between">
        <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-primary">
          <NotebookPen className="h-4 w-4" /> Observações
        </span>
        <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-muted">
          <X className="h-4 w-4" />
        </button>
      </div>

      <p className="mb-3 text-xs text-muted-foreground">
        Anotações internas sobre {contactName || 'este lead'}. Ficam salvas no contato e aparecem em
        qualquer conversa com ele.
      </p>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : (
        <textarea
          placeholder="Anotações sobre o lead..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={12}
          className={textareaCls}
        />
      )}

      <div className="mt-3 flex justify-end">
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
    </aside>
  );
}
