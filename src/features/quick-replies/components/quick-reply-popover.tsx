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

/** Lista que abre acima do campo de mensagem quando o atendente digita "/". */
export function QuickReplyPopover({ items, activeIndex, query, isLoading, onPick, onHover }: Props) {
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    listRef.current?.children[activeIndex]?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  return (
    <div
      role="listbox"
      aria-label="Mensagens rápidas"
      className="absolute bottom-full left-0 right-0 z-30 mb-2 overflow-hidden rounded-xl border border-border bg-card shadow-lg"
    >
      <div className="flex items-center gap-1.5 border-b border-border px-3 py-1.5 text-[11px] text-muted-foreground">
        <Zap className="h-3.5 w-3.5" />
        Mensagens rápidas {query && <span className="font-mono">/{query}</span>}
        <span className="ml-auto hidden sm:inline">↑↓ escolher · Enter inserir · Esc fechar</span>
      </div>
      {items.length === 0 ? (
        <p className="px-3 py-3 text-sm text-muted-foreground">
          {isLoading ? 'Carregando…' : 'Nenhuma mensagem rápida encontrada. Cadastre em Configurações → Mensagens rápidas.'}
        </p>
      ) : (
        <ul ref={listRef} className="max-h-64 overflow-y-auto py-1">
          {items.map((r, i) => (
            <li key={r.id} role="option" aria-selected={i === activeIndex}>
              <button
                type="button"
                // mousedown + preventDefault: não tira o foco do textarea antes de inserir.
                onMouseDown={(e) => {
                  e.preventDefault();
                  onPick(r);
                }}
                onMouseEnter={() => onHover(i)}
                className={`block w-full px-3 py-2 text-left ${i === activeIndex ? 'bg-primary/10' : 'hover:bg-muted'}`}
              >
                <p className="text-sm">
                  <span className="font-mono text-primary">/{r.shortcut}</span>
                  <span className="ml-2 font-medium text-foreground">{r.title}</span>
                </p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{r.content}</p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
