'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, X, Search, Check, User } from 'lucide-react';
import { channelsService } from '@/features/channels/services/channels.service';
import { contactsService, type Contact } from '@/features/contacts/services/contacts.service';
import { conversationsService } from '@/features/conversations/services/conversations.service';
import { tagsService } from '@/features/settings/services/tags.service';
import { TagMultiSelect } from '@/features/contacts/components/tag-multi-select';
import { useOrgId } from '@/hooks/use-org-query-key';

const inputCls =
  'flex h-10 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100';
const labelCls = 'text-sm font-medium text-zinc-700 dark:text-zinc-300';

interface NewConversationDialogProps {
  open: boolean;
  onClose: () => void;
  /** Called with the newly created conversation's id — caller opens it. */
  onCreated: (conversationId: string) => void;
}

export function NewConversationDialog({ open, onClose, onCreated }: NewConversationDialogProps) {
  const orgId = useOrgId();
  const [channelId, setChannelId] = useState('');
  const [recipientMode, setRecipientMode] = useState<'contact' | 'phone'>('phone');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [contactSearch, setContactSearch] = useState('');
  const [debouncedContactSearch, setDebouncedContactSearch] = useState('');
  const [showContactResults, setShowContactResults] = useState(false);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const { data: channels = [] } = useQuery({
    queryKey: ['channels', orgId],
    queryFn: () => channelsService.list(),
    enabled: open,
  });

  const zappfyChannels = channels.filter((c) => c.type === 'WHATSAPP_ZAPPFY');

  const handleContactSearchChange = useCallback((value: string) => {
    setContactSearch(value);
    setShowContactResults(true);
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedContactSearch(value), 300);
  }, []);

  useEffect(() => {
    return () => clearTimeout(debounceTimer.current);
  }, []);

  const { data: contactResults } = useQuery({
    queryKey: ['contacts-search', orgId, debouncedContactSearch],
    queryFn: () => contactsService.list({ search: debouncedContactSearch }),
    enabled: open && recipientMode === 'contact' && debouncedContactSearch.trim().length > 0,
  });

  // Default the channel selector to the first Zappfy channel once loaded.
  useEffect(() => {
    if (!channelId && zappfyChannels.length > 0) {
      setChannelId(zappfyChannels[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zappfyChannels.length]);

  const resetForm = () => {
    setChannelId('');
    setRecipientMode('phone');
    setPhone('');
    setName('');
    setEmail('');
    setNotes('');
    setTagIds([]);
    setSelectedContact(null);
    setContactSearch('');
    setDebouncedContactSearch('');
    setShowContactResults(false);
    setMessage('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handlePickContact = (contact: Contact) => {
    setSelectedContact(contact);
    setContactSearch(contact.name || contact.phone || '');
    setShowContactResults(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelId) {
      toast.error('Selecione um canal Zappfy');
      return;
    }
    if (!selectedContact && !phone.trim()) {
      toast.error('Informe um número ou selecione um contato');
      return;
    }
    if (!message.trim()) {
      toast.error('Escreva uma mensagem');
      return;
    }

    setIsLoading(true);
    try {
      const { conversationId, contactId } = await conversationsService.start({
        channelId,
        ...(selectedContact
          ? { contactId: selectedContact.id }
          : {
              phone: phone.trim(),
              name: name.trim() || undefined,
              email: email.trim() || undefined,
              notes: notes.trim() || undefined,
            }),
        message: message.trim(),
      });
      // Tags só se aplicam a um lead novo (número digitado), não a contato já escolhido.
      if (!selectedContact && tagIds.length > 0 && contactId) {
        await Promise.all(tagIds.map((tagId) => tagsService.addToContact(contactId, tagId)));
      }
      toast.success('Conversa iniciada');
      resetForm();
      onClose();
      onCreated(conversationId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao iniciar conversa');
    } finally {
      setIsLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={handleClose} />
      <div className="relative z-50 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-zinc-900">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Nova conversa
          </h2>
          <button onClick={handleClose} className="rounded-md p-1 text-zinc-400 hover:text-zinc-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <label className={labelCls}>Canal</label>
            <select
              value={channelId}
              onChange={(e) => setChannelId(e.target.value)}
              className={inputCls}
            >
              {zappfyChannels.length === 0 && <option value="">Nenhum canal Zappfy ativo</option>}
              {zappfyChannels.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {zappfyChannels.length === 0 && (
              <p className="text-xs text-zinc-400 dark:text-zinc-500">
                Nenhum canal Zappfy ativo
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className={labelCls}>Destinatário</label>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Buscar contato existente..."
                value={contactSearch}
                onChange={(e) => {
                  handleContactSearchChange(e.target.value);
                  if (selectedContact) setSelectedContact(null);
                }}
                onFocus={() => setShowContactResults(true)}
                className={`${inputCls} pl-9`}
              />
              {selectedContact && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedContact(null);
                    setContactSearch('');
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-zinc-400 hover:text-zinc-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}

              {showContactResults && !selectedContact && debouncedContactSearch.trim() && (
                <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-48 overflow-y-auto rounded-md border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
                  {(contactResults?.contacts?.length ?? 0) === 0 ? (
                    <p className="px-3 py-2 text-xs text-zinc-400 dark:text-zinc-500">
                      Nenhum contato encontrado
                    </p>
                  ) : (
                    contactResults!.contacts.map((contact) => (
                      <button
                        key={contact.id}
                        type="button"
                        onClick={() => handlePickContact(contact)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-700/60"
                      >
                        <User className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                        <span className="flex-1 truncate">
                          {contact.name || contact.phone || 'Sem nome'}
                        </span>
                        {contact.phone && contact.name && (
                          <span className="shrink-0 text-xs text-zinc-400">{contact.phone}</span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {selectedContact ? (
              <div className="flex items-center gap-2 rounded-md bg-primary/5 px-3 py-2 text-xs text-primary dark:bg-primary/10">
                <Check className="h-3.5 w-3.5 shrink-0" />
                Contato selecionado: {selectedContact.name || selectedContact.phone}
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                <div className="space-y-1.5">
                  <p className="text-xs text-zinc-400 dark:text-zinc-500">
                    ou cadastre um novo cliente (número com DDI/DDD):
                  </p>
                  <input
                    type="text"
                    placeholder="Telefone — Ex: 5511999999999"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <input
                  type="text"
                  placeholder="Nome do cliente (opcional)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputCls}
                />
                <input
                  type="email"
                  placeholder="Email (opcional)"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputCls}
                />
                <textarea
                  placeholder="Observações (opcional)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className={`${inputCls} h-auto resize-none`}
                />
                <div className="space-y-1.5">
                  <label className={`${labelCls} text-xs`}>Tags (opcional)</label>
                  <TagMultiSelect value={tagIds} onChange={setTagIds} disabled={isLoading} />
                </div>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label className={labelCls}>Mensagem</label>
            <textarea
              placeholder="Escreva a mensagem inicial..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className={`${inputCls} h-auto resize-none`}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-md px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading || zappfyChannels.length === 0}
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Iniciar conversa
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
