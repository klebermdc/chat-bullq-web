'use client';

import { useEffect, useRef } from 'react';
import { Zap } from 'lucide-react';
import type { QuickReply } from '../services/quick-replies.service';

type Props = {
  items: QuickReply[];
  activeIndex: number;
  query: string;
  isLoading: boolean;
  onPick: (reply: QuickReply) => void;
  onHover: (index: number) => void;
};

/** id do listbox — o textarea do compositor aponta pra cá com `aria-controls`. */
export const QUICK_REPLY_LISTBOX_ID = 'quick-reply-listbox';

/** id de cada opção — é o que o `aria-activedescendant` do textarea recebe. */
export function quickReplyOptionId(replyId: string): string {
  return `quick-reply-option-${replyId}`;
}

/**
 * Lista que abre acima do campo de mensagem quando o atendente digita "/".
 *
 * Padrão combobox: o foco nunca sai do textarea. As opções são `role="option"`
 * puras (sem botão dentro) e a ativa é apontada pelo `aria-activedescendant`.
 */
export function QuickReplyPopover({ items, activeIndex, query, isLoading, onPick, onHover }: Props) {
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    listRef.current?.children[activeIndex]?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  return (
    <div className="absolute bottom-full left-0 right-0 z-30 mb-2 overflow-hidden rounded-xl border border-border bg-popover shadow-elevated">
      <div
        aria-hidden="true"
        className="flex items-center gap-1.5 border-b border-border px-3 py-1.5 text-[11px] text-muted-foreground"
      >
        <Zap className="h-3.5 w-3.5 shrink-0" />
        Mensagens rápidas {query && <span className="font-mono">/{query}</span>}
        <span className="ml-auto hidden sm:inline">↑↓ escolher · Enter inserir · Esc fechar</span>
      </div>
      {items.length === 0 ? (
        <p role="status" className="px-3 py-3 text-sm text-muted-foreground">
          {isLoading ? 'Carregando…' : 'Nenhuma mensagem rápida encontrada. Cadastre em Configurações → Mensagens rápidas.'}
        </p>
      ) : (
        <ul
          ref={listRef}
          id={QUICK_REPLY_LISTBOX_ID}
          role="listbox"
          aria-label="Mensagens rápidas"
          className="max-h-64 overflow-y-auto py-1"
        >
          {items.map((r, i) => (
            <li
              key={r.id}
              id={quickReplyOptionId(r.id)}
              role="option"
              aria-selected={i === activeIndex}
              // mousedown + preventDefault: não tira o foco do textarea antes de inserir.
              onMouseDown={(e) => {
                e.preventDefault();
                onPick(r);
              }}
              onMouseEnter={() => onHover(i)}
              className={`cursor-pointer px-3 py-2 text-left ${i === activeIndex ? 'bg-primary/10' : 'hover:bg-muted'}`}
            >
              <p className="text-sm">
                <span className="font-mono text-primary">/{r.shortcut}</span>
                <span className="ml-2 font-medium text-foreground">{r.title}</span>
              </p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{r.content}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
