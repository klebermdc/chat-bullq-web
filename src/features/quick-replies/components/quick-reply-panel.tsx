'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CornerDownLeft, Pencil, Plus, Search, Send, Trash2, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { controlCls } from '@/components/ui/control';
import { cn } from '@/lib/utils';
import { getErrorMessage } from '@/lib/errors';
import { quickRepliesService, type QuickReply } from '../services/quick-replies.service';
import { canChangeReply } from '../lib/quick-reply-permissions';
import { QuickReplyForm } from './quick-reply-form';
import { OTHER_CATEGORY, categoryOf, listCategories, searchCatalog } from '../lib/quick-reply-catalog';
import { fillVariables } from '../lib/quick-reply-match';

type Props = {
  open: boolean;
  onClose: () => void;
  replies: QuickReply[];
  isLoading: boolean;
  isError: boolean;
  /** Nome do cliente: preenche {{nome}} e {{primeiro_nome}} na prévia e no envio. */
  contactName?: string | null;
  /** Põe o texto no campo de mensagem (o atendente ainda pode editar). */
  onInsert: (text: string) => void;
  /** Envia direto. Ausente = só inserir (ex.: janela de 24h fechada). */
  onSend?: (text: string) => Promise<void> | void;
  /** Dono/admin: mexem em qualquer mensagem e escolhem "só eu" ou "toda a equipe". */
  canManage: boolean;
  /** Atendente cria, edita e exclui só as dele. */
  currentUserId: string | null;
};

/** null = navegando; 'new' = criando; mensagem = editando. */
type EditorState = null | 'new' | QuickReply;

const ALL = null;

const chipCls =
  'shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

/**
 * Janela de mensagens rápidas (botão ⚡ do compositor), no jeito da Umbler:
 * busca no topo, categorias, lista à esquerda e o texto completo à direita.
 * Clique escolhe, duplo clique ou Enter insere no campo, Ctrl+Enter envia.
 */
export function QuickReplyPanel({
  open,
  onClose,
  replies,
  isLoading,
  isError,
  contactName,
  onInsert,
  onSend,
  canManage,
  currentUserId,
}: Props) {
  const queryClient = useQueryClient();
  const [editor, setEditor] = useState<EditorState>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const permission = { userId: currentUserId, isManager: canManage };
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(ALL);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);

  // Cada abertura começa limpa: busca vazia, todas as categorias.
  useEffect(() => {
    if (!open) return;
    setQuery('');
    setCategory(ALL);
    setSelectedId(null);
    setEditor(null);
    setConfirmDeleteId(null);
  }, [open]);

  const refreshReplies = () => queryClient.invalidateQueries({ queryKey: ['quick-replies'] });

  const handleSaved = async (saved: QuickReply) => {
    toast.success(editor === 'new' ? 'Mensagem rápida criada' : 'Mensagem rápida salva');
    await refreshReplies();
    setEditor(null);
    setQuery('');
    setCategory(ALL);
    setSelectedId(saved.id);
  };

  const handleDelete = async (reply: QuickReply) => {
    setIsDeleting(true);
    try {
      await quickRepliesService.remove(reply.id);
      toast.success(`/${reply.shortcut} excluída`);
      setConfirmDeleteId(null);
      setSelectedId(null);
      await refreshReplies();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Não foi possível excluir a mensagem.'));
    } finally {
      setIsDeleting(false);
    }
  };

  const categories = useMemo(() => listCategories(replies), [replies]);
  const results = useMemo(() => searchCatalog(replies, query, category), [replies, query, category]);
  const selected = results.find((r) => r.id === selectedId) ?? results[0];
  const preview = selected ? fillVariables(selected.content, contactName) : '';

  useEffect(() => {
    if (!selected) return;
    const node = listRef.current?.querySelector<HTMLElement>(`[data-reply-id="${selected.id}"]`);
    node?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  const insert = (reply: QuickReply | undefined) => {
    if (!reply) return;
    onInsert(fillVariables(reply.content, contactName));
    onClose();
  };

  const send = async (reply: QuickReply | undefined) => {
    if (!reply || !onSend || isSending) return;
    setIsSending(true);
    try {
      await onSend(fillVariables(reply.content, contactName));
      onClose();
    } catch {
      // Quem envia já mostra o erro; a janela fica aberta para tentar de novo.
    } finally {
      setIsSending(false);
    }
  };

  const move = (step: number) => {
    if (!results.length) return;
    const index = selected ? results.indexOf(selected) : -1;
    const next = results[(index + step + results.length) % results.length];
    setSelectedId(next.id);
  };

  const handleSearchKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      move(e.key === 'ArrowDown' ? 1 : -1);
      return;
    }
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) void send(selected);
    else insert(selected);
  };

  const isEditingOpen = editor !== null;
  const panelTitle = editor === 'new' ? 'Nova mensagem rápida' : editor ? 'Editar mensagem rápida' : 'Mensagens rápidas';

  const footer = (
    <>
      <span className="mr-auto hidden text-xs text-muted-foreground md:inline">
        ↑↓ escolher · Enter inserir · Ctrl+Enter enviar
      </span>
      <Button type="button" variant="outline" onClick={() => insert(selected)} disabled={!selected}>
        <CornerDownLeft aria-hidden="true" className="h-4 w-4" /> Inserir no campo
      </Button>
      {onSend && (
        <Button type="button" onClick={() => void send(selected)} disabled={!selected} loading={isSending}>
          <Send aria-hidden="true" className="h-4 w-4" /> Enviar agora
        </Button>
      )}
    </>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="2xl"
      title={
        <span className="flex items-center gap-2">
          <Zap aria-hidden="true" className="h-4 w-4 text-primary" /> {panelTitle}
        </span>
      }
      bodyClassName="flex flex-col p-0"
      footer={replies.length > 0 && !isEditingOpen ? footer : undefined}
      dismissible={!isEditingOpen}
    >
      {isEditingOpen ? (
        <QuickReplyForm
          reply={editor === 'new' ? undefined : editor}
          categories={categories.map((c) => c.name).filter((name) => name !== OTHER_CATEGORY)}
          isManager={canManage}
          currentUserId={currentUserId}
          onSaved={handleSaved}
          onCancel={() => setEditor(null)}
        />
      ) : replies.length === 0 ? (
        <EmptyBody isLoading={isLoading} isError={isError} onCreate={() => setEditor('new')} />
      ) : (
        <>
          <div className="space-y-3 border-b border-border px-5 py-3">
            <div className="flex gap-2">
            <label className="relative block min-w-0 flex-1">
              <span className="sr-only">Buscar mensagem rápida</span>
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              />
              <input
                autoFocus
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedId(null);
                }}
                onKeyDown={handleSearchKey}
                placeholder="Buscar por atalho, título ou texto"
                aria-controls="quick-reply-panel-list"
                className={`${controlCls} w-full pl-9`}
              />
            </label>
            <Button type="button" variant="outline" onClick={() => setEditor('new')} title="Criar mensagem rápida">
              <Plus aria-hidden="true" className="h-4 w-4" />
              <span className="hidden sm:inline">Nova</span>
              <span className="sr-only sm:hidden">Nova mensagem rápida</span>
            </Button>
            </div>
            <div role="group" aria-label="Categorias" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5">
              <CategoryChip
                label="Todas"
                count={replies.length}
                isActive={category === ALL}
                onClick={() => setCategory(ALL)}
              />
              {categories.map((c) => (
                <CategoryChip
                  key={c.name}
                  label={c.name}
                  count={c.count}
                  isActive={category === c.name}
                  onClick={() => {
                    setCategory(c.name);
                    setSelectedId(null);
                  }}
                />
              ))}
            </div>
          </div>

          {results.length === 0 ? (
            <p role="status" className="px-5 py-10 text-center text-sm text-muted-foreground">
              Nenhuma mensagem encontrada{query && <> para “{query}”</>}.
            </p>
          ) : (
            <div className="grid min-h-0 flex-1 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
              <ul
                ref={listRef}
                id="quick-reply-panel-list"
                role="listbox"
                aria-label="Mensagens rápidas"
                className="max-h-[38dvh] overflow-y-auto border-b border-border py-1 md:max-h-[56dvh] md:border-b-0 md:border-r"
              >
                {results.map((r) => {
                  const isActive = r.id === selected?.id;
                  return (
                    <li
                      key={r.id}
                      data-reply-id={r.id}
                      role="option"
                      aria-selected={isActive}
                      onClick={() => setSelectedId(r.id)}
                      onDoubleClick={() => insert(r)}
                      className={cn(
                        'cursor-pointer border-l-2 px-4 py-2.5',
                        isActive ? 'border-primary bg-primary/10' : 'border-transparent hover:bg-muted',
                      )}
                    >
                      <p className="flex items-baseline gap-2 text-sm">
                        <span className="min-w-0 flex-1 truncate font-medium text-foreground">{r.title}</span>
                        {r.owner && (
                          <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                            {r.owner.name.split(' ')[0]}
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 flex gap-2 text-xs text-muted-foreground">
                        <span className="shrink-0 font-mono text-primary">/{r.shortcut}</span>
                        <span className="truncate">{r.content}</span>
                      </p>
                    </li>
                  );
                })}
              </ul>
              {selected && (
                <section aria-label="Prévia" className="flex min-h-0 flex-col">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-5 pt-4 text-xs text-muted-foreground">
                    <span className="rounded-full bg-muted px-2 py-0.5">{categoryOf(selected)}</span>
                    <span>{selected.owner ? `Só ${selected.owner.name}` : 'Toda a equipe'}</span>
                  </div>
                  <h3 className="px-5 pt-2 text-sm font-semibold text-foreground">{selected.title}</h3>
                  {canChangeReply(selected, permission) && (
                    <ReplyActions
                      reply={selected}
                      isConfirming={confirmDeleteId === selected.id}
                      isDeleting={isDeleting}
                      onEdit={() => setEditor(selected)}
                      onAskDelete={() => setConfirmDeleteId(selected.id)}
                      onCancelDelete={() => setConfirmDeleteId(null)}
                      onDelete={() => void handleDelete(selected)}
                    />
                  )}
                  <p className="mt-2 max-h-[30dvh] flex-1 overflow-y-auto whitespace-pre-wrap break-words px-5 pb-4 text-sm leading-relaxed text-foreground md:max-h-[50dvh]">
                    {preview}
                  </p>
                </section>
              )}
            </div>
          )}
        </>
      )}
    </Dialog>
  );
}

function CategoryChip({
  label,
  count,
  isActive,
  onClick,
}: {
  label: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={isActive}
      onClick={onClick}
      className={cn(
        chipCls,
        isActive
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-background text-foreground hover:bg-muted',
      )}
    >
      {label} <span className={isActive ? 'opacity-80' : 'text-muted-foreground'}>{count}</span>
    </button>
  );
}

const actionBtnCls =
  'inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition-colors ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

/** Editar/Excluir da mensagem escolhida; excluir pede confirmação ali mesmo. */
function ReplyActions({
  reply,
  isConfirming,
  isDeleting,
  onEdit,
  onAskDelete,
  onCancelDelete,
  onDelete,
}: {
  reply: QuickReply;
  isConfirming: boolean;
  isDeleting: boolean;
  onEdit: () => void;
  onAskDelete: () => void;
  onCancelDelete: () => void;
  onDelete: () => void;
}) {
  if (isConfirming) {
    return (
      <div role="alert" className="mx-5 mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-urgent-wash px-3 py-2 text-xs text-urgent-ink">
        <span className="mr-auto">Excluir /{reply.shortcut}? Não dá para desfazer.</span>
        <button type="button" autoFocus onClick={onCancelDelete} className={`${actionBtnCls} bg-background text-foreground hover:bg-muted`}>
          Cancelar
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={isDeleting}
          className={`${actionBtnCls} bg-destructive text-white hover:bg-destructive/90 disabled:opacity-60`}
        >
          {isDeleting ? 'Excluindo…' : 'Excluir'}
        </button>
      </div>
    );
  }
  return (
    <div className="flex gap-1 px-4 pt-1">
      <button type="button" onClick={onEdit} className={`${actionBtnCls} text-muted-foreground hover:bg-muted hover:text-foreground`}>
        <Pencil aria-hidden="true" className="h-3.5 w-3.5" /> Editar
      </button>
      <button type="button" onClick={onAskDelete} className={`${actionBtnCls} text-muted-foreground hover:bg-urgent-wash hover:text-urgent-ink`}>
        <Trash2 aria-hidden="true" className="h-3.5 w-3.5" /> Excluir
      </button>
    </div>
  );
}

function EmptyBody({ isLoading, isError, onCreate }: { isLoading: boolean; isError: boolean; onCreate: () => void }) {
  if (isLoading) {
    return <p className="px-5 py-10 text-center text-sm text-muted-foreground">Carregando…</p>;
  }
  if (isError) {
    return (
      <p role="alert" className="m-5 rounded-lg bg-urgent-wash px-3 py-2 text-sm text-urgent-ink">
        Não foi possível carregar as mensagens rápidas. Tente de novo em instantes.
      </p>
    );
  }
  return (
    <div className="px-5 py-10 text-center">
      <p className="text-sm font-medium text-foreground">Nenhuma mensagem rápida cadastrada</p>
      <p className="mt-1 text-sm text-muted-foreground">Crie a sua: só você vai ver e usar.</p>
      <Button type="button" className="mt-4" onClick={onCreate}>
        <Plus aria-hidden="true" className="h-4 w-4" /> Nova mensagem
      </Button>
    </div>
  );
}
