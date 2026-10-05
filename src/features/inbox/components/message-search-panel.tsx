'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, X } from 'lucide-react';
import { inboxService, type MessageSearchResult } from '../services/inbox.service';
import { controlSmCls } from '@/components/ui/control';
import { cn } from '@/lib/utils';

const DEBOUNCE_MS = 300;
/** Abaixo disto a busca casaria quase tudo e o painel viraria ruído. */
const MIN_TERM_LENGTH = 2;

type Props = {
  conversationId: string;
  onJump: (messageId: string) => void;
  onClose: () => void;
};

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

function resultTime(result: MessageSearchResult): string {
  return dateFormatter.format(
    new Date(result.providerTimestamp ?? result.createdAt),
  );
}

export function MessageSearchPanel({ conversationId, onJump, onClose }: Props) {
  const [term, setTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedTerm(term.trim()), DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [term]);

  const isSearchable = debouncedTerm.length >= MIN_TERM_LENGTH;

  const { data, isFetching } = useQuery({
    queryKey: ['message-search', conversationId, debouncedTerm],
    queryFn: () => inboxService.searchMessages(conversationId, debouncedTerm),
    enabled: isSearchable,
    staleTime: 30000,
  });

  const results = data?.messages ?? [];

  return (
    <div className="flex flex-col border-b border-border bg-card">
      <div className="flex items-center gap-2 px-2.5 py-2.5 lg:px-4.5">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && onClose()}
            placeholder="Buscar nesta conversa…"
            aria-label="Buscar nesta conversa"
            className={cn(controlSmCls, 'h-11 w-full rounded-2xl border-transparent bg-chat pl-10 pr-3 text-sm shadow-none lg:h-10')}
          />
        </div>
        <button
          onClick={onClose}
          type="button"
          aria-label="Fechar busca"
          title="Fechar busca"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:h-10 lg:w-10"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {isSearchable && (
        <div className="max-h-72 overflow-y-auto px-2.5 pb-2.5 lg:px-4.5">
          {isFetching && results.length === 0 ? (
            <p role="status" className="px-1 py-2 text-[13px] text-muted-foreground">Procurando…</p>
          ) : results.length === 0 ? (
            <p className="px-1 py-2 text-[13px] text-muted-foreground">
              Nenhuma mensagem com “{debouncedTerm}” nesta conversa.
            </p>
          ) : (
            <ul className="flex flex-col gap-0.5">
              {results.map((result) => (
                <li key={result.id}>
                  <button
                    onClick={() => onJump(result.id)}
                    className="min-h-10 w-full rounded-xl px-3 py-2 text-left transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                  >
                    <span className="block text-xs text-muted-foreground">
                      {result.direction === 'INBOUND'
                        ? 'Cliente'
                        : result.senderName || 'Você'}{' '}
                      · {resultTime(result)}
                    </span>
                    <span className="block truncate text-sm text-foreground">
                      {result.snippet}
                    </span>
                    {/* Resultado de atendimento anterior (às vezes de outro
                        número) sem etiqueta apareceria sem contexto nenhum. */}
                    {!result.isCurrentConversation && result.conversation && (
                      <span className="mt-0.5 block truncate text-xs font-medium text-warning-ink">
                        Atendimento anterior
                        {result.conversation.protocol ? ` · ${result.conversation.protocol}` : ''}
                        {` · ${result.conversation.channelName}`}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
