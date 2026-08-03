'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronDown, ChevronRight, Mail, Send, Users } from 'lucide-react';

const STORAGE_KEY = 'email-tree-expanded';

/**
 * Sidebar tree for Email — header opens Campanhas, children go to
 * Campanhas e Destinatários. Mirrors the pattern of InboxTree/PipelinesTree
 * so Email gets the same navigation surface as the other sections.
 */
export function EmailTree() {
  const pathname = usePathname();
  const router = useRouter();
  const [expanded, setExpanded] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  });

  const isEmailArea = !!pathname?.startsWith('/email');
  const isCampanhas = !!pathname?.startsWith('/email/campanhas');
  const isContatos = !!pathname?.startsWith('/email/contatos');

  const toggleExpanded = () => {
    const next = !expanded;
    setExpanded(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
    }
  };

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
          onClick={() => router.push('/email/campanhas')}
          className={`flex flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm font-medium ${
            isEmailArea ? 'menu-row-active' : 'menu-row'
          }`}
        >
          <Mail className="size-5" />
          <span className="flex-1">Email</span>
        </button>
      </div>

      {expanded && (
        <div className="menu-border ml-5 space-y-0.5 border-l pl-2">
          <button
            type="button"
            onClick={() => router.push('/email/campanhas')}
            className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs ${
              isCampanhas ? 'menu-subrow-active font-medium' : 'menu-subrow'
            }`}
          >
            <Send className="menu-muted size-3.5" />
            <span className="flex-1">Campanhas</span>
          </button>
          <button
            type="button"
            onClick={() => router.push('/email/contatos')}
            className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs ${
              isContatos ? 'menu-subrow-active font-medium' : 'menu-subrow'
            }`}
          >
            <Users className="menu-muted size-3.5" />
            <span className="flex-1">Destinatários</span>
          </button>
        </div>
      )}
    </div>
  );
}
