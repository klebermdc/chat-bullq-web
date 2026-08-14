'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { MessageCircle, Instagram } from 'lucide-react';
import { cn } from '@/lib/utils';

// Cores de marca, não tokens do tema — o ponto é reconhecer o canal de
// relance. O verde é o do WhatsApp; o magenta já é o usado no selo de
// origem "Instagram Orgânico", então o app fala uma língua só.
const WHATSAPP_GREEN = '#25D366';
const INSTAGRAM_PINK = '#E1306C';

/**
 * Linhas de Inbox na sidebar: o geral e o do Instagram.
 *
 * O geral é <button> com router.push, e não <Link>: vindo de
 * /inbox?view=<id>, o Next trata clique no mesmo pathname como no-op e
 * manteria o `?view=` na URL. O do Instagram é outra rota, então Link basta.
 */
export function InboxTree() {
  const pathname = usePathname();
  const router = useRouter();

  const isInstagram = pathname === '/inbox/instagram';
  // O inbox geral não pode acender quando estamos no do Instagram — que é
  // uma sub-rota dele. Por isso a exclusão explícita, em vez de isRouteActive.
  const isGeral = !!pathname?.startsWith('/inbox') && !isInstagram;

  const rowClass = (active: boolean) =>
    cn(
      'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm font-medium',
      active ? 'menu-row-active' : 'menu-row',
    );

  return (
    <div className="space-y-0.5">
      <button type="button" onClick={() => router.push('/inbox')} className={rowClass(isGeral)}>
        <MessageCircle className="size-5" style={{ color: WHATSAPP_GREEN }} />
        <span className="flex-1">Inbox</span>
      </button>

      <Link href="/inbox/instagram" className={rowClass(isInstagram)}>
        <Instagram className="size-5" style={{ color: INSTAGRAM_PINK }} />
        <span className="flex-1">Inbox Instagram</span>
      </Link>
    </div>
  );
}
