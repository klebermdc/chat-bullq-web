'use client';

import { Fragment, useState } from 'react';
import type { ElementType, ReactNode } from 'react';
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { X, User, Tags, ShoppingBag, Briefcase, Phone } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { contactsService } from '@/features/contacts/services/contacts.service';
import { pipelinesService, type ConversationCard } from '@/features/pipelines/services/pipelines.service';
import type { Conversation } from '@/features/inbox/services/inbox.service';
import { ContactIdentityFields } from './contact-identity-fields';
import { ConversationTagsEditor } from './conversation-tags-editor';
import { ClientRequestSection } from './client-request-section';

interface ClientCardDrawerProps {
  conversation: Conversation;
  open: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

function DrawerAvatar({ name, avatarUrl }: { name: string | null; avatarUrl: string | null }) {
  const [failed, setFailed] = useState(false);
  const initials = name?.slice(0, 2).toUpperCase() || '??';
  const ring = 'h-16 w-16 shrink-0 rounded-2xl ring-4 ring-card shadow-lg';
  if (avatarUrl && !failed) {
    return <img src={avatarUrl} alt={name || 'avatar'} onError={() => setFailed(true)} className={`${ring} bg-muted object-cover`} />;
  }
  return (
    <div className={`${ring} flex items-center justify-center bg-gradient-to-br from-primary to-primary/60 text-xl font-bold text-primary-foreground`}>
      {initials}
    </div>
  );
}

/** Cabeçalho de seção: chip de ícone tingido da marca + rótulo. */
function Section({ icon: Icon, title, children }: { icon: ElementType; title: string; children: ReactNode }) {
  return (
    <section>
      <div className="mb-2.5 flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-3.5 w-3.5" />
        </span>
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{title}</h3>
      </div>
      {children}
    </section>
  );
}

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
  // Tags da CONVERSA (inclui as automáticas: origem, atendente, IA).
  const conversationTags = conversation.tags?.map((t) => t.tag) ?? [];

  return (
    <Transition show={open} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-[60]">
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100"
          leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />
        </TransitionChild>

        <div className="fixed inset-0 flex justify-end">
          <TransitionChild
            as={Fragment}
            enter="transform transition ease-[cubic-bezier(0.32,0.72,0,1)] duration-[350ms]" enterFrom="translate-x-full" enterTo="translate-x-0"
            leave="transform transition ease-in duration-200" leaveFrom="translate-x-0" leaveTo="translate-x-full"
          >
            <DialogPanel className="flex h-full w-full max-w-md flex-col overflow-y-auto bg-card shadow-2xl">
              {/* ── Header com atmosfera da marca ─────────────────────── */}
              <div className="relative shrink-0 overflow-hidden border-b border-border">
                <div aria-hidden className="absolute inset-0 bg-gradient-to-br from-primary/25 via-primary/[0.08] to-transparent" />
                <div aria-hidden className="absolute -right-10 -top-12 h-44 w-44 rounded-full bg-primary/20 blur-3xl" />
                <div className="relative flex items-center gap-4 px-5 pb-5 pt-6">
                  <DrawerAvatar name={conversation.contact.name} avatarUrl={conversation.contact.avatarUrl} />
                  <div className="min-w-0 flex-1">
                    <DialogTitle as="p" className="truncate text-lg font-bold leading-tight text-foreground">
                      {conversation.contact.name || conversation.contact.phone || 'Cliente'}
                    </DialogTitle>
                    {conversation.contact.phone && (
                      <p className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                        <Phone className="h-3 w-3" /> {conversation.contact.phone}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Fechar"
                    className="shrink-0 self-start rounded-full bg-card/70 p-2 text-muted-foreground shadow-sm backdrop-blur transition-colors hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* ── Conteúdo ──────────────────────────────────────────── */}
              <div className="flex-1 space-y-6 px-5 py-6">
                {isLoading || !contact ? (
                  <div className="space-y-4">
                    <Skeleton className="h-24 w-full rounded-2xl" />
                    <Skeleton className="h-16 w-full rounded-2xl" />
                    <Skeleton className="h-28 w-full rounded-2xl" />
                  </div>
                ) : (
                  <>
                    <Section icon={User} title="Identidade">
                      <ContactIdentityFields contact={contact} onSaved={handleChanged} />
                    </Section>

                    <Section icon={Tags} title="Tags">
                      <ConversationTagsEditor conversationId={conversation.id} initialTags={conversationTags} onChanged={handleChanged} />
                    </Section>

                    <Section icon={ShoppingBag} title="O que está pedindo">
                      <ClientRequestSection contact={contact} conversationId={conversation.id} onSaved={handleChanged} />
                    </Section>

                    <Section icon={Briefcase} title="Negócio">
                      {deal ? (
                        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                          <div className="flex items-center justify-between gap-2 px-4 py-3">
                            <span className="inline-flex min-w-0 items-center gap-2 text-sm">
                              <span
                                className="h-2.5 w-2.5 shrink-0 rounded-full"
                                style={{ backgroundColor: deal.stage?.color || '#8b5cf6' }}
                              />
                              <span className="truncate font-semibold text-foreground">{deal.pipeline.name}</span>
                            </span>
                            {deal.status === 'WON' ? (
                              <Badge variant="success">✓ Fechado</Badge>
                            ) : deal.status === 'LOST' ? (
                              <Badge variant="neutral">Perdido</Badge>
                            ) : (
                              <Badge variant="brand">Ativo</Badge>
                            )}
                          </div>
                          <div className="flex items-center justify-between border-t border-border/60 px-4 py-2.5 text-sm">
                            <span className="text-muted-foreground">Etapa</span>
                            <span className="font-medium text-foreground">{deal.stage.name}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
                          Nenhum negócio vinculado.
                        </div>
                      )}
                    </Section>
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
