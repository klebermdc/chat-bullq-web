'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { NotebookPen } from 'lucide-react';
import { contactsService } from '../services/contacts.service';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { controlCls } from '@/components/ui/control';
import { LoadingState } from '@/components/ui/empty-state';

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
    <Dialog
      open
      onClose={onClose}
      // Há texto digitado: Esc e clique fora não fecham (o X e "Cancelar" sim).
      dismissible={false}
      size="lg"
      title={
        <span className="flex items-center gap-2">
          <NotebookPen aria-hidden="true" className="h-4 w-4 shrink-0 text-primary" />
          <span className="min-w-0 break-words">
            Observações{contactName ? ` · ${contactName}` : ''}
          </span>
        </span>
      }
      description="Anotações internas sobre este lead. Ficam salvas no contato e aparecem em qualquer conversa com ele."
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSave} disabled={isLoading} loading={isSaving}>
            Salvar
          </Button>
        </>
      }
    >
      {isLoading ? (
        <LoadingState className="h-40" />
      ) : (
        <textarea
          autoFocus
          aria-label="Observações do contato"
          placeholder="Anotações sobre o lead…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={7}
          className={`${controlCls} h-auto w-full resize-none py-2 leading-relaxed`}
        />
      )}
    </Dialog>
  );
}
