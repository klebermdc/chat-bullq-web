'use client';

import { Fragment, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, CheckCheck, Clock, AlertCircle, ArrowDown, ExternalLink, Reply, Trash2, X, Ban, Paperclip, LayoutTemplate, MessageSquare } from 'lucide-react';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { EmptyState, LoadingState } from '@/components/ui/empty-state';
import { toast } from 'sonner';
import {
  inboxService,
  type Conversation,
  type ConversationBrief,
  type Message,
} from '../services/inbox.service';
import { isConversationBoundary, prependUnique } from '../lib/contact-history';
import { ConversationDivider } from './conversation-divider';
import { PreviousConversationsButton } from './previous-conversations-button';
import { ChatInput, type ChatInputHandle } from './chat-input';
import { dragHasFiles, filesFromDataTransfer } from '../lib/attachment-intake';
import { ConversationHeader } from './conversation-header';
import { MessageSearchPanel } from './message-search-panel';
import {
  LIVE_WINDOW,
  shouldAppendIncoming,
  windowAfterJump,
  windowAfterLoadOlder,
  type HistoryWindow,
} from '../lib/history-window';
import { mergeLatestMessages } from '../lib/merge-latest';
import { indexByExternalId, resolveQuote } from '../lib/quote';
import { sharedContactsOf } from '../lib/shared-contacts';
import { ContactCardBubble } from './contact-card-bubble';
import { NewConversationDialog } from './new-conversation-dialog';
import { StoryReplyCard } from './story-reply-card';
import { MessageReactionBar } from './message-reaction-bar';
import { AudioMessagePlayer } from './audio-message-player';
import { CallCard } from './call-card';
import {
  MediaImage,
  MediaVideo,
  MediaDocument,
  MediaSticker,
  MediaLocation,
} from './media-bubbles';
import { useSocket } from '../hooks/use-socket';
import { useAuthStore } from '@/stores/auth-store';
import { PendingActionsList } from '../pending-actions/pending-actions-list';
import { computeWindowState, lastInboundAt } from '../lib/window-state';
import { statusTooltip } from '../lib/message-status';
import { TemplatePickerDialog } from '@/features/templates/components/template-picker-dialog';
import { templatesService, type Template } from '@/features/templates/services/templates.service';
import { getErrorMessage } from '@/lib/errors';
import { getInitials } from '@/lib/initials';

/** Variáveis {{n}} distintas de um texto, em ordem crescente. */
function templateVarsAsc(text: string): string[] {
  const seen = new Set<string>();
  const re = /\{\{(\d+)\}\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) seen.add(m[1]);
  return [...seen].sort((a, b) => Number(a) - Number(b));
}

/**
 * Reconstrói o texto real da mensagem de template: pega o corpo do template
 * (com `{{1}}`, `{{2}}`…) e substitui pelos valores enviados. Os parâmetros do
 * corpo chegam posicionais e na mesma ordem crescente das variáveis. Usa função
 * de replace pra não interpretar `$` que possa haver no valor.
 */
function fillTemplateBody(bodyText: string, values: string[]): string {
  const vars = templateVarsAsc(bodyText);
  let out = bodyText;
  vars.forEach((n, i) => {
    const val = values[i];
    out = out.replaceAll(`{{${n}}}`, () => (val ?? `{{${n}}}`));
  });
  return out;
}

interface ChatPanelProps {
  conversation: Conversation;
  onConversationUpdate: () => void;
  /** Forwarded to ConversationHeader so the agent-runs sidebar toggle
   *  shows up in the chat header. */
  onToggleAgentLogs?: () => void;
  agentLogsOpen?: boolean;
  /** Forwarded to ConversationHeader for the Project panel toggle (groups). */
  onToggleProject?: () => void;
  projectOpen?: boolean;
  /** Forwarded to ConversationHeader for the Painel Inteligente toggle. */
  onToggleIntel?: () => void;
  intelOpen?: boolean;
  /** Forwarded to ConversationHeader for the Observações panel toggle. */
  onToggleObs?: () => void;
  obsOpen?: boolean;
  /** Mobile: volta para a lista de conversas. */
  onBack?: () => void;
  /** Ref imperativo pro composer — permite inserir texto (ex.: resposta
   *  sugerida pelo Painel Inteligente) sem enviar automaticamente. */
  chatInputRef?: React.Ref<import('./chat-input').ChatInputHandle>;
  /** Abre outra conversa (ex.: a criada pelo "Conversar" de um cartão de contato). */
  onOpenConversation?: (conversationId: string) => void;
}

/** Estado de entrega por extenso, para leitor de tela (o ícone é só visual). */
const STATUS_SR_LABEL: Record<string, string> = {
  QUEUED: 'Enviando',
  SENT: 'Enviada',
  DELIVERED: 'Entregue',
  READ: 'Lida',
};

const statusIcons: Record<string, React.ElementType> = {
  QUEUED: Clock,
  SENT: Check,
  DELIVERED: CheckCheck,
  READ: CheckCheck,
  FAILED: AlertCircle,
};


/** Separador de dia: pílula mono sobre `bg-card`, solta no fundo lilás da conversa. */
const DAY_PILL_CLS =
  'rounded-full bg-card px-3 py-1 font-mono text-xs font-medium tabular-nums text-muted-foreground';
/** Evento de sistema: pílula discreta, sem cara de balão de cliente/atendente. */
const SYSTEM_PILL_CLS =
  'max-w-md rounded-2xl bg-foreground/5 px-3.5 py-1.5 text-center text-xs leading-snug text-muted-foreground';
/** Ações no hover da mensagem (responder, deletar): alvo de 32px sobre `bg-card`. */
const HOVER_ACTION_CLS =
  'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-card text-muted-foreground shadow-soft transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
/** Balão: 18px de raio com a "cauda" de 6px no canto de quem fala. */
const BUBBLE_SENT_CLS = 'rounded-[18px] rounded-br-[6px] bg-bubble text-bubble-foreground';
const BUBBLE_RECEIVED_CLS =
  'rounded-[18px] rounded-bl-[6px] bg-bubble-in text-bubble-in-foreground shadow-soft';

/** Duração do destaque da mensagem alcançada pela busca. Piscar é sinal, não estado. */
const HIGHLIGHT_MS = 2000;
/** Intervalo do backfill de segurança com a aba visível. */
const BACKFILL_POLL_MS = 60_000;

const URL_REGEX = /(https?:\/\/[^\s]+)/gi;
const IG_CDN_HOSTS = /(lookaside\.fbsbx\.com|cdninstagram\.com|fbcdn\.net)/i;

function safeHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function LinkPreviewCard({ url, isOutbound }: { url: string; isOutbound: boolean }) {
  const [imgOk, setImgOk] = useState(IG_CDN_HOSTS.test(url));
  const host = safeHostname(url);

  if (imgOk) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="block">
        <img
          src={url}
          alt="Mídia compartilhada"
          className="max-h-64 rounded-xl bg-muted object-cover"
          onError={() => setImgOk(false)}
        />
        <span
          className={`mt-1 block text-xs ${
            isOutbound ? 'text-bubble-foreground/70' : 'text-muted-foreground'
          }`}
        >
          {host}
        </span>
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-[13px] transition-colors ${
        isOutbound
          ? 'border-bubble-foreground/20 bg-bubble-foreground/10 hover:bg-bubble-foreground/15'
          : 'border-border bg-muted hover:bg-muted/70'
      }`}
    >
      <ExternalLink className="h-4 w-4 shrink-0 opacity-70" />
      <span className="truncate font-medium">{host}</span>
    </a>
  );
}

function matchSingleUrl(text: string): string | null {
  const trimmed = text.trim();
  const m = trimmed.match(/^(https?:\/\/\S+)$/i);
  return m ? m[1] : null;
}

function renderInlineTextWithLinks(text: string, isOutbound: boolean) {
  const parts = text.split(URL_REGEX);
  return parts.map((part, i) => {
    if (URL_REGEX.test(part)) {
      URL_REGEX.lastIndex = 0;
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className={`underline underline-offset-2 wrap-break-word ${
            isOutbound ? 'text-bubble-foreground' : 'text-primary'
          }`}
        >
          {part}
        </a>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function MessageText({
  text,
  isOutbound,
  className = '',
}: {
  text: string;
  isOutbound: boolean;
  className?: string;
}) {
  const onlyUrl = matchSingleUrl(text);
  if (onlyUrl) {
    return <LinkPreviewCard url={onlyUrl} isOutbound={isOutbound} />;
  }
  return (
    <p className={`whitespace-pre-wrap wrap-break-word text-[15px] leading-[1.45] ${className}`}>
      {renderInlineTextWithLinks(text, isOutbound)}
    </p>
  );
}

interface TemplateButtonShape {
  type?: string;
  title?: string;
  url?: string;
  payload?: string;
}

interface TemplateElementShape {
  title?: string;
  subtitle?: string;
  imageUrl?: string;
  defaultActionUrl?: string;
  buttons?: TemplateButtonShape[];
}

function TemplateButtonRow({
  buttons,
  isOutbound,
}: {
  buttons: TemplateButtonShape[];
  isOutbound: boolean;
}) {
  return (
    <div className="mt-2 flex flex-col gap-1.5">
      {buttons.map((btn, i) => {
        const label = btn.title || btn.url || btn.payload || 'Botão';
        const baseClass = `block rounded-xl border px-3 py-2 text-center text-[13px] font-semibold transition-colors ${
          isOutbound
            ? 'border-bubble-foreground/25 bg-bubble-foreground/10 hover:bg-bubble-foreground/20'
            : 'border-border bg-muted text-bubble-in-foreground hover:bg-muted/70'
        }`;
        if (btn.url) {
          return (
            <a key={i} href={btn.url} target="_blank" rel="noopener noreferrer" className={baseClass}>
              {label}
            </a>
          );
        }
        return (
          <span
            key={i}
            className={`${baseClass} cursor-default opacity-80`}
            title={btn.payload || btn.type || ''}
          >
            {label}
          </span>
        );
      })}
    </div>
  );
}

function TemplateMessage({
  content,
  isOutbound,
  templatesByName,
}: {
  content: Record<string, any>;
  isOutbound: boolean;
  templatesByName?: Record<string, Template>;
}) {
  // Shape da Cloud API (enviado pelo picker): { name, language, components: [...] }
  if (Array.isArray(content?.components)) {
    const name = content?.name as string | undefined;
    const body = content.components.find(
      (c: any) => (c?.type || '').toLowerCase() === 'body',
    );
    const values: string[] = Array.isArray(body?.parameters)
      ? body.parameters.map((p: any) => p?.text ?? '')
      : [];

    // Se ainda temos a definição do template, reconstruímos a mensagem real
    // (corpo com as variáveis preenchidas) em vez de mostrar só o nome.
    const tpl = name ? templatesByName?.[name] : undefined;
    if (tpl?.components?.body?.text) {
      const rendered = fillTemplateBody(tpl.components.body.text, values);
      const headerText =
        tpl.components.header?.format === 'TEXT'
          ? tpl.components.header.text
          : undefined;
      const footerText = tpl.components.footer?.text;
      return (
        <div className="space-y-1">
          {headerText && (
            <p className="text-[15px] font-semibold leading-[1.45]">{headerText}</p>
          )}
          <MessageText text={rendered} isOutbound={isOutbound} />
          {footerText && (
            <p className="text-xs opacity-75">{footerText}</p>
          )}
        </div>
      );
    }

    // Fallback: template não encontrado (ex.: apagado) — mostra nome + valores.
    return (
      <div
        className={`space-y-1 rounded-xl border px-3 py-2 ${
          isOutbound
            ? 'border-bubble-foreground/20 bg-bubble-foreground/5'
            : 'border-border bg-muted'
        }`}
      >
        <p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide opacity-80">
          <LayoutTemplate aria-hidden="true" className="h-3.5 w-3.5" />
          Template
        </p>
        {name && (
          <p className="font-mono text-sm font-semibold">{name}</p>
        )}
        {values.filter(Boolean).length > 0 && (
          <p className="text-xs opacity-90">
            {values.filter(Boolean).join(' · ')}
          </p>
        )}
      </div>
    );
  }

  const tpl = (content?.template ?? {}) as {
    templateType?: string;
    text?: string;
    buttons?: TemplateButtonShape[];
    elements?: TemplateElementShape[];
  };
  const headerText = tpl.text || content?.text;
  const elements = tpl.elements ?? [];
  const buttons = tpl.buttons ?? [];

  return (
    <div className="space-y-2">
      {headerText && <MessageText text={headerText} isOutbound={isOutbound} />}

      {elements.map((el, i) => (
        <div
          key={i}
          className={`overflow-hidden rounded-xl border ${
            isOutbound
              ? 'border-bubble-foreground/20 bg-bubble-foreground/5'
              : 'border-border bg-muted'
          }`}
        >
          {el.imageUrl && (
            <a
              href={el.defaultActionUrl || el.imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <img
                src={el.imageUrl}
                alt={el.title || 'Template'}
                className="max-h-48 w-full object-cover"
              />
            </a>
          )}
          {(el.title || el.subtitle) && (
            <div className="px-3 py-2">
              {el.title && <p className="text-sm font-semibold">{el.title}</p>}
              {el.subtitle && (
                <p className="mt-0.5 text-[13px] opacity-80">{el.subtitle}</p>
              )}
            </div>
          )}
          {el.buttons && el.buttons.length > 0 && (
            <div className="px-3 pb-2">
              <TemplateButtonRow buttons={el.buttons} isOutbound={isOutbound} />
            </div>
          )}
        </div>
      ))}

      {buttons.length > 0 && <TemplateButtonRow buttons={buttons} isOutbound={isOutbound} />}

      {!headerText && elements.length === 0 && buttons.length === 0 && (
        <p className="text-[15px] italic leading-[1.45]">[Template]</p>
      )}
    </div>
  );
}

function ContactAvatar({
  name,
  avatarUrl,
  size = 'md',
}: {
  name?: string | null;
  avatarUrl?: string | null;
  size?: 'sm' | 'md';
}) {
  const [failed, setFailed] = useState(false);
  const initials = getInitials(name) || '?';
  const dim = size === 'sm' ? 'h-8 w-8 text-xs' : 'h-10 w-10 text-sm';
  if (avatarUrl && !failed) {
    return (
      <img
        src={avatarUrl}
        alt={name || 'avatar'}
        onError={() => setFailed(true)}
        className={`${dim} shrink-0 rounded-full bg-muted object-cover`}
      />
    );
  }
  return (
    <div
      className={`${dim} flex shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary`}
    >
      {initials}
    </div>
  );
}

/**
 * Rodapé da mensagem: hora + estado de entrega.
 *
 * Falha de envio aparece por extenso ("Não entregue") — um ícone vermelho de
 * 12px ao lado da hora passava batido e o atendente achava que o cliente tinha
 * recebido. O motivo continua no `title`.
 *
 * `insideBubble` muda só a cor. O balão enviado é lilás claro no tema claro e
 * ametista funda no escuro, então nada aqui pode supor fundo escuro: a hora
 * deriva de `bubble-foreground` (70% = 5,6:1 no claro, 5,8:1 no escuro), a
 * falha usa `urgent-ink` (4,6:1 e 5,1:1 sobre `--color-bubble`) e o "lida"
 * usa um azul por tema (`sky-700` 4,5:1 no claro, `sky-300` 6,5:1 no escuro) —
 * o `blue-300` de antes dava 1,4:1 sobre o lilás claro.
 */
function MessageMeta({
  time,
  isOutbound,
  status,
  failedReason,
  insideBubble = false,
  className = '',
}: {
  time: string;
  isOutbound: boolean;
  status: Message['status'];
  failedReason?: Message['failedReason'];
  insideBubble?: boolean;
  className?: string;
}) {
  const StatusIcon = statusIcons[status] || Clock;
  const onSentBubble = insideBubble && isOutbound;
  const isFailed = status === 'FAILED';
  const readClass = onSentBubble ? 'text-sky-700 dark:text-sky-300' : 'text-primary';
  const tooltip = statusTooltip(status, failedReason);
  // O motivo por extenso, sem o "Falhou:" que o tooltip põe na frente. Sem
  // motivo conhecido o tooltip é só "Falhou ao enviar" — aí não há 2ª linha.
  const failureReason = isFailed && /^Falhou:\s*/.test(tooltip)
    ? tooltip.replace(/^Falhou:\s*/, '')
    : null;
  const failedInk = 'text-urgent-ink';
  return (
    <div className={`mt-1 ${className}`}>
      <div
        className={`flex flex-wrap items-center gap-x-1.5 gap-y-0.5 font-mono text-xs font-medium tabular-nums ${
          onSentBubble ? 'text-bubble-foreground/70' : 'text-muted-foreground'
        } ${isOutbound ? 'justify-end' : ''}`}
      >
        <span>{time}</span>
        {isOutbound && isFailed && (
          <span
            title={tooltip}
            className={`inline-flex items-center gap-1 font-sans font-semibold ${failedInk}`}
          >
            <AlertCircle aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
            Não entregue
          </span>
        )}
        {isOutbound && !isFailed && (
          <span title={tooltip} className="inline-flex items-center">
            <StatusIcon aria-hidden="true" className={`h-3.5 w-3.5 ${status === 'READ' ? readClass : ''}`} />
            <span className="sr-only">{STATUS_SR_LABEL[status] ?? tooltip}</span>
          </span>
        )}
      </div>
      {isOutbound && failureReason && (
        // Motivo à vista (não só no title): uma linha, com o texto inteiro no hover.
        <p
          title={failureReason}
          className={`mt-0.5 max-w-[18rem] truncate text-xs ${failedInk} ${isOutbound ? 'ml-auto text-right' : ''}`}
        >
          {failureReason}
        </p>
      )}
    </div>
  );
}

/** Citação (mensagem respondida). Clicável quando a original está carregada. */
function QuoteBlock({
  senderName,
  previewText,
  tone,
  onClick,
}: {
  senderName?: string | null;
  previewText?: string | null;
  /** Onde a citação é desenhada: dentro do balão recebido, do enviado, ou solta. */
  tone: 'inbound' | 'outbound' | 'standalone';
  onClick: () => void;
}) {
  const toneCls =
    tone === 'outbound'
      ? 'border-bubble-foreground/50 bg-bubble-foreground/10 text-bubble-foreground/80 hover:bg-bubble-foreground/15'
      : tone === 'inbound'
        ? 'border-primary/60 bg-bubble-in-foreground/5 text-bubble-in-foreground/80 hover:bg-bubble-in-foreground/10'
        : 'border-primary/60 bg-card text-foreground/80 shadow-soft hover:bg-card/80';
  return (
    <button
      type="button"
      onClick={onClick}
      className={`mb-1.5 block w-full rounded-lg border-l-[3px] px-2.5 py-1.5 text-left text-[13px] leading-snug focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${toneCls}`}
    >
      <span className="sr-only">Em resposta a </span>
      {senderName && (
        <span className="block text-xs font-bold">{senderName}</span>
      )}
      {previewText && (
        <span className="mt-0.5 line-clamp-2 block">{previewText}</span>
      )}
    </button>
  );
}

export function ChatPanel({
  conversation,
  onConversationUpdate,
  onToggleAgentLogs,
  agentLogsOpen,
  onToggleProject,
  projectOpen,
  onToggleIntel,
  intelOpen,
  onToggleObs,
  obsOpen,
  onBack,
  chatInputRef,
  onOpenConversation,
}: ChatPanelProps) {
  const queryClient = useQueryClient();
  const bottomRef = useRef<HTMLDivElement>(null);
  // Arrastar-e-soltar arquivo na conversa (handlers lá embaixo, perto do JSX).
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const dragDepth = useRef(0);
  const composerHandleRef = useRef<ChatInputHandle | null>(null);
  const { on, emit, onReconnect } = useSocket();
  const user = useAuthStore((s) => s.user);

  // Estado da janela de histórico carregada. `pinned` liga quando o usuário
  // saiu do "vivo" — rolou pra cima ou pulou pra uma mensagem antiga. Aí o
  // refetch de foco/reconexão precisa ficar desligado: ele devolveria a lista
  // às últimas 50 e jogaria fora exatamente o histórico que se foi buscar.
  const [historyWindow, setHistoryWindow] = useState<HistoryWindow>(LIVE_WINDOW);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  // Histórico do contato: os atendimentos ANTERIORES, que vivem em outras
  // conversas. Fica desligado até o usuário pedir — misturar atendimentos sem
  // ele pedir confunde mais do que ajuda.
  const [contactHistoryOn, setContactHistoryOn] = useState(false);
  const [hasOlderInHistory, setHasOlderInHistory] = useState(true);
  const [historyConversations, setHistoryConversations] = useState<
    Record<string, ConversationBrief>
  >({});
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [pendingNewCount, setPendingNewCount] = useState(0);
  // Estado, não ref: o sentinela só existe no DOM depois que as mensagens
  // chegam, e um `useRef` não avisa ninguém quando isso acontece — o efeito que
  // liga o IntersectionObserver rodava antes do nó existir e nunca mais.
  // Guardar o nó em estado faz o efeito rodar exatamente quando ele monta.
  const [topSentinel, setTopSentinel] = useState<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  // Quem está no fim acompanha o tempo real; quem subiu pra ler não pode ser
  // arrastado pra baixo. Fica em ref porque a decisão é lida no efeito, não
  // renderizada — em estado, cada pixel de scroll causaria re-render.
  const isNearBottomRef = useRef(true);
  // Falha ao carregar histórico precisa aparecer. O catch mudo daqui foi o que
  // manteve invisível, por dias, uma conversa com 96 mensagens faltando.
  const [olderFailed, setOlderFailed] = useState(false);

  // Trocar de conversa volta tudo pro vivo — janela é estado da conversa, não
  // do painel.
  useEffect(() => {
    setHistoryWindow(LIVE_WINDOW);
    setIsSearchOpen(false);
    setHighlightedMessageId(null);
    setPendingNewCount(0);
    setContactHistoryOn(false);
    setHasOlderInHistory(true);
    setHistoryConversations({});
  }, [conversation.id]);

  const { data, isLoading } = useQuery({
    queryKey: ['messages', conversation.id],
    queryFn: () => inboxService.getMessages(conversation.id),
    // Buracos do socket são cobertos pelo backfill por MESCLA (mais abaixo),
    // que roda mesmo com a janela presa. Um refetch aqui substituiria a lista
    // e jogaria fora o histórico carregado — por isso fica desligado.
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: 5000,
  });

  const messages = data?.messages || [];
  // Citações antigas só têm o id da original: índice montado 1x por lista,
  // não uma busca por mensagem a cada recibo de entrega.
  const messagesByExternalId = useMemo(() => indexByExternalId(messages), [messages]);

  // Só pergunta se há atendimentos anteriores quando a conversa atual já foi
  // carregada inteira. Antes disso a resposta não seria usada e a chamada
  // custaria em toda abertura de conversa.
  const { data: contactHistory } = useQuery({
    queryKey: ['contact-history-availability', conversation.id],
    queryFn: () => inboxService.getContactHistoryAvailability(conversation.id),
    enabled: !historyWindow.hasOlder && !contactHistoryOn && messages.length > 0,
    staleTime: 60000,
  });

  // "now" que avança a cada 30s pra a janela de 24h ir contando/expirando
  // sozinha sem depender de nova mensagem.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  const windowState = computeWindowState({
    channelType: conversation.channel?.type,
    lastInboundAt: lastInboundAt(messages),
    windowExpiresAt: conversation.windowExpiresAt,
    windowKind: conversation.windowKind,
    now,
  });

  // Definições dos templates do canal — usadas pra reconstruir o texto real
  // das bolhas de template. Mesma queryKey do picker (cache compartilhado).
  const isOfficial = conversation.channel?.type === 'WHATSAPP_OFFICIAL';
  const { data: channelTemplates } = useQuery({
    queryKey: ['templates', conversation.channel?.id],
    queryFn: () => templatesService.list(conversation.channel!.id),
    enabled: isOfficial && !!conversation.channel?.id,
    staleTime: 60000,
  });
  const templatesByName = useMemo<Record<string, Template>>(() => {
    const map: Record<string, Template> = {};
    for (const t of channelTemplates ?? []) map[t.name] = t;
    return map;
  }, [channelTemplates]);

  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  // true = aberto pelo ícone "Retomar contato": já entra no template de retomada.
  const [templatePickerReengage, setTemplatePickerReengage] = useState(false);
  // "Conversar" num cartão de contato que o cliente mandou.
  const [startConvTarget, setStartConvTarget] = useState<{ phone: string; name: string } | null>(null);

  useEffect(() => {
    emit('join:conversation', { conversationId: conversation.id });
    return () => {
      emit('leave:conversation', { conversationId: conversation.id });
    };
  }, [conversation.id, emit]);

  // Merge de uma mensagem no cache da conversa. Usado tanto pelo socket
  // (message:new) quanto pela resposta do POST /messages — assim a mensagem
  // enviada aparece na hora mesmo se o websocket estiver caído. Dedup por
  // id/externalId garante que receber pelos dois caminhos não duplica.
  const mergeMessage = useCallback(
    (msg: Message) => {
      // Merge into the current cache. If there's no cache yet (initial
      // fetch still in flight, or cache evicted) we DON'T discard the
      // event — we invalidate so the refetch picks the new message up.
      const existingCache = queryClient.getQueryData<{ messages: Message[] }>([
        'messages',
        conversation.id,
      ]);
      if (!existingCache) {
        queryClient.invalidateQueries({
          queryKey: ['messages', conversation.id],
        });
        return;
      }
      queryClient.setQueryData<{ messages: Message[] }>(
        ['messages', conversation.id],
        (prev) => {
          if (!prev) return prev;
          const existing = prev.messages || [];
          // Dedup by id (authoritative) or by externalId when present.
          const match = existing.findIndex(
            (m) =>
              m.id === msg.id ||
              (msg.externalId && m.externalId && m.externalId === msg.externalId),
          );
          if (match !== -1) {
            const merged = [...existing];
            merged[match] = { ...existing[match], ...msg };
            return { ...prev, messages: merged };
          }
          return { ...prev, messages: [...existing, msg] };
        },
      );
    },
    [conversation.id, queryClient],
  );

  const backfillInFlightRef = useRef(false);
  /**
   * Busca a página mais recente e MESCLA no cache (não substitui). Numa janela
   * histórica (fim não carregado) só conta as novas no "nova mensagem ↓".
   */
  const backfillLatest = useCallback(async () => {
    if (backfillInFlightRef.current) return;
    backfillInFlightRef.current = true;
    try {
      const latest = await inboxService.getMessages(conversation.id);
      const key = ['messages', conversation.id];
      const cache = queryClient.getQueryData<{ messages: Message[] }>(key);
      if (!cache) {
        queryClient.setQueryData(key, latest);
        return;
      }
      const { messages: merged, added } = mergeLatestMessages(cache.messages ?? [], latest.messages ?? []);
      if (!shouldAppendIncoming(historyWindow)) {
        if (added > 0) setPendingNewCount((n) => Math.max(n, added));
        return;
      }
      if (merged !== cache.messages) queryClient.setQueryData(key, { ...cache, messages: merged });
    } catch (err) {
      console.warn('[chat] backfill falhou', err);
    } finally {
      backfillInFlightRef.current = false;
    }
  }, [conversation.id, queryClient, historyWindow]);

  /** Distância do fim, em pixels, dentro da qual o chat ainda "acompanha". */
  const NEAR_BOTTOM_PX = 120;

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    isNearBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
  }, []);

  /**
   * Emenda a página anterior lendo o cache no instante da escrita.
   *
   * Calcular a lista a partir de uma foto lida ANTES do fetch abre uma janela
   * de ~200ms em que uma mensagem chegando pelo socket é sobrescrita e some da
   * tela — e some de vez, porque carregar histórico desliga o refetch por foco.
   */
  const prependMessagesCache = useCallback(
    (older: Message[]) => {
      queryClient.setQueryData<{ messages: Message[] }>(
        ['messages', conversation.id],
        (prev) => ({
          ...(prev ?? ({} as { messages: Message[] })),
          messages: prependUnique(older, prev?.messages ?? []),
        }),
      );
    },
    [conversation.id, queryClient],
  );

  const setMessagesCache = useCallback(
    (next: Message[]) => {
      queryClient.setQueryData<{ messages: Message[] }>(
        ['messages', conversation.id],
        (prev) => ({ ...(prev ?? ({} as { messages: Message[] })), messages: next }),
      );
    },
    [conversation.id, queryClient],
  );

  /**
   * Rolar pra cima: busca a página anterior à mensagem mais antiga carregada.
   *
   * `fromContactHistory` escolhe a fonte. No modo normal a página vem da
   * conversa atual; no histórico do contato ela atravessa os atendimentos
   * anteriores, que podem estar em outro protocolo e até em outro número.
   */
  const loadOlderPage = useCallback(
    async (fromContactHistory: boolean) => {
      const cached = queryClient.getQueryData<{ messages: Message[] }>([
        'messages',
        conversation.id,
      ]);
      const oldest = cached?.messages?.[0];
      if (!oldest) return;

      setIsLoadingOlder(true);
      setOlderFailed(false);
      try {
        const older = fromContactHistory
          ? await inboxService.getContactHistoryOlder(conversation.id, oldest.id)
          : await inboxService.getOlderMessages(conversation.id, oldest.id);

        if (older.messages.length > 0) {
          // Emenda calculada DENTRO do setQueryData, a partir do estado do
          // momento da escrita. Escrever a foto lida antes do fetch apagaria
          // uma mensagem que tivesse chegado pelo socket nesse intervalo — e
          // como carregar histórico desliga o refetch, ela sumiria da tela.
          prependMessagesCache(older.messages);
        }

        if (fromContactHistory) {
          const brief = (older as { conversations?: Record<string, ConversationBrief> })
            .conversations;
          if (brief) setHistoryConversations((prev) => ({ ...prev, ...brief }));
          setHasOlderInHistory(older.hasMore);
          setHistoryWindow((w) => ({ ...w, pinned: true }));
        } else {
          setHistoryWindow((w) => windowAfterLoadOlder(w, older.hasMore));
        }
      } catch {
        // Sem marcar o fim do histórico: o próximo scroll tenta de novo. Mas
        // agora a falha aparece, em vez de a tela fingir que acabou.
        setOlderFailed(true);
      } finally {
        setIsLoadingOlder(false);
      }
    },
    [conversation.id, prependMessagesCache, queryClient],
  );

  /** Ainda há o que carregar pra cima, seja qual for o modo. */
  const canLoadOlder = contactHistoryOn ? hasOlderInHistory : historyWindow.hasOlder;

  const loadOlderMessages = useCallback(async () => {
    if (isLoadingOlder || !canLoadOlder) return;
    await loadOlderPage(contactHistoryOn);
  }, [canLoadOlder, contactHistoryOn, isLoadingOlder, loadOlderPage]);

  /** O botão "ver conversas anteriores": liga o modo e já traz a 1ª página. */
  const enterContactHistory = useCallback(async () => {
    if (isLoadingOlder) return;
    setContactHistoryOn(true);
    setHasOlderInHistory(true);
    await loadOlderPage(true);
  }, [isLoadingOlder, loadOlderPage]);

  /** Pular até uma mensagem achada na busca: carrega a janela em volta dela. */
  const jumpToMessage = useCallback(
    async (messageId: string) => {
      const alreadyLoaded = document.getElementById(`msg-${messageId}`);
      if (!alreadyLoaded) {
        const window = await inboxService.getMessageWindow(conversation.id, messageId);
        setMessagesCache(window.messages);
        setHistoryWindow(windowAfterJump(window));
        // A busca cobre os atendimentos anteriores, então a janela pode cair
        // fora da conversa aberta. Sem ligar o modo histórico, essas mensagens
        // apareceriam sem divisória e ainda respondíveis — como se fossem daqui.
        if (window.conversations) {
          setHistoryConversations((prev) => ({ ...prev, ...window.conversations }));
        }
        if (window.messages.some((m) => m.conversationId !== conversation.id)) {
          setContactHistoryOn(true);
        }
      }
      setHighlightedMessageId(messageId);
      // Espera a lista repintar com a janela nova antes de procurar a bolha.
      requestAnimationFrame(() => {
        const el = document.getElementById(`msg-${messageId}`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Leva o foco junto: leitor de tela e teclado chegam à mensagem, não
        // só o olho. preventScroll porque a rolagem suave já está em curso.
        el?.focus({ preventScroll: true });
      });
    },
    [conversation.id, setMessagesCache],
  );

  /** Clique numa citação: destaca e foca a original, se ela estiver carregada. */
  const focusQuotedMessage = useCallback((targetId?: string | null) => {
    if (!targetId) return;
    const el = document.getElementById(`msg-${targetId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.focus({ preventScroll: true });
    setHighlightedMessageId(targetId);
  }, []);

  /** Volta pro fim da conversa e religa o tempo real. */
  const backToLive = useCallback(() => {
    setHistoryWindow(LIVE_WINDOW);
    setPendingNewCount(0);
    setHighlightedMessageId(null);
    queryClient.invalidateQueries({ queryKey: ['messages', conversation.id] });
  }, [conversation.id, queryClient]);

  // O destaque da mensagem pulada apaga sozinho — piscar é sinal, não estado.
  useEffect(() => {
    if (!highlightedMessageId) return;
    const id = setTimeout(() => setHighlightedMessageId(null), HIGHLIGHT_MS);
    return () => clearTimeout(id);
  }, [highlightedMessageId]);

  // Sentinela no topo: entrou na viewport, carrega as anteriores.
  useEffect(() => {
    if (!topSentinel || !canLoadOlder) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadOlderMessages();
      },
      { rootMargin: '120px' },
    );
    observer.observe(topSentinel);
    return () => observer.disconnect();
  }, [topSentinel, canLoadOlder, loadOlderMessages]);

  useEffect(() => {
    const unsubNew = on('message:new', (payload: any) => {
      const msg = payload.message;
      if (!msg) return;
      const convId = payload.conversationId ?? msg.conversationId;
      if (convId !== conversation.id) return;
      // Numa janela histórica a lista carregada não é o fim da conversa —
      // appendar colaria uma mensagem de agora abaixo de uma de meses atrás.
      // Vira contador de "nova mensagem ↓" até o usuário voltar pro fim.
      if (shouldAppendIncoming(historyWindow)) mergeMessage(msg);
      else setPendingNewCount((n) => n + 1);
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      // Ficha do Pedido: uma nova mensagem pode disparar (re)extração do
      // pedido ou cross-check de proposta/carrinho — invalida pra o painel
      // buscar a versão atualizada em vez de ficar com a ficha stale.
      queryClient.invalidateQueries({ queryKey: ['order-ficha', conversation.id] });
    });
    const unsubStatus = on('message:status', (payload: any) => {
      if (payload.conversationId !== conversation.id) return;
      const ids: string[] = payload.messageIds ?? (payload.messageId ? [payload.messageId] : []);
      if (ids.length === 0) return;
      queryClient.setQueryData<{ messages: Message[] } | undefined>(
        ['messages', conversation.id],
        (prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            messages: prev.messages.map((m) =>
              ids.includes(m.id) ? { ...m, status: payload.status } : m,
            ),
          };
        },
      );
    });
    // Reconnect: any messages that arrived during the offline window are
    // gone from this client's perspective (socket misses events while
    // disconnected). Refetch the open conversation's messages on every
    // reconnect, plus the conversation list, so the user comes back to a
    // correct view without having to F5.
    const unsubReconnect = onReconnect(() => {
      void backfillLatest();
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    });
    // Watchdog/admin revogou uma mensagem — pinta a bolha como "deletada"
    // pra todo mundo que tá com a conversa aberta, sem refresh.
    const unsubRevoked = on('message:revoked', (payload: any) => {
      if (payload?.conversationId !== conversation.id) return;
      if (!payload?.messageId) return;
      queryClient.setQueryData<{ messages: Message[] } | undefined>(
        ['messages', conversation.id],
        (prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            messages: prev.messages.map((m) =>
              m.id === payload.messageId
                ? {
                    ...m,
                    revokedAt: payload.revokedAt,
                    revokedBy: payload.revokedBy,
                    revokeSucceededRemote: payload.succeededRemote,
                  }
                : m,
            ),
          };
        },
      );
    });
    // Conteúdo de uma mensagem foi atualizado no servidor (ex.: card de
    // ligação Sonax que muda de "iniciada" -> "atendida · duração · gravação"
    // quando o webhook de desligamento chega). Reescreve o `content` no cache
    // pra a timeline refletir sem refresh. Seguro sem filtrar por conversa: o
    // `.map` só toca uma mensagem que já está no cache DESTA conversa.
    const unsubUpdate = on('message:update', (payload: any) => {
      if (!payload?.messageId || payload?.content === undefined) return;
      queryClient.setQueryData<{ messages: Message[] } | undefined>(
        ['messages', conversation.id],
        (prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            messages: prev.messages.map((m) =>
              m.id === payload.messageId ? { ...m, content: payload.content } : m,
            ),
          };
        },
      );
    });
    // Agendamentos / inatividade: quando algo muda pra ESTA conversa,
    // revalida a lista de pendentes (indicador no header) e a sugestão de
    // reengajamento (Painel Inteligente). Eventos sem conversationId
    // (inatividade recalculada em lote) também disparam — é barato e mantém
    // a UI viva sem refresh.
    const invalidateScheduling = (payload: any) => {
      const convId = payload?.conversationId ?? payload?.scheduledMessage?.conversationId;
      if (convId && convId !== conversation.id) return;
      queryClient.invalidateQueries({
        queryKey: ['scheduled-messages', conversation.id],
      });
      queryClient.invalidateQueries({
        queryKey: ['reengage-suggestion', conversation.id],
      });
    };
    const unsubSchedCreated = on('scheduled:created', invalidateScheduling);
    const unsubSchedSent = on('scheduled:sent', invalidateScheduling);
    const unsubSchedCanceled = on('scheduled:canceled', invalidateScheduling);
    const unsubSchedUpdated = on('scheduled:updated', invalidateScheduling);
    const unsubInactivity = on('inactivity:updated', invalidateScheduling);
    // Cadência: quando o enrollment desta conversa muda de estado, revalida
    // o badge "Em cadência" no header. Eventos sem conversationId também
    // disparam (barato) pra não perder atualização.
    const invalidateCadence = (payload: any) => {
      const convId = payload?.conversationId;
      if (convId && convId !== conversation.id) return;
      queryClient.invalidateQueries({
        queryKey: ['cadence-active', conversation.id],
      });
    };
    const unsubCadStarted = on('cadence:started', invalidateCadence);
    const unsubCadStopped = on('cadence:stopped', invalidateCadence);
    const unsubCadStep = on('cadence:step', invalidateCadence);
    const unsubCadCompleted = on('cadence:completed', invalidateCadence);
    return () => {
      unsubNew?.();
      unsubStatus?.();
      unsubReconnect?.();
      unsubRevoked?.();
      unsubUpdate?.();
      unsubSchedCreated?.();
      unsubSchedSent?.();
      unsubSchedCanceled?.();
      unsubSchedUpdated?.();
      unsubInactivity?.();
      unsubCadStarted?.();
      unsubCadStopped?.();
      unsubCadStep?.();
      unsubCadCompleted?.();
    };
  }, [conversation.id, on, onReconnect, queryClient, mergeMessage, historyWindow, backfillLatest]);

  // Rede de segurança contra message:new perdido (aba em segundo plano,
  // notebook dormindo, token vencido na reconexão, deploy): ao voltar pra aba,
  // ao voltar a rede e a cada minuto com a aba visível, mescla a página mais
  // recente. Antes isso dependia de F5.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') void backfillLatest();
    };
    const onOnline = () => void backfillLatest();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    window.addEventListener('online', onOnline);
    const poll = setInterval(onVisible, BACKFILL_POLL_MS);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
      window.removeEventListener('online', onOnline);
      clearInterval(poll);
    };
  }, [backfillLatest]);

  const { confirm, confirmDialog } = useConfirm();
  const handleRevoke = useCallback(
    async (msg: Message) => {
      const ok = await confirm({
        title: 'Deletar essa mensagem pra todos?',
        description:
          'Em WhatsApp via Zappfy a mensagem some no app do cliente. ' +
          'Em WhatsApp Cloud API e Instagram, ela some apenas no Sendtur ' +
          '(limitação da Meta — o cliente continua vendo no app dele).',
        confirmLabel: 'Deletar',
        destructive: true,
      });
      if (!ok) return;
      try {
        const result = await inboxService.revokeMessage(msg.id);
        if (result.succeededRemote) {
          toast.success('Mensagem deletada pra todos');
        } else {
          toast.warning(
            'Mensagem deletada só no Sendtur. ' +
              'O cliente ainda vê a mensagem no app dele (limitação do canal).',
          );
        }
        // Otimista: marca local enquanto o realtime não chega
        queryClient.setQueryData<{ messages: Message[] } | undefined>(
          ['messages', conversation.id],
          (prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              messages: prev.messages.map((m) =>
                m.id === msg.id
                  ? {
                      ...m,
                      revokedAt: result.revokedAt,
                      revokedBy: result.revokedBy,
                      revokeSucceededRemote: result.succeededRemote,
                    }
                  : m,
              ),
            };
          },
        );
      } catch (err: any) {
        toast.error(
          getErrorMessage(err, 'Erro ao deletar mensagem'),
        );
      }
    },
    [conversation.id, queryClient, confirm],
  );

  useEffect(() => {
    // Acompanha só quem já está no fim. Antes isto olhava `pinned`, que liga ao
    // carregar histórico e só desligava clicando na pílula — quem rolasse pra
    // cima uma vez perdia o auto-scroll pelo resto da conversa.
    if (!isNearBottomRef.current) return;
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Reply state — quando setado, próxima msg enviada vai com replyToMessageId
  // e a UI mostra a barra "respondendo a..." acima do input. Reseta ao
  // trocar de conversa (via key prop do ChatPanel) ou ao mandar a msg.
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);

  const startReply = useCallback((message: Message) => {
    setReplyingTo(message);
  }, []);
  const cancelReply = useCallback(() => setReplyingTo(null), []);

  const handleSend = async (text: string) => {
    const replyToMessageId = replyingTo?.id;
    try {
      // Insere a mensagem no cache com a resposta do POST — não dependemos
      // só do message:new via socket pra mostrar a própria mensagem (se o
      // socket estiver caído, ela apareceria só no próximo refetch).
      const sent = await inboxService.sendMessage({
        conversationId: conversation.id,
        type: 'TEXT',
        content: { text },
        replyToMessageId,
      });
      if (sent?.id) mergeMessage(sent);
      setReplyingTo(null);
    } catch (err) {
      // Fallback: if send fails before the socket event arrives, force a refresh.
      queryClient.invalidateQueries({ queryKey: ['messages', conversation.id] });
      throw err;
    }
  };

  const handleSendAudio = async (blob: Blob) => {
    try {
      const sent = await inboxService.sendAudioMessage(conversation.id, blob);
      if (sent?.id) mergeMessage(sent);
    } catch (err) {
      queryClient.invalidateQueries({ queryKey: ['messages', conversation.id] });
      throw err;
    }
  };

  const handleSendFile = async (
    file: File,
    caption?: string,
    onProgress?: (ratio: number) => void,
  ) => {
    try {
      const sent = await inboxService.sendMediaMessage(
        conversation.id,
        file,
        caption,
        onProgress,
      );
      if (sent?.id) mergeMessage(sent);
    } catch (err) {
      queryClient.invalidateQueries({ queryKey: ['messages', conversation.id] });
      throw err;
    }
  };

  /**
   * Figurinha vai direto, sem passar pela bandeja de anexos: é envio de um
   * clique, como no WhatsApp. Diferente do clipe/Ctrl+V, aqui o atendente já
   * escolheu conscientemente o arquivo exato que quer mandar.
   */
  const handleSendSticker = async (mediaUrl: string) => {
    try {
      const sent = await inboxService.sendMessage({
        conversationId: conversation.id,
        type: 'STICKER',
        content: { mediaUrl },
      });
      if (sent?.id) mergeMessage(sent);
    } catch (err: any) {
      queryClient.invalidateQueries({ queryKey: ['messages', conversation.id] });
      toast.error(
        getErrorMessage(err, 'Não foi possível enviar a figurinha.'),
      );
    }
  };

  const handleSendTemplate = async (content: Record<string, any>) => {
    try {
      const sent = await inboxService.sendTemplateMessage(conversation.id, content);
      if (sent?.id) mergeMessage(sent);
      toast.success('Template enviado');
    } catch (err: any) {
      queryClient.invalidateQueries({ queryKey: ['messages', conversation.id] });
      toast.error(
        getErrorMessage(err, 'Erro ao enviar template'),
      );
      throw err;
    }
  };

  // Hora embaixo de cada bolha. Se a msg não for de hoje, prefixa com
  // a data curta ("DD/MM 16:58") pra não precisar caçar o separador
  // rolando o histórico inteiro.
  const formatTime = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const isToday =
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate();
    const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    if (isToday) return time;
    const showYear = d.getFullYear() !== now.getFullYear();
    const datePart = d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      ...(showYear ? { year: '2-digit' } : {}),
    });
    return `${datePart} ${time}`;
  };

  // Separador de data no estilo WhatsApp: agrupa mensagens por dia.
  // "Hoje" / "Ontem" / dia da semana (últimos 7 dias) / "25 de maio" /
  // "25/05/2024" quando o ano é diferente.
  const formatDateSeparator = (date: string) => {
    const d = new Date(date);
    const startOfDay = (x: Date) =>
      new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
    const now = new Date();
    const dayDiff = Math.round((startOfDay(now) - startOfDay(d)) / 86400000);
    if (dayDiff === 0) return 'Hoje';
    if (dayDiff === 1) return 'Ontem';
    if (dayDiff > 1 && dayDiff < 7) {
      const w = d.toLocaleDateString('pt-BR', { weekday: 'long' });
      return w.charAt(0).toUpperCase() + w.slice(1);
    }
    if (d.getFullYear() === now.getFullYear()) {
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
    }
    return d.toLocaleDateString('pt-BR');
  };

  // Drag-and-drop: soltar arquivo em QUALQUER canto da conversa anexa no
  // compositor. Quem guarda a bandeja e envia é o ChatInput — aqui só
  // repassamos os arquivos pelo handle imperativo.
  const composerBlocked =
    conversation.status === 'CLOSED' ||
    (windowState.applicable && windowState.closed);

  const setInputRef = useCallback(
    (node: ChatInputHandle | null) => {
      composerHandleRef.current = node;
      if (typeof chatInputRef === 'function') chatInputRef(node);
      else if (chatInputRef) {
        (chatInputRef as React.MutableRefObject<ChatInputHandle | null>).current =
          node;
      }
    },
    [chatInputRef],
  );

  const handleDragEnter = (e: React.DragEvent) => {
    if (composerBlocked || !dragHasFiles(e.dataTransfer)) return;
    dragDepth.current += 1;
    setIsDraggingFiles(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!dragHasFiles(e.dataTransfer)) return;
    // Sem o preventDefault o browser "navega" pro arquivo solto e perde a
    // conversa — é o default de qualquer página. Vale mesmo com o compositor
    // bloqueado: melhor recusar com aviso do que jogar o operador pra fora.
    e.preventDefault();
    e.dataTransfer.dropEffect = composerBlocked ? 'none' : 'copy';
  };

  const handleDragLeave = () => {
    if (!isDraggingFiles) return;
    // Contador porque cada filho dispara dragleave ao entrar no próximo.
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setIsDraggingFiles(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    if (!dragHasFiles(e.dataTransfer)) return;
    e.preventDefault();
    dragDepth.current = 0;
    setIsDraggingFiles(false);
    if (composerBlocked) {
      toast.error(
        conversation.status === 'CLOSED'
          ? 'Conversa encerrada — reabra para enviar arquivos.'
          : 'A janela de atendimento fechou — só um template aprovado reabre.',
      );
      return;
    }
    const files = filesFromDataTransfer(e.dataTransfer);
    if (!files.length) {
      toast.error('Não deu pra ler o que foi solto — use o clipe de papel.');
      return;
    }
    composerHandleRef.current?.addFiles(files);
  };

  return (
    // min-h-0 é load-bearing: sem ele, o scroll-container interno cresce
    // pelo conteúdo (default min-height de flex children) e empurra o
    // ChatInput pra fora do painel — quebra dramaticamente quando o pai
    // é um modal com altura fixa.
    <div
      // bg-chat no painel inteiro: o compositor e a barra de resposta flutuam
      // sobre o mesmo chão lilás da área de mensagens.
      className="relative flex min-h-0 min-w-0 flex-1 flex-col bg-chat"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDraggingFiles && (
        // pointer-events-none é load-bearing: com eventos, o overlay "rouba"
        // o dragleave/drop do container e o arrasto trava na tela.
        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-chat/85 backdrop-blur-[1px]">
          <div className="flex flex-col items-center gap-2 rounded-[18px] border-2 border-dashed border-primary bg-card px-8 py-6 text-primary shadow-elevated">
            <Paperclip className="h-7 w-7" />
            <p className="text-[15px] font-semibold">Solte para anexar à conversa</p>
            <p className="text-[13px] text-muted-foreground">
              Imagens, vídeos e documentos até 64MB
            </p>
          </div>
        </div>
      )}
      <ConversationHeader
        conversation={conversation}
        onUpdate={onConversationUpdate}
        windowState={windowState}
        onToggleAgentLogs={onToggleAgentLogs}
        agentLogsOpen={agentLogsOpen}
        onToggleProject={onToggleProject}
        projectOpen={projectOpen}
        onToggleIntel={onToggleIntel}
        intelOpen={intelOpen}
        onToggleObs={onToggleObs}
        obsOpen={obsOpen}
        onBack={onBack}
        onToggleSearch={() => setIsSearchOpen((open) => !open)}
        searchOpen={isSearchOpen}
      />

      {isSearchOpen && (
        <MessageSearchPanel
          conversationId={conversation.id}
          onJump={jumpToMessage}
          onClose={() => setIsSearchOpen(false)}
        />
      )}

      <PendingActionsList conversationId={conversation.id} />

      {/* Moldura da área de mensagens: é nela que o "voltar pro fim" se ancora,
          fora da rolagem, para nunca cobrir o que está no topo. */}
      <div className="relative flex min-h-0 flex-1 flex-col">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="relative min-h-0 flex-1 overflow-y-auto bg-chat px-4 py-5 md:px-6"
      >
        {/* Sentinela do "rolar pra cima": carrega as anteriores ao entrar na
            viewport. Fica antes da lista, então some quando o histórico acaba. */}
        {olderFailed && (
          <button
            type="button"
            onClick={() => void loadOlderMessages()}
            className="mx-auto mb-2 block rounded-full bg-urgent-wash px-3 py-1.5 text-xs font-medium text-urgent-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Não foi possível carregar as mensagens anteriores — tentar de novo
          </button>
        )}

        {canLoadOlder && messages.length > 0 && (
          <div ref={setTopSentinel} className="flex justify-center pb-2">
            {isLoadingOlder && (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            )}
          </div>
        )}

        {/* Acabou a conversa atual e o cliente tem atendimentos anteriores:
            a porta pro histórico dele, que mora em outras conversas. */}
        {!historyWindow.hasOlder &&
          !contactHistoryOn &&
          (contactHistory?.previousConversations ?? 0) > 0 && (
            <PreviousConversationsButton
              count={contactHistory!.previousConversations}
              oldestAt={contactHistory!.oldestAt}
              hiddenByChannelAccess={contactHistory!.hiddenByChannelAccess}
              isLoading={isLoadingOlder}
              onClick={enterContactHistory}
            />
          )}

        {/* Chegou ao começo de tudo que o cliente já falou. */}
        {contactHistoryOn && !hasOlderInHistory && (
          <p className="py-3 text-center text-xs text-muted-foreground">
            Começo do histórico deste cliente
          </p>
        )}

        {isLoading ? (
          <LoadingState label="Carregando mensagens…" className="h-full" />
        ) : messages.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="Nenhuma mensagem ainda"
            description={composerBlocked ? undefined : 'Escreva abaixo para começar a conversa.'}
            size="sm"
            className="h-full"
          />
        ) : (
          <div
            role="log"
            aria-label="Mensagens da conversa"
            // Só anuncia o que chega em tempo real: carregando histórico antigo
            // entrariam dezenas de mensagens de uma vez no leitor de tela.
            aria-live={historyWindow.pinned || isLoadingOlder ? 'off' : 'polite'}
            aria-relevant="additions"
            className="mx-auto max-w-3xl space-y-2.5"
          >
            {(() => {
              const reactionMap = new Map<string, string[]>();
              for (const msg of messages) {
                if (msg.type === 'REACTION' && msg.content?.reaction) {
                  const targetId = msg.content.reaction.targetMessageId;
                  if (targetId) {
                    const existing = reactionMap.get(targetId) || [];
                    existing.push(msg.content.reaction.emoji);
                    reactionMap.set(targetId, existing);
                  }
                }
              }
              const visibleMessages = messages.filter((m) => m.type !== 'REACTION');
              let lastDateKey = '';
              const rendered = visibleMessages.map((msg) => {
                if (msg.type === 'SYSTEM' && msg.content?.kind === 'call') {
                  return <CallCard key={msg.id} content={msg.content} senderName={msg.senderName} />;
                }
                // Demais mensagens SYSTEM (ex.: transferência de cliente) viram
                // uma pílula discreta centralizada no meio do thread — não são
                // balões de cliente/atendente.
                if (msg.type === 'SYSTEM') {
                  const sysText =
                    typeof msg.content?.text === 'string'
                      ? msg.content.text
                      : 'Evento do sistema';
                  return (
                    <div key={msg.id} className="flex justify-center py-1.5">
                      <span className={SYSTEM_PILL_CLS}>
                        {sysText}
                      </span>
                    </div>
                  );
                }
                const isOutbound = msg.direction === 'OUTBOUND';
                const reactions = reactionMap.get(msg.externalId || '') || [];
                const isRevoked = !!msg.revokedAt;
                const quote = resolveQuote(msg.metadata?.replyTo, messagesByExternalId);
                const sharedContacts = sharedContactsOf(msg.content);
                // Mensagem de atendimento anterior é só leitura: responder,
                // reagir ou apagar num atendimento encerrado — às vezes de
                // outro número — quebraria no provedor.
                const isPastConversation = msg.conversationId !== conversation.id;
                const canActOnMessage = !isRevoked && !isPastConversation;
                const msgDate = new Date(msg.createdAt);
                const dateKey = `${msgDate.getFullYear()}-${msgDate.getMonth()}-${msgDate.getDate()}`;
                const showDateSeparator = dateKey !== lastDateKey;
                lastDateKey = dateKey;

                // Mensagens SYSTEM (ex.: transferência de cliente) não são
                // balões de cliente/atendente — renderizam como uma pílula
                // discreta centralizada no meio do thread.
                if (msg.type === 'SYSTEM') {
                  const sysText =
                    typeof msg.content?.text === 'string'
                      ? msg.content.text
                      : 'Evento do sistema';
                  return (
                    <Fragment key={msg.id}>
                      {showDateSeparator && (
                        <div className="flex justify-center pb-1 pt-3 first:pt-0">
                          <span className={DAY_PILL_CLS}>
                            {formatDateSeparator(msg.createdAt)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-center py-1.5">
                        <span className={SYSTEM_PILL_CLS}>
                          {sysText}
                        </span>
                      </div>
                    </Fragment>
                  );
                }

                return (
                  <Fragment key={msg.id}>
                  {showDateSeparator && (
                    <div className="flex justify-center pb-1 pt-3 first:pt-0">
                      <span className={DAY_PILL_CLS}>
                        {formatDateSeparator(msg.createdAt)}
                      </span>
                    </div>
                  )}
                  <div
                    id={`msg-${msg.id}`}
                    // Focável só por código (pulo da busca / clique na citação).
                    tabIndex={-1}
                    className={`group flex min-w-0 items-end gap-2 rounded-[18px] outline-none transition-colors duration-500 ${isOutbound ? 'justify-end' : 'justify-start'} ${highlightedMessageId === msg.id ? 'bg-primary/15' : ''}`}
                  >
                    {/* Botão "Responder" no hover. Aparece do lado de
                        FORA da bolha — esquerda quando outbound (msg
                        nossa, espaço à direita da bolha), direita quando
                        inbound (msg do cliente, espaço à esquerda).
                        Reactions e bolhas curtas mantêm o botão visível.
                        Mensagens já revogadas não mostram ações. */}
                    {isOutbound && canActOnMessage && (
                      <div className="flex items-center gap-1 self-center opacity-0 transition-opacity focus-within:opacity-100 group-has-[:focus-visible]:opacity-100 group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => startReply(msg)}
                          className={`${HOVER_ACTION_CLS} hover:bg-primary/10 hover:text-primary`}
                          title="Responder"
                          aria-label="Responder esta mensagem"
                        >
                          <Reply aria-hidden="true" className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRevoke(msg)}
                          className={`${HOVER_ACTION_CLS} hover:bg-urgent-wash hover:text-urgent-ink`}
                          title="Deletar pra todos"
                          aria-label="Deletar mensagem pra todos"
                        >
                          <Trash2 aria-hidden="true" className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                    {!isOutbound && (
                      <ContactAvatar
                        size="sm"
                        name={
                          conversation.isGroup && msg.senderName
                            ? msg.senderName
                            : conversation.contact.name
                        }
                        avatarUrl={
                          conversation.isGroup ? null : conversation.contact.avatarUrl
                        }
                      />
                    )}
                    <div className="group relative min-w-0 max-w-[min(74%,560px)]">
                      {/* Barra de reação: só faz sentido em mensagem que o
                          provider já conhece (a API recusa sem externalId) e
                          nunca sobre uma reação, um evento de sistema ou uma
                          mensagem apagada. */}
                      {msg.externalId &&
                        canActOnMessage &&
                        msg.type !== 'REACTION' &&
                        msg.type !== 'SYSTEM' && (
                          // Abaixo da borda da bolha (não acima): em cima ela tapava o
                          // nome de quem enviou. O respiro extra, quando já há
                          // reações, deixa o selo delas à mostra.
                          <div
                            className={`pointer-events-none absolute top-full z-20 opacity-0 transition-opacity focus-within:pointer-events-auto focus-within:opacity-100 group-has-[:focus-visible]:pointer-events-auto group-has-[:focus-visible]:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100 ${
                              reactions.length > 0 ? 'pt-3' : 'pt-0.5'
                            } ${isOutbound ? 'right-2' : 'left-2'}`}
                          >
                            <MessageReactionBar messageId={msg.id} />
                          </div>
                        )}
                      {/* Quem fala, para leitor de tela — quando o nome não está
                          escrito logo abaixo. */}
                      {isOutbound
                        ? !(msg.sender?.name && msg.senderId !== user?.id) && (
                            <span className="sr-only">Você: </span>
                          )
                        : !(conversation.isGroup && msg.senderName) && (
                            <span className="sr-only">
                              {conversation.contact.name || 'Cliente'}:{' '}
                            </span>
                          )}
                      {conversation.isGroup && !isOutbound && msg.senderName && (
                        <p className="mb-1 ml-1.5 text-[13px] font-semibold text-primary">
                          {msg.senderName}
                        </p>
                      )}
                      {isOutbound && (msg.sender?.name || (msg.senderId && msg.senderId === user?.id && user?.name)) && (
                        <p className="mb-1 mr-1.5 text-right text-[13px] font-semibold text-primary">
                          {msg.sender?.name || user?.name}
                        </p>
                      )}
                      {msg.metadata?.replyTo?.story && (
                        <StoryReplyCard
                          story={msg.metadata.replyTo.story}
                          isOutbound={isOutbound}
                        />
                      )}
                      {msg.metadata?.replyTo?.ad && (
                        // Fica ACIMA do balão, sobre o fundo da conversa — por isso
                        // usa as cores de superfície, não as de dentro do balão.
                        <div
                          className={`mb-1 rounded-xl border px-3 py-2 text-[13px] ${
                            isOutbound
                              ? 'border-primary/30 bg-primary/10 text-foreground'
                              : 'border-border bg-card text-muted-foreground shadow-soft'
                          }`}
                        >
                          <p className="text-xs font-semibold uppercase tracking-wider opacity-80">
                            Respondeu ao anúncio
                          </p>
                          {msg.metadata.replyTo.ad.title && (
                            <p className="mt-0.5 font-medium text-foreground">
                              {msg.metadata.replyTo.ad.title}
                            </p>
                          )}
                        </div>
                      )}
                      {/* Quote box: aparece quando a msg respondeu outra
                          mensagem (reply nativo do WhatsApp/Cloud API ou
                          fallback do Instagram que persistimos via
                          metadata.replyTo). Click scrolla até a msg
                          original quando a temos no histórico carregado. */}
                      {/* Na bolha comum a citação vai DENTRO dela (mais abaixo).
                          Mensagem apagada e áudio não têm essa bolha: fica solta. */}
                      {quote && (isRevoked || msg.type === 'AUDIO') && (
                        <QuoteBlock
                          tone="standalone"
                          senderName={quote.senderName}
                          previewText={quote.previewText}
                          onClick={() => focusQuotedMessage(quote.messageId)}
                        />
                      )}
                      {isRevoked ? (
                        <div
                          className={`flex items-center gap-2 rounded-[18px] border border-dashed border-foreground/20 bg-card/60 px-4 py-2.5 italic text-muted-foreground ${
                            isOutbound ? 'rounded-br-[6px]' : 'rounded-bl-[6px]'
                          }`}
                          title={
                            msg.revokeSucceededRemote
                              ? 'Mensagem deletada pra todos (provider confirmou).'
                              : 'Deletada apenas no Sendtur — o cliente ainda pode estar vendo no app dele.'
                          }
                        >
                          <Ban aria-hidden="true" className="h-4 w-4 shrink-0" />
                          <span className="text-[15px] leading-[1.45]">
                            Mensagem deletada
                            {msg.revokeSucceededRemote === false ? ' (só aqui)' : ''}
                          </span>
                          <span className="ml-auto pl-2 font-mono text-xs font-medium not-italic tabular-nums">
                            {formatTime(msg.createdAt)}
                          </span>
                        </div>
                      ) : msg.type === 'AUDIO' ? (
                        <>
                          <AudioMessagePlayer
                            message={msg}
                            isOutbound={isOutbound}
                            onTranscribed={() => {
                              queryClient.invalidateQueries({ queryKey: ['messages', conversation.id] });
                            }}
                          />
                          <MessageMeta
                            time={formatTime(msg.createdAt)}
                            isOutbound={isOutbound}
                            status={msg.status}
                            failedReason={msg.failedReason}
                            className="px-1"
                          />
                        </>
                      ) : (
                        <div
                          className={`px-4 py-2.5 ${
                            isOutbound ? BUBBLE_SENT_CLS : BUBBLE_RECEIVED_CLS
                          }`}
                        >
                          {quote && (
                            <QuoteBlock
                              tone={isOutbound ? 'outbound' : 'inbound'}
                              senderName={quote.senderName}
                              previewText={quote.previewText}
                              onClick={() => focusQuotedMessage(quote.messageId)}
                            />
                          )}
                          {sharedContacts.length > 0 ? (
                            <ContactCardBubble
                              contacts={sharedContacts}
                              isOutbound={isOutbound}
                              onStartConversation={(phone, name) => setStartConvTarget({ phone, name })}
                            />
                          ) : msg.type === 'TEXT' ? (
                            <MessageText
                              text={msg.content?.text || ''}
                              isOutbound={isOutbound}
                            />
                          ) : msg.type === 'IMAGE' ? (
                            <MediaImage message={msg} isOutbound={isOutbound} />
                          ) : msg.type === 'VIDEO' ? (
                            <MediaVideo message={msg} isOutbound={isOutbound} />
                          ) : msg.type === 'DOCUMENT' ? (
                            <MediaDocument message={msg} isOutbound={isOutbound} />
                          ) : msg.type === 'STICKER' ? (
                            <MediaSticker message={msg} isOutbound={isOutbound} />
                          ) : msg.type === 'LOCATION' ? (
                            <MediaLocation message={msg} isOutbound={isOutbound} />
                          ) : msg.type === 'TEMPLATE' ? (
                            <TemplateMessage
                              content={msg.content}
                              isOutbound={isOutbound}
                              templatesByName={templatesByName}
                            />
                          ) : msg.type === 'INTERACTIVE' &&
                            typeof msg.content?.text === 'string' &&
                            msg.content.text.trim() ? (
                            // Resposta a botão/lista (quick-reply de template ou
                            // mensagem interativa): mostramos o texto do botão
                            // que o cliente tocou, não o placeholder do tipo.
                            <MessageText
                              text={msg.content.text}
                              isOutbound={isOutbound}
                            />
                          ) : (
                            <p className="text-[15px] italic leading-[1.45]">[{msg.type}]</p>
                          )}
                          <MessageMeta
                            time={formatTime(msg.createdAt)}
                            isOutbound={isOutbound}
                            status={msg.status}
                            failedReason={msg.failedReason}
                            insideBubble
                          />
                        </div>
                      )}
                      {reactions.length > 0 && (
                        <div className={`absolute -bottom-2 ${isOutbound ? 'right-2' : 'left-2'} flex gap-0.5`}>
                          <span className="rounded-full bg-card px-2 py-0.5 text-sm shadow-soft ring-1 ring-border">
                            {[...new Set(reactions)].join('')}
                            {reactions.length > 1 && (
                              <span className="ml-1 font-mono text-[11px] font-semibold tabular-nums text-muted-foreground">{reactions.length}</span>
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                    {!isOutbound && canActOnMessage && (
                      <button
                        type="button"
                        onClick={() => startReply(msg)}
                        className={`${HOVER_ACTION_CLS} self-center opacity-0 transition-[opacity,color,background-color] hover:bg-primary/10 hover:text-primary focus-visible:opacity-100 group-has-[:focus-visible]:opacity-100 group-hover:opacity-100`}
                        title="Responder"
                        aria-label="Responder esta mensagem"
                      >
                        <Reply aria-hidden="true" className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  </Fragment>
                );
              });

              // Sem histórico do contato carregado a lista é de um atendimento
              // só — divisória ali não separaria nada.
              if (!contactHistoryOn) return rendered;

              // Uma divisória em cada troca de atendimento. Sem isso a timeline
              // unificada cola uma conversa de meses atrás embaixo da de hoje.
              return rendered.flatMap((element, index) => {
                if (!isConversationBoundary(visibleMessages, index)) return [element];
                const convId = visibleMessages[index].conversationId;
                const brief = historyConversations[convId];
                if (!brief) return [element];
                return [
                  <ConversationDivider
                    key={`divider-${convId}`}
                    brief={brief}
                    isCurrent={convId === conversation.id}
                  />,
                  element,
                ];
              });
            })()}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

        {/* Preso numa janela antiga: mensagem nova não entra no fim (seria
            mentira visual), então vira convite pra voltar pro tempo real.
            Fica embaixo, acima do compositor — onde um "ir pro fim" mora. */}
        {historyWindow.pinned && (
          <button
            type="button"
            onClick={backToLive}
            className="absolute bottom-3 left-1/2 z-10 inline-flex min-h-11 max-w-[calc(100%-2rem)] -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground shadow-elevated transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-chat md:min-h-9"
          >
            <span role="status">
              {pendingNewCount > 0
                ? `${pendingNewCount} nova${pendingNewCount > 1 ? 's' : ''} — voltar pro fim`
                : 'Voltar pro fim da conversa'}
            </span>
            <ArrowDown aria-hidden="true" className="h-4 w-4 shrink-0" />
          </button>
        )}
      </div>

      {replyingTo && (
        <ReplyPreviewBar message={replyingTo} onCancel={cancelReply} />
      )}
      <ChatInput
        ref={setInputRef}
        conversationId={conversation.id}
        contactName={conversation.contact?.name}
        onSend={handleSend}
        onSendAudio={handleSendAudio}
        onSendFile={handleSendFile}
        onSendSticker={handleSendSticker}
        disabled={conversation.status === 'CLOSED'}
        windowClosed={windowState.applicable && windowState.closed}
        windowKind={windowState.kind}
        onUseTemplate={() => {
          setTemplatePickerReengage(false);
          setTemplatePickerOpen(true);
        }}
        onOpenTemplates={
          conversation.channel?.type === 'WHATSAPP_OFFICIAL'
            ? () => {
                setTemplatePickerReengage(false);
                setTemplatePickerOpen(true);
              }
            : undefined
        }
        onReengage={
          conversation.channel?.type === 'WHATSAPP_OFFICIAL'
            ? () => {
                setTemplatePickerReengage(true);
                setTemplatePickerOpen(true);
              }
            : undefined
        }
      />

      <TemplatePickerDialog
        open={templatePickerOpen}
        channelId={conversation.channel.id}
        contact={conversation.contact}
        reengagement={templatePickerReengage}
        onClose={() => setTemplatePickerOpen(false)}
        onSend={handleSendTemplate}
      />

      <NewConversationDialog
        open={!!startConvTarget}
        initialPhone={startConvTarget?.phone}
        initialName={startConvTarget?.name}
        initialChannelId={conversation.channel?.id}
        onClose={() => setStartConvTarget(null)}
        onCreated={(conversationId) => {
          setStartConvTarget(null);
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
          if (onOpenConversation) onOpenConversation(conversationId);
          else toast.success('Conversa iniciada');
        }}
      />
      {confirmDialog}
    </div>
  );
}

/**
 * Barra fina logo acima do ChatInput mostrando que estamos compondo uma
 * resposta a uma mensagem específica. X cancela. Replica o visual do
 * WhatsApp Web — borda colorida à esquerda + sender + preview truncado.
 */
function ReplyPreviewBar({
  message,
  onCancel,
}: {
  message: Message;
  onCancel: () => void;
}) {
  const sender =
    message.direction === 'OUTBOUND'
      ? message.sender?.name || 'Você'
      : (message.senderName ?? 'Cliente');
  const c = (message.content ?? {}) as Record<string, any>;
  const preview =
    (typeof c.text === 'string' && c.text) ||
    (typeof c.caption === 'string' && c.caption) ||
    `[${(message.type || 'mensagem').toLowerCase()}]`;
  return (
    <div className="mx-3 mt-2 flex items-center gap-2 rounded-2xl bg-card px-3 py-2 shadow-soft">
      <div className="min-w-0 flex-1 border-l-[3px] border-primary pl-2.5">
        <p className="text-[13px] font-semibold text-primary">Respondendo {sender}</p>
        <p className="truncate text-[13px] text-muted-foreground">
          {preview}
        </p>
      </div>
      <button
        type="button"
        onClick={onCancel}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors md:h-10 md:w-10 hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Cancelar resposta"
        title="Cancelar resposta"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
