'use client';

import { usePathname, useRouter } from 'next/navigation';
import { MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Linha do Inbox na sidebar. Inbox único: WhatsApp e Instagram juntos.
 *
 * É <button> com router.push, e não <Link>: vindo de /inbox?view=<id>, o
 * Next trata clique no mesmo pathname como no-op e manteria o `?view=` na URL.
 */
export function InboxTree() {
  const pathname = usePathname();
  const router = useRouter();
  const isActive = !!pathname?.startsWith('/inbox');

  return (
    <div className="space-y-0.5">
      <button
        type="button"
        onClick={() => router.push('/inbox')}
        className={cn(
          'flex w-full items-center gap-3 rounded-lg p-2 text-left text-sm/6 font-medium transition-colors',
          isActive ? 'menu-row-active' : 'menu-row',
        )}
      >
        <MessageCircle className="size-5" />
        <span className="flex-1">Inbox</span>
      </button>
    </div>
  );
}
