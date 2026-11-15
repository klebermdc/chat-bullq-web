'use client';

import { useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AtSign, MailX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { contactsService } from '@/features/contacts/services/contacts.service';
import { useContactEmails } from '../hooks/use-mailbox';
import type { EmailSummary } from '../services/mailbox.service';
import { EmailList, EmailRow, LoadMoreButton } from './email-list';
import { EmailReaderDialog } from './email-reader-dialog';

export const NO_EMAILS_TEXT = 'Nenhum e-mail do reservas@ para este cliente';
export const NO_CONTACT_EMAIL_TEXT = 'Cadastre o e-mail do cliente para ver os e-mails do reservas@';
const SKELETON_ROWS = 3;

interface ContactEmailsViewProps {
  emails: EmailSummary[];
  isLoading: boolean;
  isError: boolean;
  /** false = o cliente não tem e-mail cadastrado; undefined = ainda não se sabe. */
  hasContactEmail: boolean | undefined;
  hasMore: boolean;
  isFetchingMore: boolean;
  onLoadMore: () => void;
  onRetry: () => void;
  onOpen: (emailId: string) => void;
}

/** Parte visual da seção, sem dados: lista, vazio, erro e carregando. */
export function ContactEmailsView(props: ContactEmailsViewProps) {
  const { emails, isLoading, isError, hasContactEmail } = props;

  if (isLoading) {
    return (
      <div className="space-y-2" role="status" aria-label="Carregando e-mails">
        {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <EmptyState
        size="sm"
        icon={MailX}
        title="Não foi possível carregar os e-mails"
        action={
          <Button variant="outline" size="sm" onClick={props.onRetry}>
            Tentar de novo
          </Button>
        }
      />
    );
  }

  if (emails.length === 0) {
    const hasNoEmail = hasContactEmail === false;
    return (
      <div className="rounded-xl border border-dashed border-border">
        <EmptyState size="sm" icon={hasNoEmail ? AtSign : MailX} title={hasNoEmail ? NO_CONTACT_EMAIL_TEXT : NO_EMAILS_TEXT} />
      </div>
    );
  }

  return (
    <div>
      <EmailList label="E-mails do cliente">
        {emails.map((email) => (
          <EmailRow key={email.id} email={email} onOpen={props.onOpen} />
        ))}
      </EmailList>
      <LoadMoreButton hasMore={props.hasMore} isLoading={props.isFetchingMore} onLoadMore={props.onLoadMore} />
    </div>
  );
}

interface ContactEmailsSectionProps {
  contactId: string | null | undefined;
  enabled?: boolean;
  /** Embrulho da seção (cada tela tem o seu `Section`). */
  wrap?: (content: ReactNode) => ReactNode;
}

/**
 * E-mails da caixa reservas@ ligados ao cliente, mais novos primeiro.
 * Usado na gaveta do cliente (Inbox), na ficha do funil e na tela Reservas.
 */
export function ContactEmailsSection({ contactId, enabled = true, wrap = (c) => c }: ContactEmailsSectionProps) {
  const [openEmailId, setOpenEmailId] = useState<string | null>(null);
  const query = useContactEmails(contactId, enabled);
  const isEmpty = query.isSuccess && query.emails.length === 0;

  // Só na lista vazia importa saber se há e-mail cadastrado. Mesma chave da
  // gaveta do cliente: lá o contato já está em cache e não sai outra chamada.
  const { data: contact } = useQuery({
    queryKey: ['contact', contactId],
    queryFn: () => contactsService.getById(contactId as string),
    enabled: enabled && isEmpty && !!contactId,
  });

  if (!contactId) return null;

  return (
    <>
      {wrap(
        <ContactEmailsView
          emails={query.emails}
          isLoading={query.isLoading}
          isError={query.isError}
          hasContactEmail={contact ? !!contact.email?.trim() : undefined}
          hasMore={!!query.hasNextPage}
          isFetchingMore={query.isFetchingNextPage}
          onLoadMore={() => query.fetchNextPage()}
          onRetry={() => query.refetch()}
          onOpen={setOpenEmailId}
        />,
      )}
      <EmailReaderDialog emailId={openEmailId} onClose={() => setOpenEmailId(null)} />
    </>
  );
}
