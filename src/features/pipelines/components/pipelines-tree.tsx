'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { KanbanSquare } from 'lucide-react';
import { cn, isRouteActive } from '@/lib/utils';

/**
 * Linha do CRM na sidebar. Não é mais uma árvore: sem seta de
 * expandir/recolher e sem sub-linhas.
 *
 * A lista de pipelines virou pílulas dentro de /pipelines — a divisão
 * passou da sidebar pra própria página. A rota segue /pipelines; só o
 * rótulo virou "CRM".
 */
export function PipelinesTree() {
  const pathname = usePathname();

  return (
    <Link
      href="/pipelines"
      className={cn(
        'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm font-medium',
        isRouteActive(pathname, '/pipelines') ? 'menu-row-active' : 'menu-row',
      )}
    >
      <KanbanSquare className="size-5" />
      <span className="flex-1">CRM</span>
    </Link>
  );
}
