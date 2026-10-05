'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Mail } from 'lucide-react';
import { cn, isRouteActive } from '@/lib/utils';

/**
 * Linha do Email na sidebar. Não é mais uma árvore: sem seta de
 * expandir/recolher e sem sub-linhas.
 *
 * Campanhas e Destinatários deixaram de ser dois destinos e viraram
 * pílulas dentro de /email — a divisão passou da sidebar pra própria
 * página.
 */
export function EmailTree() {
  const pathname = usePathname();

  return (
    <Link
      href="/email"
      className={cn(
        'flex w-full items-center gap-3 rounded-lg p-2 text-left text-sm/6 font-medium transition-colors',
        isRouteActive(pathname, '/email') ? 'menu-row-active' : 'menu-row',
      )}
    >
      <Mail className="size-5" />
      <span className="flex-1">Email</span>
    </Link>
  );
}
