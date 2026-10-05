'use client';

import { useEffect, useRef, useState } from 'react';
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
  Bot,
  BotOff,
  Play,
  Check,
  Search,
  Hourglass,
  Lock,
  User,
  Phone,
} from 'lucide-react';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { ConversationAiToggle } from './conversation-ai-toggle';
import { AssignmentPopover } from './assignment-popover';
import { AgentPinPopover } from './agent-pin-popover';
import { PipelinePopover } from './pipeline-popover';
import { ContactNotesDialog } from '@/features/contacts/components/contact-notes-dialog';
import { TransferDialog } from './transfer-dialog';
import { ClientCardDrawer } from './client-card-drawer';
import { CallButton } from './call-button';
import { ScheduledMessagesPopover } from '@/features/scheduling/components/scheduled-messages-popover';
import { CadenceBadge } from '@/features/cadences/components/cadence-badge';
import { CadenceStartMenuItem } from '@/features/cadences/components/cadence-start-menu-item';
import { useActiveEnrollment } from '@/features/cadences/hooks/use-cadences';
import { useScheduledMessages } from '@/features/scheduling/hooks/use-scheduled-messages';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { inboxService, type Conversation } from '../services/inbox.service';
import { formatMsLeft, windowKindLabel, windowUrgency, type WindowState } from '../lib/window-state';
import { getInitials } from '@/lib/initials';
import { usePermissions } from '@/lib/permissions';

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
  /** When provided, renders a toggle for the in-conversation message search. */
  onToggleSearch?: () => void;
  searchOpen?: boolean;
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
      className="inline-flex min-w-0 max-w-[220px] shrink items-center gap-1.5 whitespace-nowrap rounded-full border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
    >
      <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
      <span className="sr-only">{platform}: </span>
      <span className="min-w-0 truncate">{name}</span>
    </span>
  );
}

/**
 * Chip da janela de atendimento do WhatsApp Cloud API. Verde quando aberta com
 * folga, âmbar quando falta ≤1h, vermelho quando fechada (só template aprovado
 * envia). O rótulo diz 24h ou 72h conforme a regra vigente — lead vindo de
 * anúncio Click-to-WhatsApp ganha 72h.
 */
function WindowChip({ windowState }: { windowState: WindowState }) {
  if (!windowState.applicable) return null;
  // Sem INBOUND conhecida não há janela real (nem aberta nem fechada) → não mostra chip.
  if (windowState.expiresAt == null) return null;

  const base =
    'inline-flex w-fit shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium';
  const kindLabel = windowKindLabel(windowState.kind);
  const ctwa = windowState.kind === 'ctwa72';

  if (windowState.closed) {
    return (
      <span
        title={`Janela de ${kindLabel} fechada — só é possível enviar um template aprovado`}
        className={`${base} bg-urgent-wash text-urgent-ink`}
      >
        <Lock aria-hidden="true" className="h-3 w-3" />
        Janela fechada
      </span>
    );
  }

  // Mesmas faixas da lista de conversas: calma, apertada (≤6h), fechando (≤1h).
  const urgency = windowUrgency(windowState.msLeft);
  const cls =
    urgency === 'closing'
      ? 'bg-urgent-wash text-urgent-ink'
      : urgency === 'tight'
        ? 'bg-warning-wash text-warning-ink'
        : 'bg-success-wash text-success-ink';

  return (
    <span
      title={
        ctwa
          ? 'Tempo restante da janela de 72h (lead de anúncio Click-to-WhatsApp)'
          : 'Tempo restante da janela de 24h do WhatsApp'
      }
      className={`${base} ${cls}`}
    >
      <Hourglass aria-hidden="true" className="h-3 w-3" />
      Janela <span className="font-mono tabular-nums">{formatMsLeft(windowState.msLeft)}</span>
    </span>
  );
}

function HeaderAvatar({ name, avatarUrl }: { name: string | null; avatarUrl: string | null }) {
  const [failed, setFailed] = useState(false);
  const initials = getInitials(name);
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
      {initials || <User aria-hidden="true" className="h-4.5 w-4.5" />}
    </div>
  );
}

/** 44rem: abaixo disso o cabeçalho esconde o telefone e recolhe ações no menu. */
const COMPACT_HEADER_PX = 704;

/**
 * true quando o elemento está mais estreito que `px`. Precisa ser JS (e não
 * `@container`) porque o menu "Mais ações" abre num portal, fora do cabeçalho —
 * uma container query não alcançaria as linhas de lá.
 */
function useIsNarrowerThan(px: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [isNarrow, setIsNarrow] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const measure = () => setIsNarrow(el.offsetWidth < px);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [px]);
  return [ref, isNarrow] as const;
}

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
/** Ação só-ícone do cabeçalho: sempre ghost de 32px; ligada = tint da marca. */
const ICON_ACTION = 'h-8 w-8 text-muted-foreground hover:text-foreground';
const ICON_ACTION_ON = 'h-8 w-8 bg-primary/10 text-primary hover:bg-primary/15';
/** Linha do menu "Mais ações" (desktop). */
const MENU_ROW = `flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`;
const MENU_ICON = 'h-4 w-4 shrink-0 text-muted-foreground';
const MENU_LABEL =
  'px-2.5 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground';
const MENU_DIVIDER = 'my-1 h-px bg-border';
/** Linha da folha de ações (mobile): 44px de toque, um ícone neutro por linha. */
const SHEET_ROW = `flex min-h-11 w-full items-center gap-3 px-4 py-3 text-left text-sm text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring`;
const SHEET_ICON = 'h-5 w-5 shrink-0 text-muted-foreground';

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
  onToggleSearch,
  searchOpen,
}: ConversationHeaderProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [clientCardOpen, setClientCardOpen] = useState(false);
  const [callConfirmOpen, setCallConfirmOpen] = useState(false);
  const hasNotes = !!conversation.contact.notes?.trim();
  const { can } = usePermissions();
  const [headerRef, isCompact] = useIsNarrowerThan(COMPACT_HEADER_PX);
  // Mesmas queries (e mesmas chaves) do selo de cadência e do contador de
  // agendadas: aqui só servem para o menu "Mais ações" avisar, com um ponto,
  // que há algo recolhido dentro dele quando o cabeçalho está estreito.
  const { data: enrollment } = useActiveEnrollment(conversation.id);
  const { data: scheduled } = useScheduledMessages(conversation.id);
  const hasCollapsedState =
    !!enrollment?.active ||
    (scheduled ?? []).some((m) => m.status === 'PENDING') ||
    hasNotes;
  const canCall = !conversation.isGroup && !!conversation.contact?.phone;
  const openNotes = onToggleObs ?? (() => setNotesOpen(true));

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

  // Estado + ações de IA da conversa — achatados em linhas dentro do menu ⋯
  // (mesma lógica do ConversationAiToggle, sem o dropdown próprio).
  const aiCurrent: boolean | null =
    conversation.aiEnabled === undefined ? null : (conversation.aiEnabled as boolean | null);
  const AI_OPTIONS: Array<{ value: boolean | null; label: string; icon: React.ElementType; iconCls: string }> = [
    { value: null, label: 'IA no padrão', icon: Bot, iconCls: MENU_ICON },
    { value: true, label: 'IA forçada', icon: Sparkles, iconCls: MENU_ICON },
    { value: false, label: 'IA pausada', icon: BotOff, iconCls: MENU_ICON },
  ];
  const setAi = (next: boolean | null) =>
    handleAction(
      () => inboxService.toggleAi(conversation.id, next),
      next === null
        ? 'IA voltou pro padrão (segue config global)'
        : next
          ? 'IA forçada nesta conversa (sobrepõe global)'
          : 'IA pausada nesta conversa',
    );
  const engageAi = () =>
    handleAction(async () => {
      const result = await inboxService.engageAi(conversation.id);
      if (!result.engaged) {
        throw new Error(
          result.reason ? `IA não pôde engajar: ${result.reason}` : 'Não foi possível engajar a IA',
        );
      }
      return result;
    }, 'IA engajada — vai responder em segundos');

  return (
    <div
      ref={headerRef}
      className="@container/header flex items-center justify-between gap-2 border-b border-border bg-card/40 px-3 py-2 backdrop-blur lg:gap-3 lg:px-4 lg:py-3"
    >
      {/* Quem cede espaço é a direita: abaixo de 44rem as ações secundárias
          vão para o menu "Mais ações" e o telefone some (continua na ficha do
          cliente). A linha de ações nunca quebra. */}
      <div className="flex min-w-0 flex-1 items-center gap-2 lg:gap-3">
        {onBack && (
          <Button
            onClick={onBack}
            aria-label="Voltar para a lista de conversas"
            title="Voltar"
            variant="ghost"
            size="icon"
            className="-ml-1 shrink-0 lg:hidden"
          >
            <ChevronLeft aria-hidden="true" className="h-5 w-5" />
          </Button>
        )}
        <button
          type="button"
          onClick={() => setClientCardOpen(true)}
          title="Ver ficha do cliente"
          aria-label="Ver ficha do cliente"
          className={`shrink-0 rounded-full transition hover:opacity-90 focus-visible:ring-offset-2 focus-visible:ring-offset-background ${FOCUS_RING}`}
        >
          <HeaderAvatar
            name={conversation.contact.name}
            avatarUrl={conversation.contact.avatarUrl}
          />
        </button>
        <div className="flex min-w-0 flex-1 flex-col">
          <button
            type="button"
            onClick={() => setClientCardOpen(true)}
            title="Ver ficha do cliente"
            className={`max-w-full self-start truncate rounded text-left text-sm font-semibold text-foreground hover:text-primary hover:underline ${FOCUS_RING}`}
          >
            {conversation.contact.name || conversation.contact.phone || 'Desconhecido'}
          </button>
          {/* Uma linha só, sem quebra: o chip do canal trunca, o da janela não. */}
          <div className="mt-0.5 flex min-w-0 items-center gap-2">
            {!isCompact && conversation.contact.phone && conversation.contact.name && (
              <span className="hidden shrink-0 font-mono text-xs tabular-nums text-muted-foreground lg:inline">
                {conversation.contact.phone}
              </span>
            )}
            <ChannelBadge
              type={conversation.channel.type}
              name={conversation.channel.name}
            />
            {windowState && <WindowChip windowState={windowState} />}
          </div>
        </div>
      </div>

      <div className="hidden flex-nowrap items-center justify-end gap-1 lg:flex [&>*]:shrink-0">
        {!isCompact && (
          <>
            <CadenceBadge conversationId={conversation.id} />
            <ScheduledMessagesPopover conversationId={conversation.id} />
          </>
        )}
        {/* Sempre montado: o lembrete da ligação mora nele. Estreito, o ícone
            some e quem abre o lembrete é a linha do menu. */}
        <CallButton
          conversation={conversation}
          hideTrigger={isCompact}
          confirmOpen={callConfirmOpen}
          onConfirmOpenChange={setCallConfirmOpen}
        />
        {onToggleIntel && (
          <Button
            onClick={onToggleIntel}
            title="Painel Inteligente"
            aria-label="Painel Inteligente"
            aria-pressed={!!intelOpen}
            variant="ghost"
            size="icon"
            className={intelOpen ? ICON_ACTION_ON : ICON_ACTION}
          >
            <Sparkles aria-hidden="true" className="h-4 w-4" />
          </Button>
        )}
        {!isCompact && onToggleSearch && (
          <Button
            onClick={onToggleSearch}
            title="Buscar nesta conversa"
            aria-label="Buscar nesta conversa"
            aria-pressed={!!searchOpen}
            variant="ghost"
            size="icon"
            className={searchOpen ? ICON_ACTION_ON : ICON_ACTION}
          >
            <Search aria-hidden="true" className="h-4 w-4" />
          </Button>
        )}
        {!isCompact && (
          <Button
            onClick={openNotes}
            title={hasNotes ? 'Observações do lead' : 'Adicionar observação'}
            aria-label={hasNotes ? 'Observações do lead (há anotações)' : 'Adicionar observação'}
            aria-pressed={onToggleObs ? !!obsOpen : undefined}
            variant="ghost"
            size="icon"
            className={`relative ${obsOpen ? ICON_ACTION_ON : ICON_ACTION}`}
          >
            <NotebookPen aria-hidden="true" className="h-4 w-4" />
            {hasNotes && (
              <span aria-hidden="true" className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-primary" />
            )}
          </Button>
        )}
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
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 px-2 text-muted-foreground hover:bg-urgent-wash hover:text-urgent-ink"
            title="Encerrar conversa"
            aria-label="Encerrar conversa"
          >
            <XCircle aria-hidden="true" className="h-4 w-4" />
            <span className="hidden @[64rem]/header:inline">Encerrar</span>
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
            <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />
            Reabrir
          </Button>
        )}

        {/* Ações secundárias agrupadas num menu. Com o cabeçalho estreito ele
            também recebe busca, observações, ligação, cadência e agendadas. */}
        <Popover className="relative">
          <PopoverButton
            title="Mais ações"
            aria-label={
              isCompact && hasCollapsedState
                ? 'Mais ações (há itens ativos no menu)'
                : 'Mais ações'
            }
            className={`relative inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground data-[open]:bg-muted data-[open]:text-foreground ${FOCUS_RING}`}
          >
            <MoreVertical aria-hidden="true" className="h-4 w-4" />
            {isCompact && hasCollapsedState && (
              <span aria-hidden="true" className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-primary" />
            )}
          </PopoverButton>
          <PopoverPanel
            anchor="bottom end"
            transition
            className="z-50 w-64 rounded-xl border border-border bg-popover p-1 shadow-elevated outline-none transition duration-100 ease-out data-[closed]:scale-95 data-[closed]:opacity-0 [--anchor-gap:0.375rem]"
          >
            {({ close }) => (
              <>
                {isCompact && (
                  <>
                    {/* Selos de estado (cadência, agendadas): somem sozinhos
                        quando não há nada, e aí a linha inteira some junto. */}
                    <div className="flex flex-wrap items-center gap-1.5 px-1.5 pb-1 pt-1 empty:hidden">
                      <CadenceBadge conversationId={conversation.id} />
                      <ScheduledMessagesPopover conversationId={conversation.id} />
                    </div>
                    {onToggleSearch && (
                      <button
                        type="button"
                        aria-pressed={!!searchOpen}
                        onClick={() => {
                          close();
                          onToggleSearch();
                        }}
                        className={MENU_ROW}
                      >
                        <Search aria-hidden="true" className={MENU_ICON} />
                        Buscar nesta conversa
                        {searchOpen && <Check aria-hidden="true" className="ml-auto h-3.5 w-3.5 text-primary" />}
                      </button>
                    )}
                    <button
                      type="button"
                      aria-pressed={onToggleObs ? !!obsOpen : undefined}
                      onClick={() => {
                        close();
                        openNotes();
                      }}
                      className={MENU_ROW}
                    >
                      <NotebookPen aria-hidden="true" className={MENU_ICON} />
                      {hasNotes ? 'Observações do lead' : 'Adicionar observação'}
                      {hasNotes && (
                        <span aria-hidden="true" className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
                      )}
                    </button>
                    {canCall && (
                      <button
                        type="button"
                        onClick={() => {
                          close();
                          setCallConfirmOpen(true);
                        }}
                        className={MENU_ROW}
                      >
                        <Phone aria-hidden="true" className={MENU_ICON} />
                        Ligar para o contato
                      </button>
                    )}
                    <div className={MENU_DIVIDER} />
                  </>
                )}

                {/* Agente que responde — seletor de agente (headless-ui aninhado) */}
                <div className={MENU_LABEL}>Agente que responde</div>
                <div className="px-1 pb-1">
                  <AgentPinPopover conversation={conversation} onChanged={onUpdate} />
                </div>

                <div className={MENU_DIVIDER} />

                {/* IA nesta conversa — opções do toggle achatadas em linhas */}
                {can('inbox.ai.toggle') && (
                  <>
                    <div id="header-ai-options-label" className={MENU_LABEL}>
                      IA nesta conversa
                    </div>
                    <div role="radiogroup" aria-labelledby="header-ai-options-label">
                      {AI_OPTIONS.map((opt) => {
                        const OptIcon = opt.icon;
                        const active = opt.value === aiCurrent;
                        return (
                          <button
                            key={String(opt.value)}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            onClick={() => {
                              close();
                              setAi(opt.value);
                            }}
                            disabled={isLoading}
                            className={`${MENU_ROW} ${active ? 'font-medium' : ''}`}
                          >
                            <OptIcon aria-hidden="true" className={opt.iconCls} />
                            {opt.label}
                            {active && (
                              <Check aria-hidden="true" className="ml-auto h-3.5 w-3.5 text-primary" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        close();
                        engageAi();
                      }}
                      disabled={isLoading || aiCurrent === false}
                      title={
                        aiCurrent === false
                          ? 'A IA está pausada nesta conversa. Reative antes de engajar.'
                          : 'Faz a IA ler o histórico e responder agora, sem esperar o cliente.'
                      }
                      className={MENU_ROW}
                    >
                      <Play aria-hidden="true" className={MENU_ICON} />
                      Engajar IA agora
                    </button>
                  </>
                )}

                <div className={MENU_DIVIDER} />

                {conversation.status !== 'CLOSED' && (
                  <button
                    type="button"
                    onClick={() => {
                      close();
                      setTransferOpen(true);
                    }}
                    className={MENU_ROW}
                  >
                    <ArrowRightLeft aria-hidden="true" className={MENU_ICON} />
                    Transferir atendente
                  </button>
                )}
                <CadenceStartMenuItem
                  conversationId={conversation.id}
                  onDone={close}
                />
                {onToggleProject && conversation.isGroup && (
                  <button
                    type="button"
                    aria-pressed={!!projectOpen}
                    onClick={() => {
                      close();
                      onToggleProject();
                    }}
                    className={MENU_ROW}
                  >
                    <FolderKanban aria-hidden="true" className={MENU_ICON} />
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
        aria-label="Ações da conversa"
        title="Ações da conversa"
        variant="ghost"
        size="icon"
        className="shrink-0 lg:hidden"
      >
        <MoreVertical aria-hidden="true" className="h-5 w-5" />
      </Button>

      <BottomSheet open={actionsOpen} onClose={() => setActionsOpen(false)} title="Ações da conversa">
        <div className="flex flex-col">
          <button
            type="button"
            onClick={() => { setActionsOpen(false); setNotesOpen(true); }}
            className={SHEET_ROW}
          >
            <NotebookPen aria-hidden="true" className={SHEET_ICON} /> Observações do lead
            {hasNotes && <span aria-hidden="true" className="ml-auto h-2 w-2 rounded-full bg-primary" />}
          </button>
          {can('inbox.ai.toggle') && (
            <div className="flex min-h-11 items-center gap-3 px-4 py-2">
              <Bot aria-hidden="true" className={SHEET_ICON} />
              <span className="flex-1 text-sm text-foreground">IA automática</span>
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
          )}
          {conversation.status !== 'CLOSED' && (
            <button
              type="button"
              onClick={() => { setActionsOpen(false); handleAction(() => inboxService.closeConversation(conversation.id), 'Conversa encerrada'); }}
              className={SHEET_ROW}
            >
              <XCircle aria-hidden="true" className={SHEET_ICON} /> Encerrar conversa
            </button>
          )}
          {conversation.status === 'CLOSED' && (
            <button
              type="button"
              onClick={() => { setActionsOpen(false); handleAction(() => inboxService.reopenConversation(conversation.id), 'Conversa reaberta'); }}
              className={SHEET_ROW}
            >
              <RotateCcw aria-hidden="true" className={SHEET_ICON} /> Reabrir conversa
            </button>
          )}
          {onToggleProject && conversation.isGroup && (
            <button type="button" onClick={() => { setActionsOpen(false); onToggleProject(); }} className={SHEET_ROW}>
              <FolderKanban aria-hidden="true" className={SHEET_ICON} /> Projeto do grupo
            </button>
          )}
          {onToggleIntel && (
            <button type="button" onClick={() => { setActionsOpen(false); onToggleIntel(); }} className={SHEET_ROW}>
              <Sparkles aria-hidden="true" className={SHEET_ICON} /> Painel Inteligente
            </button>
          )}
          {conversation.status !== 'CLOSED' && (
            <button type="button" onClick={() => { setActionsOpen(false); setTransferOpen(true); }} className={SHEET_ROW}>
              <ArrowRightLeft aria-hidden="true" className={SHEET_ICON} /> Transferir atendente
            </button>
          )}
          <CallButton conversation={conversation} asMenuItem onDone={() => setActionsOpen(false)} />
        </div>
      </BottomSheet>

      <ClientCardDrawer
        conversation={conversation}
        open={clientCardOpen}
        onClose={() => setClientCardOpen(false)}
        onUpdate={onUpdate}
      />

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
