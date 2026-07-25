'use client';

import { Fragment } from 'react';
import { Dialog, DialogPanel, Transition, TransitionChild } from '@headlessui/react';
import { X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { contactsService } from '@/features/contacts/services/contacts.service';
import { pipelinesService, type ConversationCard } from '@/features/pipelines/services/pipelines.service';
import type { Conversation } from '@/features/inbox/services/inbox.service';
import { ContactIdentityFields } from './contact-identity-fields';
import { ContactTagsEditor } from './contact-tags-editor';
import { ClientRequestSection } from './client-request-section';

interface ClientCardDrawerProps {
  conversation: Conversation;
  open: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

function DrawerAvatar({ name, avatarUrl }: { name: string | null; avatarUrl: string | null }) {
  const initials = name?.slice(0, 2).toUpperCase() || '??';
  if (avatarUrl) {
    return <img src={avatarUrl} alt={name || 'avatar'} className="h-14 w-14 shrink-0 rounded-full bg-muted object-cover" />;
  }
  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-muted text-lg font-semibold text-muted-foreground">
      {initials}
    </div>
  );
}

const sectionTitle = 'mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground';
const rowCls = 'flex items-center justify-between border-b border-border/60 py-2 text-sm';

export function ClientCardDrawer({ conversation, open, onClose, onUpdate }: ClientCardDrawerProps) {
  const contactId = conversation.contactId;

  const { data: contact, isLoading, refetch } = useQuery({
    queryKey: ['contact', contactId],
    queryFn: () => contactsService.getById(contactId),
    enabled: open && !!contactId,
  });

  const { data: cards } = useQuery({
    queryKey: ['conversation-cards', conversation.id],
    queryFn: () => pipelinesService.listByConversation(conversation.id),
    enabled: open,
  });
  const deal: ConversationCard | undefined = cards?.find((c) => c.status === 'WON') ?? cards?.[0];

  const handleChanged = () => { refetch(); onUpdate(); };
  const selectedTagIds = contact?.tags?.map((t) => t.tag.id) ?? [];

  return (
    <Transition show={open} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-[60]">
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100"
          leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true" />
        </TransitionChild>

        <div className="fixed inset-0 flex justify-end">
          <TransitionChild
            as={Fragment}
            enter="transform transition ease-out duration-300" enterFrom="translate-x-full" enterTo="translate-x-0"
            leave="transform transition ease-in duration-200" leaveFrom="translate-x-0" leaveTo="translate-x-full"
          >
            <DialogPanel className="flex h-full w-full max-w-md flex-col overflow-y-auto bg-card shadow-2xl">
              {/* Header com gradiente sutil da marca */}
              <div className="sticky top-0 z-10 flex items-start gap-3 border-b border-border bg-gradient-to-br from-primary/10 via-card to-card px-5 py-4 backdrop-blur">
                <DrawerAvatar name={conversation.contact.name} avatarUrl={conversation.contact.avatarUrl} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-semibold text-foreground">
                    {conversation.contact.name || conversation.contact.phone || 'Cliente'}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">Ficha do cliente</p>
                </div>
                <button onClick={onClose} aria-label="Fechar" className="rounded-md p-1.5 text-muted-foreground hover:bg-muted">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 space-y-6 px-5 py-5">
                {isLoading || !contact ? (
                  <div className="space-y-3">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-2/3" />
                  </div>
                ) : (
                  <>
                    <section>
                      <h3 className={sectionTitle}>Identidade</h3>
                      <ContactIdentityFields contact={contact} onSaved={handleChanged} />
                    </section>

                    <section>
                      <h3 className={sectionTitle}>Tags do cliente</h3>
                      <ContactTagsEditor contactId={contactId} selectedIds={selectedTagIds} onChanged={handleChanged} />
                    </section>

                    <section>
                      <h3 className={sectionTitle}>O que está pedindo</h3>
                      <ClientRequestSection contact={contact} conversationId={conversation.id} onSaved={handleChanged} />
                    </section>

                    <section>
                      <h3 className={sectionTitle}>Negócio</h3>
                      {deal ? (
                        <div>
                          <div className={rowCls}>
                            <span className="text-muted-foreground">Status</span>
                            {deal.status === 'WON' ? (
                              <Badge variant="success">✓ Fechado</Badge>
                            ) : deal.status === 'LOST' ? (
                              <Badge variant="neutral">Perdido</Badge>
                            ) : (
                              <Badge variant="brand">{deal.stage.name}</Badge>
                            )}
                          </div>
                          <div className={rowCls}>
                            <span className="text-muted-foreground">Pipeline</span>
                            <span className="font-semibold">{deal.pipeline.name}</span>
                          </div>
                          <div className={rowCls}>
                            <span className="text-muted-foreground">Etapa</span>
                            <span className="font-semibold">{deal.stage.name}</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Nenhum negócio vinculado.</p>
                      )}
                    </section>
                  </>
                )}
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  );
}
