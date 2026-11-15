'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { MessageCircle } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { contactsService } from '@/features/contacts/services/contacts.service';
import { ContactEmailsSection } from './contact-emails-section';

interface ContactEmailsDialogProps {
  contact: { id: string; name: string | null } | null;
  onClose: () => void;
}

/**
 * Cliente aberto a partir de um chip da tela Reservas: quem é, atalho para a
 * conversa mais recente e os e-mails dele.
 */
export function ContactEmailsDialog({ contact, onClose }: ContactEmailsDialogProps) {
  const contactId = contact?.id ?? null;
  const { data: detail, isLoading } = useQuery({
    queryKey: ['contact', contactId],
    queryFn: () => contactsService.getById(contactId as string),
    enabled: !!contactId,
  });
  // A API devolve as conversas mais novas primeiro (até 10).
  const latestConversationId: string | undefined = detail?.conversations?.[0]?.id;
  const name = detail?.name || contact?.name || detail?.phone || 'Cliente';
  const details = [detail?.phone, detail?.email].filter(Boolean).join(' · ');

  return (
    <Dialog
      open={!!contact}
      onClose={onClose}
      title={name}
      description={isLoading ? 'Carregando…' : details || undefined}
      size="lg"
      footer={
        latestConversationId ? (
          <Link
            href={`/inbox?conversationId=${latestConversationId}`}
            className={buttonVariants({ variant: 'primary', size: 'md' })}
          >
            <MessageCircle aria-hidden="true" className="h-4 w-4" />
            Abrir conversa
          </Link>
        ) : undefined
      }
    >
      <ContactEmailsSection contactId={contactId} enabled={!!contact} />
    </Dialog>
  );
}
