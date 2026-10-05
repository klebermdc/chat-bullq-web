'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { X, Search, Check, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { controlCls } from '@/components/ui/control';
import { channelsService } from '@/features/channels/services/channels.service';
import { contactsService, type Contact } from '@/features/contacts/services/contacts.service';
import { conversationsService } from '@/features/conversations/services/conversations.service';
import { tagsService } from '@/features/settings/services/tags.service';
import { TagMultiSelect } from '@/features/contacts/components/tag-multi-select';
import { TemplatePickerDialog } from '@/features/templates/components/template-picker-dialog';
import { useOrgId } from '@/hooks/use-org-query-key';
import { getErrorMessage } from '@/lib/errors';

const inputCls = `${controlCls} w-full`;
const textareaCls = `${controlCls} h-auto w-full resize-none py-2`;
const labelCls = 'block text-sm font-medium text-foreground';
const optionalCls = 'font-normal text-muted-foreground';
const FORM_ID = 'new-conversation-form';

interface NewConversationDialogProps {
  open: boolean;
  onClose: () => void;
  /** Called with the newly created conversation's id — caller opens it. */
  onCreated: (conversationId: string) => void;
  /** Pré-preenche o formulário (ex.: "Conversar" num cartão de contato). */
  initialPhone?: string;
  initialName?: string;
  initialChannelId?: string;
}

export function NewConversationDialog({
  open, onClose, onCreated, initialPhone, initialName, initialChannelId,
}: NewConversationDialogProps) {
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
  const [pickerOpen, setPickerOpen] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const { data: channels = [] } = useQuery({
    queryKey: ['channels', orgId],
    queryFn: () => channelsService.list(),
    enabled: open,
  });

  // Canais que podem iniciar conversa: o gateway Baileys (Zappfy/Uazapi) a
  // qualquer momento por texto livre; o Oficial (Meta) só via template
  // aprovado, pois a janela de 24h ainda não abriu no 1º contato.
  const waChannels = channels.filter(
    (c) =>
      c.type === 'WHATSAPP_ZAPPFY' ||
      c.type === 'WHATSAPP_OFFICIAL',
  );
  const selectedChannel = waChannels.find((c) => c.id === channelId);
  const isOfficial = selectedChannel?.type === 'WHATSAPP_OFFICIAL';

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

  // Abrindo a partir de um cartão de contato: já vem com número, nome e o
  // canal da conversa onde o contato foi recebido.
  useEffect(() => {
    if (!open) return;
    if (initialPhone) {
      setRecipientMode('phone');
      setPhone(initialPhone);
    }
    if (initialName) setName(initialName);
    if (initialChannelId) setChannelId(initialChannelId);
  }, [open, initialPhone, initialName, initialChannelId]);

  // Canal padrão: o primeiro WhatsApp, quando nenhum (ou um que não serve pra
  // iniciar conversa, ex. Instagram) está selecionado.
  const waChannelIds = waChannels.map((c) => c.id).join(',');
  useEffect(() => {
    if (waChannels.length > 0 && !waChannels.some((c) => c.id === channelId)) {
      setChannelId(waChannels[0].id);
    }
    // `waChannels` é recriado a cada render; os ids em string são a dependência estável.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waChannelIds, channelId]);

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
    setPickerOpen(false);
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

  /** Valida canal + destinatário (comum aos dois fluxos). */
  const validateRecipient = (): boolean => {
    if (!channelId) {
      toast.error('Selecione um canal WhatsApp');
      return false;
    }
    if (!selectedContact && !phone.trim()) {
      toast.error('Informe um número ou selecione um contato');
      return false;
    }
    return true;
  };

  /** Dispara o /conversations/start com texto OU template e trata pós-envio. */
  const doStart = async (payload: { message?: string; template?: Record<string, any> }) => {
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
        ...payload,
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
      // A API explica o motivo (telefone inválido, canal sem acesso...).
      toast.error(getErrorMessage(err, 'Erro ao iniciar conversa'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateRecipient()) return;

    // Canal oficial: o 1º contato exige um template aprovado — abre o picker,
    // que devolve o payload HSM e aí sim criamos a conversa.
    if (isOfficial) {
      setPickerOpen(true);
      return;
    }

    if (!message.trim()) {
      toast.error('Escreva uma mensagem');
      return;
    }
    await doStart({ message: message.trim() });
  };

  const handleTemplateSend = async (content: Record<string, any>) => {
    setPickerOpen(false);
    await doStart({ template: content });
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Nova conversa"
      size="lg"
      // Fechar por Esc/clique fora apagaria o que já foi digitado.
      dismissible={false}
      footer={
        <>
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form={FORM_ID}
            disabled={waChannels.length === 0}
            loading={isLoading}
          >
            {isOfficial ? 'Escolher template' : 'Iniciar conversa'}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="new-conv-channel" className={labelCls}>Canal</label>
          <select
            id="new-conv-channel"
            value={channelId}
            onChange={(e) => setChannelId(e.target.value)}
            className={inputCls}
          >
            {waChannels.length === 0 && <option value="">Nenhum canal WhatsApp ativo</option>}
            {waChannels.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.type === 'WHATSAPP_OFFICIAL' ? ' (Oficial)' : ''}
              </option>
            ))}
          </select>
          {waChannels.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Conecte um canal WhatsApp em Configurações para iniciar conversas.
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="new-conv-contact-search" className={labelCls}>Destinatário</label>

          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            />
            <input
              id="new-conv-contact-search"
              type="text"
              placeholder="Buscar contato existente…"
              value={contactSearch}
              onChange={(e) => {
                handleContactSearchChange(e.target.value);
                if (selectedContact) setSelectedContact(null);
              }}
              onFocus={() => setShowContactResults(true)}
              className={`${inputCls} pl-9 ${selectedContact ? 'pr-10' : ''}`}
            />
            {selectedContact && (
              <button
                type="button"
                onClick={() => {
                  setSelectedContact(null);
                  setContactSearch('');
                }}
                aria-label="Remover contato selecionado"
                title="Remover contato selecionado"
                className="absolute right-0.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X aria-hidden="true" className="h-3.5 w-3.5" />
              </button>
            )}

            {showContactResults && !selectedContact && debouncedContactSearch.trim() && (
              <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-48 overflow-y-auto rounded-lg border border-border bg-popover shadow-elevated">
                {(contactResults?.contacts?.length ?? 0) === 0 ? (
                  <p className="px-3 py-2 text-xs text-muted-foreground">
                    Nenhum contato encontrado — preencha o telefone abaixo para cadastrar.
                  </p>
                ) : (
                  contactResults!.contacts.map((contact) => (
                    <button
                      key={contact.id}
                      type="button"
                      onClick={() => handlePickContact(contact)}
                      className="flex min-h-10 w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
                    >
                      <User aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="flex-1 truncate">
                        {contact.name || contact.phone || 'Sem nome'}
                      </span>
                      {contact.phone && contact.name && (
                        <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                          {contact.phone}
                        </span>
                      )}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {selectedContact ? (
            <div className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-xs text-primary">
              <Check aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
              Contato selecionado: {selectedContact.name || selectedContact.phone}
            </div>
          ) : (
            <div role="group" aria-labelledby="new-conv-new-client" className="space-y-3 pt-1">
              <p id="new-conv-new-client" className="text-xs text-muted-foreground">
                ou cadastre um novo cliente:
              </p>
              <div className="space-y-1.5">
                <label htmlFor="new-conv-phone" className={labelCls}>Telefone</label>
                <input
                  id="new-conv-phone"
                  type="text"
                  inputMode="tel"
                  autoComplete="off"
                  placeholder="DDD + número"
                  aria-describedby="new-conv-phone-hint"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={`${inputCls} font-mono tabular-nums placeholder:font-sans`}
                />
                <p id="new-conv-phone-hint" className="text-xs text-muted-foreground">
                  Ex.: <span className="font-mono tabular-nums">(11) 99999-9999</span>. Número de fora do Brasil: comece pelo DDI.
                </p>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="new-conv-name" className={labelCls}>
                  Nome do cliente <span className={optionalCls}>(opcional)</span>
                </label>
                <input
                  id="new-conv-name"
                  type="text"
                  autoComplete="off"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="new-conv-email" className={labelCls}>
                  E-mail <span className={optionalCls}>(opcional)</span>
                </label>
                <input
                  id="new-conv-email"
                  type="email"
                  autoComplete="off"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="new-conv-notes" className={labelCls}>
                  Observações <span className={optionalCls}>(opcional)</span>
                </label>
                <textarea
                  id="new-conv-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className={textareaCls}
                />
              </div>
              <div className="space-y-1.5">
                <p className={labelCls}>
                  Tags <span className={optionalCls}>(opcional)</span>
                </p>
                <TagMultiSelect value={tagIds} onChange={setTagIds} disabled={isLoading} />
              </div>
            </div>
          )}
        </div>

        {isOfficial ? (
          <div className="space-y-1.5">
            <p className={labelCls}>Mensagem inicial</p>
            <div className="rounded-lg bg-warning-wash px-3 py-2.5 text-xs leading-relaxed text-warning-ink">
              No canal oficial (Meta), o primeiro contato precisa ser um{' '}
              <strong>template aprovado</strong> — texto livre é bloqueado até o
              cliente responder. Ao clicar em <strong>Escolher template</strong> você
              seleciona o template e a conversa é iniciada.
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            <label htmlFor="new-conv-message" className={labelCls}>Mensagem</label>
            <textarea
              id="new-conv-message"
              placeholder="Escreva a mensagem inicial…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className={textareaCls}
            />
          </div>
        )}
      </form>

      {isOfficial && channelId && (
        <TemplatePickerDialog
          open={pickerOpen}
          channelId={channelId}
          contact={{ name: selectedContact?.name ?? (name.trim() || undefined) }}
          onClose={() => setPickerOpen(false)}
          onSend={handleTemplateSend}
        />
      )}
    </Dialog>
  );
}
