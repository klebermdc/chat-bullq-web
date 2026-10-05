'use client';

import { Fragment, useState } from 'react';
import type { ElementType, ReactNode } from 'react';
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { X, User, Tags, ShoppingBag, Briefcase, Check } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { contactsService } from '@/features/contacts/services/contacts.service';
import { pipelinesService, type ConversationCard } from '@/features/pipelines/services/pipelines.service';
import type { Conversation } from '@/features/inbox/services/inbox.service';
import { ContactIdentityFields } from './contact-identity-fields';
import { ConversationTagsEditor } from './conversation-tags-editor';
import { ClientRequestSection } from './client-request-section';
import { DownloadTranscriptButton } from './download-transcript-button';
import { AcceptanceStatusBlock } from '@/features/acceptances/components/acceptance-status-block';
import { getInitials } from '@/lib/initials';

interface ClientCardDrawerProps {
  conversation: Conversation;
  open: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

/** O mesmo avatar redondo e neutro do cabeçalho da conversa, só que maior. */
function DrawerAvatar({ name, avatarUrl }: { name: string | null; avatarUrl: string | null }) {
  const [failed, setFailed] = useState(false);
  const initials = getInitials(name);
  if (avatarUrl && !failed) {
    return (
      <img
        src={avatarUrl}
        alt=""
        onError={() => setFailed(true)}
        className="h-12 w-12 shrink-0 rounded-full bg-muted object-cover"
      />
    );
  }
  return (
    <div
      aria-hidden="true"
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted text-base font-medium text-muted-foreground"
    >
      {initials || <User className="h-5 w-5" />}
    </div>
  );
}

/** Cabeçalho de seção: quadradinho de ícone neutro + rótulo. Um desenho só para todas. */
function Section({ icon: Icon, title, children }: { icon: ElementType; title: string; children: ReactNode }) {
  return (
    <section>
      <div className="mb-2.5 flex items-center gap-2">
        <span aria-hidden="true" className="flex h-6 w-6 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />
        </span>
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
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
          <div className="fixed inset-0 bg-zinc-950/50" aria-hidden="true" />
        </TransitionChild>

        <div className="fixed inset-0 flex justify-end">
          <TransitionChild
            as={Fragment}
            enter="transform transition ease-[cubic-bezier(0.32,0.72,0,1)] duration-[350ms]" enterFrom="translate-x-full" enterTo="translate-x-0"
            leave="transform transition ease-in duration-200" leaveFrom="translate-x-0" leaveTo="translate-x-full"
          >
            <DialogPanel className="flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-border bg-card shadow-overlay">
              {/* ── Cabeçalho plano, igual ao dos diálogos ────────────── */}
              <div className="flex shrink-0 items-center gap-3 border-b border-border bg-card px-5 py-4">
                <DrawerAvatar name={conversation.contact.name} avatarUrl={conversation.contact.avatarUrl} />
                <div className="min-w-0 flex-1">
                  <DialogTitle as="h2" className="truncate text-base font-semibold leading-tight text-foreground">
                    {conversation.contact.name || conversation.contact.phone || 'Cliente'}
                  </DialogTitle>
                  {conversation.contact.phone && conversation.contact.name && (
                    <p className="mt-0.5 truncate font-mono text-xs tabular-nums text-muted-foreground">
                      {conversation.contact.phone}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Fechar ficha do cliente"
                  title="Fechar"
                  className="-mr-1.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <X aria-hidden="true" className="h-4 w-4" />
                </button>
              </div>

              {/* ── Conteúdo ──────────────────────────────────────────── */}
              <div className="flex-1 space-y-6 px-5 py-5">
                {isLoading || !contact ? (
                  <div className="space-y-4">
                    <Skeleton className="h-24 w-full rounded-xl" />
                    <Skeleton className="h-16 w-full rounded-xl" />
                    <Skeleton className="h-28 w-full rounded-xl" />
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

                    <AcceptanceStatusBlock conversationId={conversation.id} />

                    <Section icon={Briefcase} title="Negócio">
                      {deal ? (
                        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
                          <div className="flex items-center justify-between gap-2 px-4 py-3">
                            <span className="inline-flex min-w-0 items-center gap-2 text-sm">
                              <span
                                aria-hidden="true"
                                className="h-2.5 w-2.5 shrink-0 rounded-full"
                                style={{ backgroundColor: deal.stage?.color || '#8b5cf6' }}
                              />
                              <span className="truncate font-semibold text-foreground">{deal.pipeline.name}</span>
                            </span>
                            {deal.status === 'WON' ? (
                              <Badge variant="success">
                                <Check aria-hidden="true" className="h-3 w-3" /> Fechado
                              </Badge>
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
                        <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                          Nenhum negócio vinculado.
                        </div>
                      )}
                    </Section>

                    <DownloadTranscriptButton conversationId={conversation.id} />
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
