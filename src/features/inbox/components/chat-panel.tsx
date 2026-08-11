'use client';

import { Fragment, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, CheckCheck, Clock, AlertCircle, ExternalLink, Reply, Trash2, X, Ban, Paperclip } from 'lucide-react';
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
import { TemplatePickerDialog } from '@/features/templates/components/template-picker-dialog';
import { templatesService, type Template } from '@/features/templates/services/templates.service';

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
}

const statusIcons: Record<string, React.ElementType> = {
  QUEUED: Clock,
  SENT: Check,
  DELIVERED: CheckCheck,
  READ: CheckCheck,
  FAILED: AlertCircle,
};

/**
 * Tooltip humano pra cada status. Especial pra FAILED com motivo conhecido
 * — operador entende que precisa de template em vez de relê o erro do
 * provider em inglês ("Re-engagement message").
 */
function statusTooltip(status: string, failedReason?: string | null): string {
  switch (status) {
    case 'QUEUED':
      return 'Enviando…';
    case 'SENT':
      return 'Enviado pro provedor';
    case 'DELIVERED':
      return 'Entregue ao destinatário';
    case 'READ':
      return 'Lida';
    case 'FAILED':
      if (failedReason && /re-?engagement/i.test(failedReason)) {
        return 'Falhou: cliente sem mensagem há mais de 24h. Use um template aprovado pra reabrir a conversa.';
      }
      if (failedReason) return `Falhou: ${failedReason}`;
      return 'Falhou ao enviar';
    default:
      return status;
  }
}

/** Duração do destaque da mensagem alcançada pela busca. Piscar é sinal, não estado. */
const HIGHLIGHT_MS = 2000;

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
          className="max-h-64 rounded-lg bg-muted object-cover"
          onError={() => setImgOk(false)}
        />
        <span
          className={`mt-1 block text-[10px] ${
            isOutbound ? 'opacity-80' : 'text-muted-foreground'
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
      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors ${
        isOutbound
          ? 'border-bubble-foreground/20 bg-bubble-foreground/10 hover:bg-bubble-foreground/15'
          : 'border-border bg-muted hover:bg-muted/70'
      }`}
    >
      <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-60" />
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
    <p className={`whitespace-pre-wrap wrap-break-word text-sm ${className}`}>
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
    <div className="mt-2 flex flex-col gap-1">
      {buttons.map((btn, i) => {
        const label = btn.title || btn.url || btn.payload || 'Botão';
        const baseClass = `block rounded-md border px-3 py-1.5 text-center text-xs font-medium transition-colors ${
          isOutbound
            ? 'border-bubble-foreground/30 bg-bubble-foreground/10 hover:bg-bubble-foreground/20'
            : 'border-border bg-muted text-foreground hover:bg-muted/70'
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
            <p className="text-sm font-semibold">{headerText}</p>
          )}
          <MessageText text={rendered} isOutbound={isOutbound} />
          {footerText && (
            <p className="text-xs opacity-60">{footerText}</p>
          )}
        </div>
      );
    }

    // Fallback: template não encontrado (ex.: apagado) — mostra nome + valores.
    return (
      <div
        className={`space-y-1 rounded-lg border px-3 py-2 ${
          isOutbound
            ? 'border-bubble-foreground/20 bg-bubble-foreground/5'
            : 'border-border bg-muted'
        }`}
      >
        <p className="text-[10px] font-medium uppercase tracking-wide opacity-60">
          📋 Template
        </p>
        {name && (
          <p className="font-mono text-sm font-semibold">{name}</p>
        )}
        {values.filter(Boolean).length > 0 && (
          <p className="text-xs opacity-70">
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
          className={`overflow-hidden rounded-lg border ${
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
              {el.title && <p className="text-sm font-medium">{el.title}</p>}
              {el.subtitle && (
                <p className="mt-0.5 text-xs opacity-75">{el.subtitle}</p>
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
        <p className="text-sm italic opacity-70">[Template]</p>
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
  const initials = (name || '??').slice(0, 2).toUpperCase();
  const dim = size === 'sm' ? 'h-7 w-7 text-[10px]' : 'h-10 w-10 text-sm';
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
      className={`${dim} flex shrink-0 items-center justify-center rounded-full bg-muted font-semibold text-muted-foreground`}
    >
      {initials}
    </div>
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
    // Defenses against socket gaps: refetch when the tab regains focus
    // and on browser-level reconnect. Realtime is the happy path; these
    // catch the case where a `message:new` was missed.
    refetchOnWindowFocus: !historyWindow.pinned,
    refetchOnReconnect: !historyWindow.pinned,
    staleTime: 5000,
  });

  const messages = data?.messages || [];

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
      }
      setHighlightedMessageId(messageId);
      // Espera a lista repintar com a janela nova antes de procurar a bolha.
      requestAnimationFrame(() => {
        document
          .getElementById(`msg-${messageId}`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    },
    [conversation.id, setMessagesCache],
  );

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
      // Preso numa janela histórica, invalidar traria de volta as últimas 50 e
      // arrancaria o histórico debaixo de quem está lendo. O botão de voltar
      // pro fim recarrega quando o usuário quiser.
      if (!historyWindow.pinned) {
        queryClient.invalidateQueries({
          queryKey: ['messages', conversation.id],
        });
      }
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
  }, [conversation.id, on, onReconnect, queryClient, mergeMessage, historyWindow]);

  const handleRevoke = useCallback(
    async (msg: Message) => {
      const ok = window.confirm(
        'Deletar essa mensagem pra todos? ' +
          'Em WhatsApp via Zappfy a mensagem some no app do cliente. ' +
          'Em WhatsApp Cloud API e Instagram, ela some apenas no Sendtur ' +
          '(limitação da Meta — o cliente continua vendo no app dele).',
      );
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
          err?.response?.data?.message ||
            err?.message ||
            'Erro ao deletar mensagem',
        );
      }
    },
    [conversation.id, queryClient],
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
        err?.response?.data?.message || 'Não foi possível enviar a figurinha.',
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
        err?.response?.data?.message || err?.message || 'Erro ao enviar template',
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
      className="relative flex min-h-0 min-w-0 flex-1 flex-col"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDraggingFiles && (
        // pointer-events-none é load-bearing: com eventos, o overlay "rouba"
        // o dragleave/drop do container e o arrasto trava na tela.
        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-background/80 backdrop-blur-[1px]">
          <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-primary px-8 py-6 text-primary">
            <Paperclip className="h-7 w-7" />
            <p className="text-sm font-medium">Solte para anexar à conversa</p>
            <p className="text-xs opacity-70">
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

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="relative min-h-0 flex-1 overflow-y-auto bg-background p-4"
      >
        {/* Sentinela do "rolar pra cima": carrega as anteriores ao entrar na
            viewport. Fica antes da lista, então some quando o histórico acaba. */}
        {olderFailed && (
          <button
            type="button"
            onClick={() => void loadOlderMessages()}
            className="mx-auto mb-2 block rounded-full border border-destructive/40 bg-destructive/10 px-3 py-1 text-[11px] text-destructive"
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
          <p className="py-3 text-center text-[11px] text-muted-foreground">
            Começo do histórico deste cliente
          </p>
        )}

        {/* Preso numa janela antiga: mensagem nova não entra no fim (seria
            mentira visual), então vira convite pra voltar pro tempo real. */}
        {historyWindow.pinned && (
          <button
            onClick={backToLive}
            className="sticky top-0 z-10 mx-auto block rounded-full bg-primary px-3 py-1 text-[12px] font-medium text-primary-foreground shadow-md transition-opacity hover:opacity-90"
          >
            {pendingNewCount > 0
              ? `${pendingNewCount} nova${pendingNewCount > 1 ? 's' : ''} — voltar pro fim ↓`
              : 'Voltar pro fim da conversa ↓'}
          </button>
        )}

        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Nenhuma mensagem ainda
          </div>
        ) : (
          <div className="mx-auto max-w-2xl space-y-2">
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
                // uma pílula cinza centralizada no meio do thread — não são
                // balões de cliente/atendente.
                if (msg.type === 'SYSTEM') {
                  const sysText =
                    typeof msg.content?.text === 'string'
                      ? msg.content.text
                      : 'Evento do sistema';
                  return (
                    <div key={msg.id} className="flex justify-center py-1.5">
                      <span className="max-w-md rounded-2xl bg-muted px-3 py-1 text-center text-[11px] leading-snug text-muted-foreground">
                        {sysText}
                      </span>
                    </div>
                  );
                }
                const isOutbound = msg.direction === 'OUTBOUND';
                const StatusIcon = statusIcons[msg.status] || Clock;
                const reactions = reactionMap.get(msg.externalId || '') || [];
                const isRevoked = !!msg.revokedAt;
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
                // cinza centralizada no meio do thread.
                if (msg.type === 'SYSTEM') {
                  const sysText =
                    typeof msg.content?.text === 'string'
                      ? msg.content.text
                      : 'Evento do sistema';
                  return (
                    <Fragment key={msg.id}>
                      {showDateSeparator && (
                        <div className="flex justify-center pb-1 pt-3 first:pt-0">
                          <span className="rounded-full border border-border bg-card px-3 py-0.5 font-mono text-[10px] uppercase tracking-[0.09em] text-muted-foreground">
                            {formatDateSeparator(msg.createdAt)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-center py-1.5">
                        <span className="max-w-md rounded-2xl bg-muted px-3 py-1 text-center text-[11px] leading-snug text-muted-foreground">
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
                      <span className="rounded-full border border-border bg-card px-3 py-0.5 font-mono text-[10px] uppercase tracking-[0.09em] text-muted-foreground">
                        {formatDateSeparator(msg.createdAt)}
                      </span>
                    </div>
                  )}
                  <div
                    id={`msg-${msg.id}`}
                    className={`group flex min-w-0 items-end gap-2 rounded-lg transition-colors duration-500 ${isOutbound ? 'justify-end' : 'justify-start'} ${highlightedMessageId === msg.id ? 'bg-primary/15' : ''}`}
                  >
                    {/* Botão "Responder" no hover. Aparece do lado de
                        FORA da bolha — esquerda quando outbound (msg
                        nossa, espaço à direita da bolha), direita quando
                        inbound (msg do cliente, espaço à esquerda).
                        Reactions e bolhas curtas mantêm o botão visível.
                        Mensagens já revogadas não mostram ações. */}
                    {isOutbound && canActOnMessage && (
                      <div className="flex items-center gap-1 self-center opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => startReply(msg)}
                          className="rounded-full bg-card p-1.5 text-muted-foreground shadow-soft ring-1 ring-border hover:text-foreground"
                          title="Responder"
                          aria-label="Responder esta mensagem"
                        >
                          <Reply className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRevoke(msg)}
                          className="rounded-full bg-card p-1.5 text-muted-foreground shadow-soft ring-1 ring-border hover:text-red-600 dark:hover:text-red-400"
                          title="Deletar pra todos"
                          aria-label="Deletar mensagem pra todos"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
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
                    <div className="group relative max-w-[75%]">
                      {/* Barra de reação: só faz sentido em mensagem que o
                          provider já conhece (a API recusa sem externalId) e
                          nunca sobre uma reação, um evento de sistema ou uma
                          mensagem apagada. */}
                      {msg.externalId &&
                        canActOnMessage &&
                        msg.type !== 'REACTION' &&
                        msg.type !== 'SYSTEM' && (
                          <div
                            className={`pointer-events-none absolute -top-4 z-10 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 ${
                              isOutbound ? 'right-2' : 'left-2'
                            }`}
                          >
                            <MessageReactionBar messageId={msg.id} />
                          </div>
                        )}
                      {conversation.isGroup && !isOutbound && msg.senderName && (
                        <p className="mb-0.5 ml-1 text-xs font-semibold text-primary">
                          {msg.senderName}
                        </p>
                      )}
                      {isOutbound && (msg.sender?.name || (msg.senderId && msg.senderId === user?.id && user?.name)) && (
                        <p className="mb-0.5 mr-1 text-right text-xs font-semibold text-primary">
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
                        <div
                          className={`mb-1 rounded-xl border px-3 py-2 text-xs ${
                            isOutbound
                              ? 'border-primary/40 bg-primary/10 text-primary'
                              : 'border-border bg-muted text-muted-foreground'
                          }`}
                        >
                          <p className="text-[10px] uppercase tracking-wider opacity-70">
                            Respondeu ao anúncio
                          </p>
                          {msg.metadata.replyTo.ad.title && (
                            <p className="mt-0.5 font-medium">
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
                      {msg.metadata?.replyTo &&
                        (msg.metadata.replyTo.previewText ||
                          msg.metadata.replyTo.senderName) && (
                          <button
                            type="button"
                            onClick={() => {
                              const targetId = msg.metadata?.replyTo?.messageId;
                              if (!targetId) return;
                              const el = document.getElementById(
                                `msg-${targetId}`,
                              );
                              if (el) {
                                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                el.classList.add('ring-2', 'ring-primary');
                                setTimeout(
                                  () =>
                                    el.classList.remove('ring-2', 'ring-primary'),
                                  1500,
                                );
                              }
                            }}
                            className={`mb-1 block w-full rounded-md border-l-2 border-primary px-2 py-1 text-left text-xs ${
                              isOutbound
                                ? 'bg-primary/10 text-primary hover:bg-primary/20'
                                : 'bg-muted text-muted-foreground hover:bg-muted/70'
                            }`}
                          >
                            {msg.metadata.replyTo.senderName && (
                              <p className="text-[10px] font-semibold opacity-80">
                                {msg.metadata.replyTo.senderName}
                              </p>
                            )}
                            {msg.metadata.replyTo.previewText && (
                              <p className="mt-0.5 truncate">
                                {msg.metadata.replyTo.previewText}
                              </p>
                            )}
                          </button>
                        )}
                      {isRevoked ? (
                        <div
                          className={`flex items-center gap-2 rounded-2xl border border-dashed px-4 py-2.5 italic ${
                            isOutbound
                              ? 'rounded-br-sm border-primary/40 bg-primary/5 text-primary/70'
                              : 'rounded-bl-sm border-border bg-muted text-muted-foreground'
                          }`}
                          title={
                            msg.revokeSucceededRemote
                              ? 'Mensagem deletada pra todos (provider confirmou).'
                              : 'Deletada apenas no Sendtur — o cliente ainda pode estar vendo no app dele.'
                          }
                        >
                          <Ban className="h-3.5 w-3.5 shrink-0" />
                          <span className="text-sm">
                            Mensagem deletada
                            {msg.revokeSucceededRemote === false ? ' (só aqui)' : ''}
                          </span>
                          <span className="ml-auto font-mono text-[10px] tabular-nums opacity-60">
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
                          <div
                            className={`mt-1 flex items-center gap-1 px-1 font-mono text-[10px] tabular-nums opacity-60 ${
                              isOutbound ? 'justify-end' : ''
                            }`}
                          >
                            <span>{formatTime(msg.createdAt)}</span>
                            {isOutbound && (
                              <span title={statusTooltip(msg.status, msg.failedReason)}>
                                <StatusIcon
                                  className={`h-3 w-3 ${
                                    msg.status === 'FAILED'
                                      ? 'text-red-500'
                                      : msg.status === 'READ'
                                        ? 'text-primary'
                                        : ''
                                  }`}
                                />
                              </span>
                            )}
                          </div>
                        </>
                      ) : (
                        <div
                          className={`rounded-2xl px-4 py-2.5 ${
                            isOutbound
                              ? 'rounded-br-sm bg-bubble text-bubble-foreground'
                              : 'rounded-bl-sm bg-muted text-foreground'
                          }`}
                        >
                          {msg.type === 'TEXT' ? (
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
                            <p className="text-sm italic opacity-70">[{msg.type}]</p>
                          )}
                          <div
                            className={`mt-1 flex items-center gap-1 font-mono text-[10px] tabular-nums opacity-60 ${
                              isOutbound ? 'justify-end' : ''
                            }`}
                          >
                            <span>{formatTime(msg.createdAt)}</span>
                            {isOutbound && (
                              <span title={statusTooltip(msg.status, msg.failedReason)}>
                                <StatusIcon
                                  className={`h-3 w-3 ${
                                    msg.status === 'FAILED'
                                      ? 'text-red-300'
                                      : msg.status === 'READ'
                                        ? 'text-blue-300'
                                        : ''
                                  }`}
                                />
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      {reactions.length > 0 && (
                        <div className={`absolute -bottom-2 ${isOutbound ? 'right-2' : 'left-2'} flex gap-0.5`}>
                          <span className="rounded-full bg-card px-1.5 py-0.5 text-xs shadow-soft ring-1 ring-border">
                            {[...new Set(reactions)].join('')}
                            {reactions.length > 1 && (
                              <span className="ml-0.5 text-[10px] text-muted-foreground">{reactions.length}</span>
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                    {!isOutbound && canActOnMessage && (
                      <button
                        type="button"
                        onClick={() => startReply(msg)}
                        className="self-center rounded-full bg-card p-1.5 text-muted-foreground opacity-0 shadow-soft ring-1 ring-border transition-opacity hover:text-foreground group-hover:opacity-100"
                        title="Responder"
                        aria-label="Responder esta mensagem"
                      >
                        <Reply className="h-3.5 w-3.5" />
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

      {replyingTo && (
        <ReplyPreviewBar message={replyingTo} onCancel={cancelReply} />
      )}
      <ChatInput
        ref={setInputRef}
        conversationId={conversation.id}
        onSend={handleSend}
        onSendAudio={handleSendAudio}
        onSendFile={handleSendFile}
        onSendSticker={handleSendSticker}
        disabled={conversation.status === 'CLOSED'}
        windowClosed={windowState.applicable && windowState.closed}
        windowKind={windowState.kind}
        onUseTemplate={() => setTemplatePickerOpen(true)}
        onOpenTemplates={
          conversation.channel?.type === 'WHATSAPP_OFFICIAL'
            ? () => setTemplatePickerOpen(true)
            : undefined
        }
      />

      <TemplatePickerDialog
        open={templatePickerOpen}
        channelId={conversation.channel.id}
        contact={conversation.contact}
        onClose={() => setTemplatePickerOpen(false)}
        onSend={handleSendTemplate}
      />
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
    <div className="flex items-center gap-2 border-t border-border bg-muted px-3 py-2">
      <div className="flex-1 min-w-0 border-l-2 border-primary pl-2">
        <p className="text-xs font-medium text-primary">Respondendo {sender}</p>
        <p className="truncate text-xs text-muted-foreground">
          {preview}
        </p>
      </div>
      <button
        type="button"
        onClick={onCancel}
        className="rounded-md p-1 text-muted-foreground hover:bg-muted-foreground/10 hover:text-foreground"
        aria-label="Cancelar resposta"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
