'use client';

import { useState } from 'react';
import { Inbox, Lock, MailX, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState, LoadingState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';
import { useMailboxEmails, useMailboxes } from '../hooks/use-mailbox';
import { uniqueContacts } from '../lib/format';
import type { LinkedContact, Mailbox } from '../services/mailbox.service';
import { ContactEmailsDialog } from './contact-emails-dialog';
import { EmailList, EmailRow, LoadMoreButton } from './email-list';
import { EmailReaderDialog } from './email-reader-dialog';
import { SyncStatusLine } from './sync-status-line';

type Contact = LinkedContact['contact'];

/** Tela Reservas: a caixa inteira, com os clientes ligados a cada e-mail. */
export function MailboxScreen() {
  const mailboxes = useMailboxes();
  // Hoje só existe a reservas@; com mais caixas, entra um seletor aqui.
  const mailbox = mailboxes.data?.[0] ?? null;

  if (mailboxes.isLoading) return <LoadingState label="Carregando a caixa…" />;
  if (mailboxes.isError) {
    return (
      <EmptyState
        icon={Lock}
        title="Não foi possível abrir a caixa"
        description="Esta tela é só para o dono e os administradores. Se você é um deles, tente de novo em instantes."
        action={<Button variant="outline" onClick={() => mailboxes.refetch()}>Tentar de novo</Button>}
      />
    );
  }
  if (!mailbox) {
    return (
      <EmptyState
        icon={Inbox}
        title="Nenhuma caixa espelhada"
        description="A caixa reservas@ ainda não foi configurada para esta organização."
      />
    );
  }
  return <MailboxEmails mailbox={mailbox} />;
}

function MailboxEmails({ mailbox }: { mailbox: Mailbox }) {
  const [isUnlinkedOnly, setUnlinkedOnly] = useState(false);
  const [openEmailId, setOpenEmailId] = useState<string | null>(null);
  const [openContact, setOpenContact] = useState<Contact | null>(null);
  const query = useMailboxEmails(mailbox.id, isUnlinkedOnly);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SyncStatusLine mailbox={mailbox} />
        <LinkFilter isUnlinkedOnly={isUnlinkedOnly} onChange={setUnlinkedOnly} />
      </div>

      {query.isLoading ? (
        <LoadingState label="Carregando e-mails…" />
      ) : query.isError ? (
        <EmptyState
          icon={MailX}
          title="Não foi possível carregar os e-mails"
          action={<Button variant="outline" onClick={() => query.refetch()}>Tentar de novo</Button>}
        />
      ) : query.emails.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={isUnlinkedOnly ? 'Todo e-mail tem cliente' : 'Nenhum e-mail espelhado ainda'}
          description={
            isUnlinkedOnly
              ? 'Nenhum e-mail da caixa está sem cliente ligado.'
              : 'A primeira sincronização importa os últimos 12 meses, em rodadas de 5 minutos.'
          }
        />
      ) : (
        <div>
          <EmailList label="E-mails da caixa reservas@" className="shadow-soft">
            {query.emails.map((email) => (
              <EmailRow
                key={email.id}
                email={email}
                isSnippetShown
                onOpen={setOpenEmailId}
                footer={<ContactChips contacts={uniqueContacts(email.contacts)} onOpen={setOpenContact} />}
              />
            ))}
          </EmailList>
          <LoadMoreButton
            hasMore={!!query.hasNextPage}
            isLoading={query.isFetchingNextPage}
            onLoadMore={() => query.fetchNextPage()}
          />
        </div>
      )}

      <EmailReaderDialog emailId={openEmailId} onClose={() => setOpenEmailId(null)} />
      <ContactEmailsDialog contact={openContact} onClose={() => setOpenContact(null)} />
    </div>
  );
}

const FILTERS = [
  { isUnlinked: false, label: 'Todos' },
  { isUnlinked: true, label: 'Sem cliente' },
] as const;

/** Mesmo desenho do seletor de período: segmentado em pílula. */
function LinkFilter({ isUnlinkedOnly, onChange }: { isUnlinkedOnly: boolean; onChange: (v: boolean) => void }) {
  return (
    <div role="group" aria-label="Filtrar e-mails" className="inline-flex rounded-lg bg-muted p-0.5">
      {FILTERS.map((f) => {
        const isSelected = f.isUnlinked === isUnlinkedOnly;
        return (
          <button
            key={f.label}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onChange(f.isUnlinked)}
            className={cn(
              'h-9 whitespace-nowrap rounded-md px-3 text-xs font-medium transition-colors sm:h-7',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              isSelected ? 'bg-background text-foreground shadow-soft' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {f.label}
          </button>
        );
      })}
    </div>
  );
}

export function ContactChips({ contacts, onOpen }: { contacts: Contact[]; onOpen: (c: Contact) => void }) {
  if (contacts.length === 0) {
    return <span className="text-xs text-muted-foreground">Sem cliente ligado</span>;
  }
  return (
    <ul aria-label="Clientes ligados" className="flex flex-wrap gap-1.5">
      {contacts.map((contact) => (
        <li key={contact.id}>
          <button
            type="button"
            onClick={() => onOpen(contact)}
            className="inline-flex max-w-56 items-center gap-1 rounded-full bg-primary/12 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <UserRound aria-hidden="true" className="h-3 w-3 shrink-0" />
            <span className="truncate">{contact.name || 'Cliente sem nome'}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
