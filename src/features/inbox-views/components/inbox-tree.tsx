'use client';

import { usePathname, useRouter } from 'next/navigation';
import { MessageCircle } from 'lucide-react';

/**
 * Linha do Inbox na sidebar. Não é mais uma árvore: sem seta de
 * expandir/recolher e sem sub-linhas.
 *
 * As inbox views (Não lidas, Distribuição, Archived e as criadas pela
 * seleção de conversas) continuam no banco e acessíveis por
 * /inbox?view=<id> — só não são listadas aqui.
 *
 * Continua sendo um <button> com router.push, e não um <Link>: vindo de
 * /inbox?view=<id>, o Next trata clique no mesmo pathname como no-op e
 * manteria o `?view=…` na URL. O push garante o reset da query string.
 */
export function InboxTree() {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = pathname === '/inbox' || pathname?.startsWith('/inbox');

  return (
    <button
      type="button"
      onClick={() => router.push('/inbox')}
      className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm font-medium ${
        isActive ? 'menu-row-active' : 'menu-row'
      }`}
    >
      <MessageCircle className="size-5" />
      <span className="flex-1">Inbox</span>
    </button>
  );
}
