'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { controlCls } from '@/components/ui/control';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { inboxService, type Conversation } from '../services/inbox.service';
import { getErrorMessage } from '@/lib/errors';

interface Props {
  conversation: Conversation;
  open: boolean;
  onClose: () => void;
}

/**
 * Renames the contact (visible to anyone in the org viewing this contact)
 * and/or sets a per-conversation subject (internal nickname — only the
 * inbox shows it, the customer never sees it).
 */
export function RenameConversationDialog({ conversation, open, onClose }: Props) {
  const queryClient = useQueryClient();
  const [contactName, setContactName] = useState(
    conversation.contact?.name ?? '',
  );
  const [subject, setSubject] = useState(conversation.subject ?? '');
  const [saving, setSaving] = useState(false);

  // Reset state when opening with a different conversation.
  useEffect(() => {
    if (open) {
      setContactName(conversation.contact?.name ?? '');
      setSubject(conversation.subject ?? '');
    }
  }, [open, conversation]);

  const originalContactName = conversation.contact?.name ?? '';
  const originalSubject = conversation.subject ?? '';
  const contactDirty = contactName.trim() !== originalContactName.trim();
  const subjectDirty = subject.trim() !== originalSubject.trim();
  const dirty = contactDirty || subjectDirty;

  const handleSave = async () => {
    if (!dirty) return onClose();
    setSaving(true);
    try {
      const promises: Promise<unknown>[] = [];
      if (contactDirty && conversation.contact?.id) {
        promises.push(
          inboxService.renameContact(
            conversation.contact.id,
            contactName.trim(),
          ),
        );
      }
      if (subjectDirty) {
        promises.push(
          inboxService.updateConversation(conversation.id, {
            subject: subject.trim() || null,
          }),
        );
      }
      await Promise.all(promises);
      toast.success('Atualizado');
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['conversation', conversation.id] });
      if (conversation.contact?.id) {
        queryClient.invalidateQueries({
          queryKey: ['contact', conversation.contact.id],
        });
      }
      onClose();
    } catch (err: any) {
      toast.error(getErrorMessage(err, 'Erro ao salvar'));
    } finally {
      setSaving(false);
    }
  };

  // Não fecha no meio do salvamento (igual ao modal antigo).
  const close = () => {
    if (!saving) onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Renomear"
      // Com alteração não salva, Esc/clique fora não fecham sem querer.
      dismissible={!dirty}
      footer={
        <>
          <Button type="button" variant="outline" onClick={close} disabled={saving}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSave} disabled={!dirty} loading={saving}>
            Salvar
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label htmlFor="rename-contact-name" className="block text-sm font-medium text-foreground">
            Nome do contato
          </label>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Aparece para todo o time. Não muda nada do lado do cliente.
          </p>
          <input
            id="rename-contact-name"
            type="text"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            disabled={saving}
            placeholder={conversation.contact?.phone ?? 'Sem nome'}
            className={`${controlCls} mt-1.5 w-full`}
            autoFocus
          />
        </div>

        <div>
          <label htmlFor="rename-subject" className="block text-sm font-medium text-foreground">
            Apelido da conversa{' '}
            <span className="font-normal text-muted-foreground">(opcional)</span>
          </label>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Só aparece para você na caixa de entrada — o cliente não vê.
          </p>
          <input
            id="rename-subject"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            disabled={saving}
            placeholder="Ex.: liberou ontem, aguardando feedback"
            maxLength={120}
            className={`${controlCls} mt-1.5 w-full`}
          />
        </div>
      </div>
    </Dialog>
  );
}
