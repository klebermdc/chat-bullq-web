'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  XCircle,
  RotateCcw,
  FolderKanban,
  Sparkles,
  ChevronLeft,
  MoreVertical,
  NotebookPen,
  ArrowRightLeft,
} from 'lucide-react';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { ConversationAiToggle } from './conversation-ai-toggle';
import { AssignmentPopover } from './assignment-popover';
import { AgentPinPopover } from './agent-pin-popover';
import { PipelinePopover } from './pipeline-popover';
import { ContactNotesDialog } from '@/features/contacts/components/contact-notes-dialog';
import { TransferDialog } from './transfer-dialog';
import { ScheduledMessagesPopover } from '@/features/scheduling/components/scheduled-messages-popover';
import { CadenceBadge } from '@/features/cadences/components/cadence-badge';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { inboxService, type Conversation } from '../services/inbox.service';
import { formatMsLeft, type WindowState } from '../lib/window-state';

interface ConversationHeaderProps {
  conversation: Conversation;
  onUpdate: () => void;
  /** Estado da janela de 24h (WHATSAPP_OFFICIAL). Renderiza o chip no header. */
  windowState?: WindowState;
  /** When provided, renders a toggle button for the agent-runs sidebar. */
  onToggleAgentLogs?: () => void;
  agentLogsOpen?: boolean;
  /** When provided + conversation is a group, renders the Project panel toggle. */
  onToggleProject?: () => void;
  projectOpen?: boolean;
  /** When provided, renders a toggle button for the Painel Inteligente. */
  onToggleIntel?: () => void;
  intelOpen?: boolean;
  /** When provided, the notes button toggles the Observações panel instead
   *  of opening the ContactNotesDialog popup. */
  onToggleObs?: () => void;
  obsOpen?: boolean;
  /** Mobile: volta para a lista de conversas. */
  onBack?: () => void;
}

/**
 * Selo enxuto do canal: só o NOME do canal com um pontinho na cor da
 * plataforma (verde=WhatsApp, rosa=Instagram, etc.). Sem o rótulo gritado
 * "WHATSAPP ·" — a cor do ponto já comunica a plataforma, o nome importa mais.
 */
function ChannelBadge({ type, name }: { type: string; name: string }) {
  const t = type.toUpperCase();
  const isWhats = t.includes('WHATSAPP') || t.includes('ZAPPFY');
  const isInsta = t.includes('INSTAGRAM');
  const isTelegram = t.includes('TELEGRAM');
  const isEmail = t.includes('EMAIL') || t.includes('MAIL');
  const isSms = t.includes('SMS');

  let dot = 'bg-zinc-400';
  let platform = 'Canal';
  if (isWhats) {
    dot = 'bg-green-500';
    platform = 'WhatsApp';
  } else if (isInsta) {
    dot = 'bg-pink-500';
    platform = 'Instagram';
  } else if (isTelegram) {
    dot = 'bg-sky-500';
    platform = 'Telegram';
  } else if (isEmail) {
    dot = 'bg-blue-500';
    platform = 'Email';
  } else if (isSms) {
    dot = 'bg-amber-500';
    platform = 'SMS';
  }

  return (
    <span
      title={`${platform} · ${name}`}
      className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
      <span className="max-w-[220px] truncate">{name}</span>
    </span>
  );
}

/**
 * Chip da janela de 24h do WhatsApp Cloud API. Verde quando aberta com folga,
 * âmbar quando falta ≤1h, vermelho quando fechada (só template aprovado envia).
 */
function WindowChip({ windowState }: { windowState: WindowState }) {
  if (!windowState.applicable) return null;
  // Sem INBOUND conhecida não há janela real (nem aberta nem fechada) → não mostra chip.
  if (windowState.expiresAt == null) return null;

  const base =
    'mt-1 inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide';

  if (windowState.closed) {
    return (
      <span
        title="Janela de 24h fechada — só é possível enviar um template aprovado"
        className={`${base} bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400`}
      >
        🔴 Janela fechada
      </span>
    );
  }

  const urgent = windowState.msLeft <= 60 * 60 * 1000;
  const label = `${urgent ? '🟡' : '🟢'} Janela ${formatMsLeft(windowState.msLeft)}`;
  const cls = urgent
    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';

  return (
    <span
      title="Tempo restante da janela de 24h do WhatsApp"
      className={`${base} ${cls}`}
    >
      {label}
    </span>
  );
}

function HeaderAvatar({ name, avatarUrl }: { name: string | null; avatarUrl: string | null }) {
  const [failed, setFailed] = useState(false);
  const initials = name?.slice(0, 2).toUpperCase() || '??';
  if (avatarUrl && !failed) {
    return (
      <img
        src={avatarUrl}
        alt={name || 'avatar'}
        onError={() => setFailed(true)}
        className="h-10 w-10 shrink-0 rounded-full bg-muted object-cover"
      />
    );
  }
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground">
      {initials}
    </div>
  );
}

export function ConversationHeader({
  conversation,
  onUpdate,
  windowState,
  onToggleProject,
  projectOpen,
  onToggleIntel,
  intelOpen,
  onToggleObs,
  obsOpen,
  onBack,
}: ConversationHeaderProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const hasNotes = !!conversation.contact.notes?.trim();

  const handleAction = async (action: () => Promise<any>, successMsg: string) => {
    setIsLoading(true);
    try {
      await action();
      toast.success(successMsg);
      onUpdate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-between border-b border-border bg-card/40 px-4 py-3 backdrop-blur">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {onBack && (
          <Button
            onClick={onBack}
            aria-label="Voltar"
            variant="ghost"
            size="icon"
            className="-ml-1 mr-1 lg:hidden"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        )}
        <HeaderAvatar
          name={conversation.contact.name}
          avatarUrl={conversation.contact.avatarUrl}
        />
        <div className="flex min-w-0 flex-col overflow-hidden">
          <div className="truncate text-sm font-semibold text-foreground">
            {conversation.contact.name || conversation.contact.phone || 'Desconhecido'}
          </div>
          {conversation.contact.phone && conversation.contact.name && (
            <div className="truncate text-xs text-muted-foreground">{conversation.contact.phone}</div>
          )}
          <div className="flex flex-wrap items-center gap-1.5">
            <ChannelBadge
              type={conversation.channel.type}
              name={conversation.channel.name}
            />
            {windowState && <WindowChip windowState={windowState} />}
          </div>
        </div>
      </div>

      <div className="hidden min-w-0 flex-wrap items-center justify-end gap-1.5 lg:flex [&>*]:shrink-0">
        <CadenceBadge conversationId={conversation.id} />
        <ScheduledMessagesPopover conversationId={conversation.id} />
        <AgentPinPopover conversation={conversation} onChanged={onUpdate} />
        <ConversationAiToggle
          conversation={conversation}
          disabled={isLoading}
          onChange={async (next) => {
            await handleAction(
              () => inboxService.toggleAi(conversation.id, next),
              next === null
                ? 'IA voltou pro padrão (segue config global)'
                : next
                  ? 'IA forçada nesta conversa (sobrepõe global)'
                  : 'IA pausada nesta conversa',
            );
          }}
          onEngage={async () => {
            await handleAction(async () => {
              const result = await inboxService.engageAi(conversation.id);
              if (!result.engaged) {
                throw new Error(
                  result.reason
                    ? `IA não pôde engajar: ${result.reason}`
                    : 'Não foi possível engajar a IA',
                );
              }
              return result;
            }, 'IA engajada — vai responder em segundos');
          }}
        />
        {conversation.status !== 'CLOSED' && (
          <AssignmentPopover conversation={conversation} onChanged={onUpdate} />
        )}
        <PipelinePopover conversation={conversation} onChanged={onUpdate} />
        {conversation.status !== 'CLOSED' && (
          <Button
            onClick={() =>
              handleAction(
                () => inboxService.closeConversation(conversation.id),
                'Conversa encerrada',
              )
            }
            disabled={isLoading}
            variant="secondary"
            size="sm"
            className="hover:bg-destructive/10 hover:text-destructive"
          >
            <XCircle className="h-3.5 w-3.5" />
            Encerrar
          </Button>
        )}
        {conversation.status === 'CLOSED' && (
          <Button
            onClick={() =>
              handleAction(
                () => inboxService.reopenConversation(conversation.id),
                'Conversa reaberta',
              )
            }
            disabled={isLoading}
            variant="primary"
            size="sm"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reabrir
          </Button>
        )}

        {/* Ações secundárias agrupadas num menu — declutter do header.
            Observações, Painel, Transferir e Projeto saíam soltos como
            ícones; agora ficam a um clique sem poluir a barra. */}
        <Popover className="relative">
          <PopoverButton
            title="Mais ações"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground"
          >
            <MoreVertical className="h-4 w-4" />
          </PopoverButton>
          <PopoverPanel
            anchor="bottom end"
            transition
            className="z-50 mt-1.5 w-60 rounded-lg border border-zinc-200 bg-white p-1 shadow-lg outline-none transition duration-100 ease-out data-[closed]:scale-95 data-[closed]:opacity-0 dark:border-zinc-800 dark:bg-zinc-900 [--anchor-gap:0.25rem]"
          >
            {({ close }) => (
              <>
                <button
                  type="button"
                  onClick={() => {
                    close();
                    if (onToggleObs) onToggleObs();
                    else setNotesOpen(true);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800/60"
                >
                  <NotebookPen className="h-4 w-4 shrink-0 text-zinc-400" />
                  Observações do lead
                  {hasNotes && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
                  )}
                </button>
                {onToggleIntel && (
                  <button
                    type="button"
                    onClick={() => {
                      close();
                      onToggleIntel();
                    }}
                    className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800/60"
                  >
                    <Sparkles className="h-4 w-4 shrink-0 text-zinc-400" />
                    Painel Inteligente
                  </button>
                )}
                {conversation.status !== 'CLOSED' && (
                  <button
                    type="button"
                    onClick={() => {
                      close();
                      setTransferOpen(true);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800/60"
                  >
                    <ArrowRightLeft className="h-4 w-4 shrink-0 text-zinc-400" />
                    Transferir atendente
                  </button>
                )}
                {onToggleProject && conversation.isGroup && (
                  <button
                    type="button"
                    onClick={() => {
                      close();
                      onToggleProject();
                    }}
                    className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800/60"
                  >
                    <FolderKanban className="h-4 w-4 shrink-0 text-zinc-400" />
                    Projeto do grupo
                  </button>
                )}
              </>
            )}
          </PopoverPanel>
        </Popover>
      </div>

      <Button
        onClick={() => setActionsOpen(true)}
        aria-label="Ações"
        variant="ghost"
        size="icon"
        className="lg:hidden"
      >
        <MoreVertical className="h-5 w-5" />
      </Button>

      <BottomSheet open={actionsOpen} onClose={() => setActionsOpen(false)} title="Ações da conversa">
        <div className="flex flex-col">
          <button
            onClick={() => { setActionsOpen(false); setNotesOpen(true); }}
            className="flex items-center gap-3 px-4 py-3 text-left text-sm text-foreground hover:bg-muted"
          >
            <NotebookPen className="h-5 w-5" /> Observações do lead
            {hasNotes && <span className="ml-auto h-2 w-2 rounded-full bg-primary" />}
          </button>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-foreground">IA automática</span>
            <ConversationAiToggle
              conversation={conversation}
              disabled={isLoading}
              onChange={async (next) => {
                await handleAction(
                  () => inboxService.toggleAi(conversation.id, next),
                  next === null ? 'IA voltou pro padrão' : next ? 'IA forçada nesta conversa' : 'IA pausada',
                );
              }}
              onEngage={async () => {
                await handleAction(async () => {
                  const result = await inboxService.engageAi(conversation.id);
                  if (!result.engaged) throw new Error(result.reason ? `IA não engajou: ${result.reason}` : 'Falha ao engajar');
                  return result;
                }, 'IA engajada');
              }}
            />
          </div>
          {conversation.status !== 'CLOSED' && (
            <button
              onClick={() => { setActionsOpen(false); handleAction(() => inboxService.closeConversation(conversation.id), 'Conversa encerrada'); }}
              className="flex items-center gap-3 px-4 py-3 text-left text-sm text-foreground hover:bg-muted"
            >
              <XCircle className="h-5 w-5" /> Encerrar conversa
            </button>
          )}
          {conversation.status === 'CLOSED' && (
            <button
              onClick={() => { setActionsOpen(false); handleAction(() => inboxService.reopenConversation(conversation.id), 'Conversa reaberta'); }}
              className="flex items-center gap-3 px-4 py-3 text-left text-sm text-foreground hover:bg-muted"
            >
              <RotateCcw className="h-5 w-5" /> Reabrir conversa
            </button>
          )}
          {onToggleProject && conversation.isGroup && (
            <button onClick={() => { setActionsOpen(false); onToggleProject(); }} className="flex items-center gap-3 px-4 py-3 text-left text-sm text-foreground hover:bg-muted">
              <FolderKanban className="h-5 w-5" /> Projeto do grupo
            </button>
          )}
          {onToggleIntel && (
            <button onClick={() => { setActionsOpen(false); onToggleIntel(); }} className="flex items-center gap-3 px-4 py-3 text-left text-sm text-foreground hover:bg-muted">
              <Sparkles className="h-5 w-5" /> Painel Inteligente
            </button>
          )}
          {conversation.status !== 'CLOSED' && (
            <button onClick={() => { setActionsOpen(false); setTransferOpen(true); }} className="flex items-center gap-3 px-4 py-3 text-left text-sm text-foreground hover:bg-muted">
              <ArrowRightLeft className="h-5 w-5" /> Transferir atendente
            </button>
          )}
        </div>
      </BottomSheet>

      <ContactNotesDialog
        open={notesOpen}
        onClose={() => setNotesOpen(false)}
        contactId={conversation.contactId}
        contactName={conversation.contact.name}
        onSaved={onUpdate}
      />

      <TransferDialog
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
        conversation={conversation}
        onTransferred={onUpdate}
      />
    </div>
  );
}
