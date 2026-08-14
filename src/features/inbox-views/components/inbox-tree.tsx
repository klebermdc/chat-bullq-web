'use client';

import { useState } from 'react';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { ChevronRight, ChevronDown, MessageCircle } from 'lucide-react';

const STORAGE_KEY = 'inbox-tree-expanded';

/**
 * Árvore do Inbox na sidebar: só o nó "Inbox" e a sub-linha "Geral".
 *
 * As inbox views (Não lidas, Distribuição, Archived e qualquer uma criada
 * pela seleção de conversas) deixaram de ser listadas aqui a pedido — o
 * menu ficou enxuto. Elas continuam existindo no banco e acessíveis por
 * /inbox?view=<id>; quem mexe nelas agora é o menu de contexto da conversa.
 */
export function InboxTree() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Navegação programática que GARANTE o reset da query string ao voltar
  // pra "Geral" vindo de uma view. <Link href="/inbox"> sozinho mantém o
  // `?view=…` na URL porque o Next trata clique no mesmo pathname como no-op.
  const goGeral = () => router.push('/inbox');

  const [expanded, setExpanded] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return window.localStorage.getItem(STORAGE_KEY) !== '0';
  });

  const toggleExpanded = () => {
    const next = !expanded;
    setExpanded(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
    }
  };

  const isInbox = pathname === '/inbox' || pathname?.startsWith('/inbox');
  const activeViewId = searchParams.get('view');
  const isGeralActive = isInbox && !activeViewId;

  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={toggleExpanded}
          aria-label={expanded ? 'Recolher' : 'Expandir'}
          className="menu-btn flex h-7 w-5 items-center justify-center rounded"
        >
          {expanded ? (
            <ChevronDown className="size-3.5" />
          ) : (
            <ChevronRight className="size-3.5" />
          )}
        </button>
        <button
          type="button"
          onClick={goGeral}
          className={`flex flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm font-medium ${
            isGeralActive ? 'menu-row-active' : 'menu-row'
          }`}
        >
          <MessageCircle className="size-5" />
          <span className="flex-1">Inbox</span>
        </button>
      </div>

      {expanded && (
        <div className="menu-border ml-5 space-y-0.5 border-l pl-2">
          <button
            type="button"
            onClick={goGeral}
            className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs ${
              isGeralActive ? 'menu-subrow-active font-medium' : 'menu-subrow'
            }`}
          >
            <MessageCircle className="menu-muted size-3.5" />
            <span className="flex-1">Geral</span>
          </button>
        </div>
      )}
    </div>
  );
}
