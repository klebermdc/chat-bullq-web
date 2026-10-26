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
  const endRef = useRef<HTMLDivElement>(null);

  const { data: availability } = useQuery({
    queryKey: ['umbler-history-availability', conversationId],
    queryFn: () => inboxService.getUmblerHistoryAvailability(conversationId),
    enabled: reachedStart,
    staleTime: AVAILABILITY_STALE_MS,
  });

  const loadPage = useCallback(async () => {
    if (isLoading) return;
    const el = scrollContainerRef.current;
    scrollIntentRef.current =
      messages.length === 0
        ? { kind: 'reveal' }
        : el
          ? { kind: 'keep', fromBottom: el.scrollHeight - el.scrollTop }
          : null;
    setIsLoading(true);
    setFailed(false);
    try {
      const page = await inboxService.getUmblerHistory(conversationId, oldestUmblerCursor(messages));
      setMessages((prev) => mergeOlderUmblerPage(prev, page.messages));
      setConversations((prev) => ({ ...prev, ...page.conversations }));
      setHasMore(page.hasMore);
      setIsOpen(true);
    } catch (err) {
      console.warn('[chat] histórico da Umbler falhou', err);
      scrollIntentRef.current = null;
      setFailed(true);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, isLoading, messages, scrollContainerRef]);

  // Página mais antiga entrou em cima: mantém o que o usuário lia no lugar.
  // Na primeira, mostra o fim do arquivo — senão o clique "não faria nada".
  useLayoutEffect(() => {
    const intent = scrollIntentRef.current;
    if (!intent) return;
    scrollIntentRef.current = null;
    const el = scrollContainerRef.current;
    if (intent.kind === 'reveal') {
      endRef.current?.scrollIntoView({ block: 'end' });
    } else if (el) {
      el.scrollTop = el.scrollHeight - intent.fromBottom;
    }
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
    <section aria-label="Histórico importado da Umbler" className="mx-auto max-w-3xl pb-3">
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
        <p className="py-2 text-center text-xs text-muted-foreground">Começo do histórico na Umbler</p>
      )}
      {failed && <FailedNotice />}

      <div className="space-y-2.5">
        {messages.map((msg, index) => (
          <Fragment key={msg.id}>
            {isUmblerConversationBoundary(messages, index) && (
              <ConversationDivider
                brief={dividerBrief(conversations[msg.conversationId], msg.sentAt)}
                isCurrent={false}
                label={DIVIDER_LABEL}
              />
            )}
            {isUmblerNewDay(messages, index) && (
              <div className="flex justify-center pb-1 pt-1">
                <span className={PILL_CLS}>{formatDay(msg.sentAt)}</span>
              </div>
            )}
            <UmblerMessageBubble message={msg} renderText={renderText} />
          </Fragment>
        ))}
      </div>
      <div ref={endRef} />
    </section>
  );
}

function FailedNotice() {
  return (
    <p className="py-1 text-center text-xs text-urgent-ink">
      Não foi possível carregar o histórico da Umbler — tente de novo
    </p>
  );
}
