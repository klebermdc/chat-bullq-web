'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, X } from 'lucide-react';
import { inboxService, type MessageSearchResult } from '../services/inbox.service';

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
    <div className="flex flex-col border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center gap-2 px-3 py-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
          <input
            ref={inputRef}
            type="text"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && onClose()}
            placeholder="Buscar nesta conversa..."
            className="w-full rounded-md border-0 bg-zinc-100/80 py-1.5 pl-8 pr-3 text-[13px] text-zinc-900 outline-none ring-1 ring-transparent transition-all placeholder:text-zinc-400 focus:bg-white focus:ring-primary/30 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500"
          />
        </div>
        <button
          onClick={onClose}
          aria-label="Fechar busca"
          className="rounded p-1 text-zinc-400 transition-colors hover:text-zinc-600 dark:hover:text-zinc-300"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {isSearchable && (
        <div className="max-h-64 overflow-y-auto px-3 pb-2">
          {isFetching && results.length === 0 ? (
            <p className="py-2 text-[12px] text-zinc-500">Procurando...</p>
          ) : results.length === 0 ? (
            <p className="py-2 text-[12px] text-zinc-500">
              Nenhuma mensagem com “{debouncedTerm}” nesta conversa.
            </p>
          ) : (
            <ul className="flex flex-col gap-0.5">
              {results.map((result) => (
                <li key={result.id}>
                  <button
                    onClick={() => onJump(result.id)}
                    className="w-full rounded-md px-2 py-1.5 text-left transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-900"
                  >
                    <span className="block text-[11px] text-zinc-500">
                      {result.direction === 'INBOUND'
                        ? 'Cliente'
                        : result.senderName || 'Você'}{' '}
                      · {resultTime(result)}
                    </span>
                    <span className="block truncate text-[12px] text-zinc-700 dark:text-zinc-300">
                      {result.snippet}
                    </span>
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
