'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Check, MessageSquare, User } from 'lucide-react';
import { toast } from 'sonner';
import { pipelinesService } from '../services/pipelines.service';
import {
  inboxService,
  type Conversation,
} from '@/features/inbox/services/inbox.service';
import { getErrorMessage } from '@/lib/errors';
import { parseMoneyBR } from '@/lib/money';
import { getInitials } from '@/lib/initials';
import { channelTypeLabel } from '@/lib/channel-labels';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { controlCls } from '@/components/ui/control';
import { EmptyState, LoadingState } from '@/components/ui/empty-state';

interface Props {
  open: boolean;
  pipelineId: string;
  stageId: string | null;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * Adds an existing conversation to a kanban pipeline. The card is just a
 * pointer to the conversation — title/contact are auto-derived on the
 * backend so the operator only has to pick which conversation enters the
 * pipeline (and optionally set a value).
 */
export function AddConversationDialog({
  open,
  pipelineId,
  stageId,
  onClose,
  onSaved,
}: Props) {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [value, setValue] = useState('');
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!open) {
      setSearch('');
      setDebounced('');
      setValue('');
      setPickedId(null);
    }
  }, [open]);

  const { data, isLoading } = useQuery({
    queryKey: ['conversations', 'pipeline-picker', debounced],
    queryFn: () =>
      inboxService.getConversations({
        limit: '20',
        page: '1',
        ...(debounced ? { search: debounced } : {}),
      }),
    enabled: open,
  });

  const conversations = useMemo(
    () => data?.conversations ?? [],
    [data],
  );

  if (!open) return null;

  const handleAdd = async () => {
    if (!pickedId) {
      toast.error('Selecione uma conversa');
      return;
    }
    const numericValue = value.trim() ? parseMoneyBR(value) : undefined;
    if (value.trim() && numericValue === null) {
      toast.error('Valor inválido. Use, por exemplo, 4.500,00');
      return;
    }
    setSaving(true);
    try {
      await pipelinesService.createCard(pipelineId, {
        conversationId: pickedId,
        stageId: stageId ?? undefined,
        value: numericValue ?? undefined,
      });
      toast.success('Conversa adicionada ao pipeline');
      onSaved();
    } catch (err: any) {
      toast.error(
        getErrorMessage(err, 'Erro ao adicionar conversa no pipeline'),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      size="xl"
      title="Adicionar conversa ao pipeline"
      description="Escolha uma conversa existente. O card vai ser criado vinculado a ela."
      bodyClassName="flex flex-col p-0"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleAdd} disabled={saving || !pickedId}>
            {saving ? 'Adicionando…' : 'Adicionar ao pipeline'}
          </Button>
        </>
      }
    >
      <div className="shrink-0 border-b border-border px-5 py-3">
        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
          />
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou telefone…"
            aria-label="Buscar conversa por nome ou telefone"
            className={`${controlCls} w-full pl-9`}
          />
        </div>
      </div>

      <div className="min-h-40 flex-1 overflow-y-auto px-2 py-2">
        {isLoading && <LoadingState />}
        {!isLoading && conversations.length === 0 && (
          <EmptyState
            size="sm"
            icon={MessageSquare}
            title="Nenhuma conversa encontrada"
            description={
              debounced ? 'Tente buscar por outro nome ou telefone.' : undefined
            }
          />
        )}
        {conversations.map((c: Conversation) => {
          const picked = pickedId === c.id;
          const initials = getInitials(c.contact.name);
          return (
            <button
              key={c.id}
              type="button"
              aria-pressed={picked}
              onClick={() => setPickedId(c.id)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
                picked ? 'bg-primary/10' : 'hover:bg-muted'
              }`}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                {initials || <User aria-hidden="true" className="h-4 w-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {c.contact.name || c.contact.phone || 'Desconhecido'}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {channelTypeLabel(c.channel.type)}
                  {c.contact.phone && c.contact.name ? (
                    <span className="font-mono tabular-nums">
                      {` · ${c.contact.phone}`}
                    </span>
                  ) : null}
                </p>
              </div>
              {c.isGroup && (
                <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  Grupo
                </span>
              )}
              {picked && (
                <Check aria-hidden="true" className="h-4 w-4 shrink-0 text-primary" />
              )}
            </button>
          );
        })}
      </div>

      <div className="shrink-0 border-t border-border px-5 py-3">
        <label
          htmlFor="add-conversation-value"
          className="block text-sm font-medium text-foreground"
        >
          Valor estimado (R$), opcional
        </label>
        <input
          id="add-conversation-value"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Ex.: 4.500,00"
          inputMode="decimal"
          className={`${controlCls} mt-1 w-full font-mono tabular-nums`}
        />
      </div>
    </Dialog>
  );
}
