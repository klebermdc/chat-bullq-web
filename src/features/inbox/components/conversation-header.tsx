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
      className="inline-flex min-w-0 max-w-[240px] shrink items-center gap-1.5 whitespace-nowrap rounded-full bg-foreground/[0.07] px-2.5 py-1 text-xs font-semibold text-foreground"
    >
      <span aria-hidden="true" className={`h-[7px] w-[7px] shrink-0 rounded-full ${dot}`} />
      <span className="sr-only">{platform}: </span>
      <span className="min-w-0 truncate">{name}</span>
    </span>
  );
}

/**
 * Chip da janela de atendimento do WhatsApp Cloud API. Verde quando aberta com
 * folga, âmbar quando falta ≤1h, vermelho quando fechada (só template aprovado
 * envia). O rótulo diz "de 24h" ou "de anúncio" conforme a regra vigente — lead
 * vindo de anúncio Click-to-WhatsApp ganha o prazo maior que a Meta informar.
 */
function WindowChip({ windowState }: { windowState: WindowState }) {
  if (!windowState.applicable) return null;
  // Sem INBOUND conhecida não há janela real (nem aberta nem fechada) → não mostra chip.
  if (windowState.expiresAt == null) return null;

  const base =
    'inline-flex w-fit shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold';
  const kindLabel = windowKindLabel(windowState.kind);
  const ctwa = windowState.kind === 'ctwa72';

  if (windowState.closed) {
    return (
      <span
        title={`Janela ${kindLabel} fechada — só é possível enviar um template aprovado`}
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
          ? 'Tempo restante da janela de anúncio (lead de Click-to-WhatsApp; o prazo é o que a Meta informa)'
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
        className="h-11 w-11 shrink-0 rounded-full bg-muted object-cover lg:h-12 lg:w-12"
      />
    );
  }
  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-base font-bold text-primary lg:h-12 lg:w-12 lg:text-[17px]">
      {initials || <User aria-hidden="true" className="h-5 w-5" />}
    </div>
  );
}

/**
 * 44rem: abaixo disso o cabeçalho recolhe ações no menu. O telefone pede mais
 * folga — só aparece com o cabeçalho em 56rem ou mais (classe no próprio span).
 */
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
/**
 * Tamanho das ações do cabeçalho: 40px quando há folga (cabeçalho ≥ 56rem) e
 * 36px abaixo disso — com a lista em 384px e a tela em ~1024px, 40px não cabe
 * sem espremer o nome. Encolhe o botão em vez de tirar ação da linha.
 */
const ACTION_HEIGHT = 'h-9 @[56rem]/header:h-10';
const ACTION_SIZE = `${ACTION_HEIGHT} w-9 rounded-xl @[56rem]/header:w-10`;
const ACTION_GLYPH = 'h-5 w-5';
/** Ação só-ícone do cabeçalho: ghost de 36–40px; hover e ligada = tint da marca. */
const ICON_ACTION = `${ACTION_SIZE} text-muted-foreground hover:bg-primary/10 hover:text-primary`;
const ICON_ACTION_ON = `${ACTION_SIZE} bg-primary/10 text-primary hover:bg-primary/15`;
/** Botão só-ícone do celular (voltar, ações): 44px de toque. */
const TOUCH_ICON = 'h-11 w-11 shrink-0 rounded-xl text-muted-foreground hover:bg-primary/10 hover:text-primary lg:hidden';
/** Linha do menu "Mais ações" (desktop): 40px, texto de 14px. */
const MENU_ROW = `flex min-h-10 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-foreground hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`;
const MENU_ICON = 'h-[18px] w-[18px] shrink-0 text-muted-foreground';
const MENU_CHECK = 'ml-auto h-4 w-4 shrink-0 text-primary';
const MENU_LABEL =
  'px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground';
const MENU_DIVIDER = 'my-1.5 h-px bg-border';
/** Linha da folha de ações (mobile): 48px de toque, um ícone neutro por linha. */
const SHEET_ROW = `flex min-h-12 w-full items-center gap-3 px-4 py-3 text-left text-[15px] text-foreground hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring`;
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
      className="@container/header flex items-center justify-between gap-2 border-b border-border bg-card px-2.5 py-2.5 lg:gap-3 lg:px-4.5 lg:py-3.5"
    >
      {/* Quem cede espaço é a direita: abaixo de 44rem as ações secundárias
          vão para o menu "Mais ações"; abaixo de 56rem o telefone some
          (continua na ficha do cliente) e os botões caem de 40 para 36px.
          A linha de ações nunca quebra. */}
      <div className="flex min-w-0 flex-1 items-center gap-2 lg:gap-3.5">
        {onBack && (
          <Button
            onClick={onBack}
            aria-label="Voltar para a lista de conversas"
            title="Voltar"
            variant="ghost"
            size="icon"
            className={TOUCH_ICON}
          >
            <ChevronLeft aria-hidden="true" className="h-6 w-6" />
          </Button>
        )}
        <button
          type="button"
          onClick={() => setClientCardOpen(true)}
          title="Ver ficha do cliente"
          aria-label="Ver ficha do cliente"
          className={`shrink-0 rounded-full transition hover:opacity-90 focus-visible:ring-offset-2 focus-visible:ring-offset-card ${FOCUS_RING}`}
        >
          <HeaderAvatar
            name={conversation.contact.name}
            avatarUrl={conversation.contact.avatarUrl}
          />
        </button>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <button
            type="button"
            onClick={() => setClientCardOpen(true)}
            title="Ver ficha do cliente"
            className={`max-w-full self-start truncate rounded font-display text-[17px] font-bold leading-tight tracking-[-0.015em] text-foreground hover:text-primary hover:underline lg:text-lg lg:leading-tight ${FOCUS_RING}`}
          >
            {conversation.contact.name || conversation.contact.phone || 'Desconhecido'}
          </button>
          {/* Uma linha só, sem quebra: o chip do canal trunca, o da janela não. */}
          <div className="flex min-w-0 items-center gap-1.5">
            {!isCompact && conversation.contact.phone && conversation.contact.name && (
              <span className="hidden shrink-0 font-mono text-[12.5px] tabular-nums text-muted-foreground lg:@[56rem]/header:inline">
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
            <Sparkles aria-hidden="true" className={ACTION_GLYPH} />
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
            <Search aria-hidden="true" className={ACTION_GLYPH} />
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
            <NotebookPen aria-hidden="true" className={ACTION_GLYPH} />
            {hasNotes && (
              <span aria-hidden="true" className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary ring-2 ring-card" />
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
            className={`${ACTION_HEIGHT} gap-1.5 rounded-xl px-2 text-sm font-semibold text-muted-foreground hover:bg-urgent-wash hover:text-urgent-ink @[64rem]/header:px-3`}
            title="Encerrar conversa"
            aria-label="Encerrar conversa"
          >
            <XCircle aria-hidden="true" className={ACTION_GLYPH} />
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
            className={`${ACTION_HEIGHT} rounded-xl px-3.5 text-sm font-bold`}
          >
            <RotateCcw aria-hidden="true" className="h-4 w-4" />
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
            className={`relative inline-flex ${ACTION_SIZE} items-center justify-center text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary data-[open]:bg-primary/10 data-[open]:text-primary ${FOCUS_RING}`}
          >
            <MoreVertical aria-hidden="true" className={ACTION_GLYPH} />
            {isCompact && hasCollapsedState && (
              <span aria-hidden="true" className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary ring-2 ring-card" />
            )}
          </PopoverButton>
          <PopoverPanel
            anchor="bottom end"
            transition
            className="z-50 w-72 rounded-2xl border border-border bg-popover p-1.5 shadow-overlay outline-none transition duration-100 ease-out data-[closed]:scale-95 data-[closed]:opacity-0 [--anchor-gap:0.375rem]"
          >
            {({ close }) => (
              <>
                {isCompact && (
                  <>
                    {/* Selos de estado (cadência, agendadas): somem sozinhos
                        quando não há nada, e aí a linha inteira some junto. */}
                    <div className="flex flex-wrap items-center gap-1.5 px-1.5 pb-1.5 pt-1 empty:hidden">
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
                        {searchOpen && <Check aria-hidden="true" className={MENU_CHECK} />}
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
                        <span aria-hidden="true" className="ml-auto h-2 w-2 rounded-full bg-primary" />
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
                <div className="px-1.5 pb-1">
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
                            className={`${MENU_ROW} ${active ? 'font-semibold' : ''}`}
                          >
                            <OptIcon aria-hidden="true" className={opt.iconCls} />
                            {opt.label}
                            {active && (
                              <Check aria-hidden="true" className={MENU_CHECK} />
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
        className={TOUCH_ICON}
      >
        <MoreVertical aria-hidden="true" className="h-6 w-6" />
      </Button>

      <BottomSheet open={actionsOpen} onClose={() => setActionsOpen(false)} title="Ações da conversa">
        <div className="flex flex-col">
          <button
            type="button"
            onClick={() => { setActionsOpen(false); setNotesOpen(true); }}
            className={SHEET_ROW}
          >
            <NotebookPen aria-hidden="true" className={SHEET_ICON} /> Observações do lead
            {hasNotes && <span aria-hidden="true" className="ml-auto h-2.5 w-2.5 rounded-full bg-primary" />}
          </button>
          {can('inbox.ai.toggle') && (
            <div className="flex min-h-12 items-center gap-3 px-4 py-2">
              <Bot aria-hidden="true" className={SHEET_ICON} />
              <span className="flex-1 text-[15px] text-foreground">IA automática</span>
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
