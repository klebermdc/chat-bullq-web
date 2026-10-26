'use client';

import { Fragment, useCallback, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Archive, History, Loader2 } from 'lucide-react';
import {
  inboxService,
  type UmblerConversationBrief,
  type UmblerMessage,
} from '../services/inbox.service';
import {
  isUmblerConversationBoundary,
  isUmblerNewDay,
  mergeOlderUmblerPage,
  oldestUmblerCursor,
  umblerButtonLabel,
} from '../lib/umbler-history';
import { ConversationDivider } from './conversation-divider';
import { UmblerMessageBubble, type RenderMessageText } from './umbler-message-bubble';

const AVAILABILITY_STALE_MS = 60_000;
const DIVIDER_LABEL = 'Umbler (arquivo)';
const PILL_CLS =
  'rounded-full bg-card px-3 py-1 font-mono text-xs font-medium tabular-nums text-muted-foreground';
const ACTION_CLS =
  'flex min-h-9 items-center gap-2 rounded-full bg-card px-4 py-2 text-[13px] font-semibold text-foreground shadow-soft transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60';

type UmblerHistorySectionProps = {
  conversationId: string;
  /** O histórico do Sendtur chegou ao começo — só aí a Umbler entra. */
  reachedStart: boolean;
  /** Área rolável do chat: preserva a posição ao emendar páginas em cima. */
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  renderText: RenderMessageText;
};

/** O que fazer com a rolagem depois que a página nova pintar. */
type ScrollIntent = { kind: 'reveal' } | { kind: 'keep'; fromBottom: number } | null;
/** Pra onde o foco vai depois da página: o arquivo recém-aberto ou o fim dele. */
type FocusIntent = 'section' | 'start' | null;

function formatDay(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function dividerBrief(brief: UmblerConversationBrief | undefined, fallbackAt: string) {
  return {
    protocol: null,
    channelName: brief?.channelName ?? '',
    startedAt: brief?.startedAt ?? fallbackAt,
  };
}

/**
 * Quanto arquivo da Umbler o cliente tem. Só pergunta quando o histórico do
 * Sendtur acabou; o ChatPanel usa a mesma chave pra saber se ainda é o começo.
 */
export function useUmblerAvailability(conversationId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['umbler-history-availability', conversationId],
    queryFn: () => inboxService.getUmblerHistoryAvailability(conversationId),
    enabled,
    staleTime: AVAILABILITY_STALE_MS,
  });
}

/**
 * Arquivo da Umbler acima do histórico do Sendtur. Lista própria, fora do
 * cache ['messages', id]: são mensagens de outro sistema, sem status nem
 * socket, e misturá-las no cache confundiria envio, backfill e citações.
 */
export function UmblerHistorySection({
  conversationId,
  reachedStart,
  scrollContainerRef,
  renderText,
}: UmblerHistorySectionProps) {
  const [messages, setMessages] = useState<UmblerMessage[]>([]);
  const [conversations, setConversations] = useState<Record<string, UmblerConversationBrief>>({});
  const [isOpen, setIsOpen] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const scrollIntentRef = useRef<ScrollIntent>(null);
  const focusIntentRef = useRef<FocusIntent>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const startRef = useRef<HTMLParagraphElement>(null);

  const { data: availability } = useUmblerAvailability(conversationId, reachedStart);

  const loadPage = useCallback(async () => {
    if (isLoading) return;
    const isFirstPage = messages.length === 0;
    setIsLoading(true);
    setFailed(false);
    try {
      const page = await inboxService.getUmblerHistory(conversationId, oldestUmblerCursor(messages));
      // Foto da rolagem só agora: durante o fetch o usuário pode ter rolado.
      const el = scrollContainerRef.current;
      scrollIntentRef.current = isFirstPage
        ? { kind: 'reveal' }
        : el
          ? { kind: 'keep', fromBottom: el.scrollHeight - el.scrollTop }
          : null;
      // Leitor de tela e teclado acompanham: o botão clicado some ou pode sumir.
      focusIntentRef.current = isFirstPage ? 'section' : page.hasMore ? null : 'start';
      setMessages((prev) => mergeOlderUmblerPage(prev, page.messages));
      setConversations((prev) => ({ ...prev, ...page.conversations }));
      setHasMore(page.hasMore);
      setIsOpen(true);
    } catch (err) {
      console.warn('[chat] histórico da Umbler falhou', err);
      scrollIntentRef.current = null;
      focusIntentRef.current = null;
      setFailed(true);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, isLoading, messages, scrollContainerRef]);

  // Página mais antiga entrou em cima: mantém o que o usuário lia no lugar.
  // Na primeira, mostra o fim do arquivo — senão o clique "não faria nada".
  useLayoutEffect(() => {
    const intent = scrollIntentRef.current;
    scrollIntentRef.current = null;
    const el = scrollContainerRef.current;
    if (intent?.kind === 'reveal') {
      endRef.current?.scrollIntoView({ block: 'end' });
    } else if (intent && el) {
      el.scrollTop = el.scrollHeight - intent.fromBottom;
    }

    // Depois da rolagem, e sem rolar de novo: o foco não briga com a posição.
    const focusIntent = focusIntentRef.current;
    focusIntentRef.current = null;
    const target =
      focusIntent === 'section'
        ? sectionRef.current
        : focusIntent === 'start'
          ? startRef.current
          : null;
    target?.focus({ preventScroll: true });
  }, [messages, scrollContainerRef]);

  if (!reachedStart || !availability || availability.messages <= 0) return null;

  if (!isOpen) {
    return (
      <div className="flex flex-col items-center gap-1.5 py-3">
        <button type="button" onClick={() => void loadPage()} disabled={isLoading} className={ACTION_CLS}>
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Archive className="h-4 w-4" aria-hidden="true" />
          )}
          {umblerButtonLabel(availability.messages, availability.oldestAt)}
        </button>
        {failed && <FailedNotice />}
      </div>
    );
  }

  return (
    <section
      ref={sectionRef}
      tabIndex={-1}
      aria-label="Histórico importado da Umbler"
      className="mx-auto max-w-3xl pb-3 outline-none"
    >
      <p className="flex items-center justify-center gap-1.5 py-2 text-xs text-muted-foreground">
        <Archive className="h-3.5 w-3.5" aria-hidden="true" />
        Histórico importado da Umbler — somente leitura
      </p>

      {hasMore ? (
        <div className="flex justify-center py-2">
          <button type="button" onClick={() => void loadPage()} disabled={isLoading} className={ACTION_CLS}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <History className="h-4 w-4" aria-hidden="true" />
            )}
            Carregar mais antigas
          </button>
        </div>
      ) : (
        <p ref={startRef} tabIndex={-1} className="py-2 text-center text-xs text-muted-foreground outline-none">
          Começo do histórico na Umbler
        </p>
      )}
      {failed && <FailedNotice />}

      <div className="space-y-2.5">
        {messages.map((msg, index) => {
          const day = isUmblerNewDay(messages, index) ? formatDay(msg.sentAt) : '';
          return (
            <Fragment key={msg.id}>
              {isUmblerConversationBoundary(messages, index) && (
                <ConversationDivider
                  brief={dividerBrief(conversations[msg.conversationId], msg.sentAt)}
                  isCurrent={false}
                  label={DIVIDER_LABEL}
                />
              )}
              {day && (
                <div className="flex justify-center pb-1 pt-1">
                  <span className={PILL_CLS}>{day}</span>
                </div>
              )}
              <UmblerMessageBubble message={msg} renderText={renderText} />
            </Fragment>
          );
        })}
      </div>
      <div ref={endRef} />
    </section>
  );
}

function FailedNotice() {
  return (
    <p role="alert" className="py-1 text-center text-xs text-urgent-ink">
      Não foi possível carregar o histórico da Umbler — tente de novo
    </p>
  );
}
