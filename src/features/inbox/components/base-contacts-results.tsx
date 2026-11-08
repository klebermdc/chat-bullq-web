'use client';

import { useQuery } from '@tanstack/react-query';
import { MessageSquarePlus, UserRound } from 'lucide-react';
import { contactsService, type Contact } from '@/features/contacts/services/contacts.service';
import { useOrgId } from '@/hooks/use-org-query-key';
import {
  BASE_FETCH_LIMIT,
  BASE_RESULTS_LIMIT,
  contactsWithoutConversation,
  formatPhoneBr,
  shouldSearchBase,
} from '../lib/base-contacts';

const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

interface BaseContactsResultsProps {
  /** Termo já com debounce — o mesmo da busca de conversas. */
  search: string;
  /** Abre o "Nova conversa" já preenchido com o contato. */
  onStart: (contact: Contact) => void;
}

/**
 * Clientes da base que casam a busca mas não têm conversa no Sendtur
 * (carteira antiga). Fica abaixo das conversas encontradas.
 */
export function BaseContactsResults({ search, onStart }: BaseContactsResultsProps) {
  const orgId = useOrgId();
  const term = search.trim();
  const enabled = !!orgId && shouldSearchBase(term);
  const { data, isError } = useQuery({
    queryKey: ['contacts', orgId, 'inbox-search', term],
    queryFn: () => contactsService.list({ search: term, limit: String(BASE_FETCH_LIMIT) }),
    enabled,
    staleTime: 30_000,
  });

  if (!enabled) return null;
  if (isError) {
    return (
      <p role="status" className="px-4 py-3 text-xs text-muted-foreground">
        Não deu para buscar na base de contatos agora.
      </p>
    );
  }
  const contacts = contactsWithoutConversation(data?.contacts ?? []).slice(0, BASE_RESULTS_LIMIT);
  if (contacts.length === 0) return null;

  return (
    <section aria-labelledby="base-contacts-title" className="border-t border-border">
      <h3
        id="base-contacts-title"
        className="px-4 pb-1 pt-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
      >
        Na base, sem conversa
      </h3>
      <ul>
        {contacts.map((contact) => (
          <li key={contact.id}>
            <button
              type="button"
              onClick={() => onStart(contact)}
              aria-label={`Iniciar conversa com ${contact.name || formatPhoneBr(contact.phone)}`}
              className={`flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-primary/5 ${FOCUS_RING}`}
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <UserRound aria-hidden="true" className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-foreground">
                  {contact.name || 'Sem nome'}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {formatPhoneBr(contact.phone) || contact.email || 'Sem telefone'}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-primary">
                <MessageSquarePlus aria-hidden="true" className="size-4" />
                Conversar
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
