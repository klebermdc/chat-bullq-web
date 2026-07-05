'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessageSquare, Users, BarChart3, MoreHorizontal } from 'lucide-react';
import { useMobileChrome } from '@/stores/mobile-chrome-store';
import { MobileMoreSheet } from './mobile-more-sheet';

const tabs = [
  { href: '/inbox', label: 'Inbox', icon: MessageSquare, match: (p: string) => p.startsWith('/inbox') },
  { href: '/settings/contacts', label: 'Contatos', icon: Users, match: (p: string) => p.startsWith('/settings/contacts') },
  { href: '/dashboard', label: 'Painel', icon: BarChart3, match: (p: string) => p.startsWith('/dashboard') },
];

export function MobileTabBar() {
  const pathname = usePathname();
  const hideTabBar = useMobileChrome((s) => s.hideTabBar);
  const [moreOpen, setMoreOpen] = useState(false);

  if (hideTabBar) return null;

  const itemCls = (active: boolean) =>
    `flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[10px] ${
      active ? 'text-primary' : 'text-zinc-400 dark:text-zinc-500'
    }`;

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-zinc-200 bg-white pb-[env(safe-area-inset-bottom)] dark:border-zinc-800 dark:bg-zinc-950 lg:hidden">
        {tabs.map((t) => {
          const active = t.match(pathname);
          return (
            <Link key={t.href} href={t.href} className={itemCls(active)}>
              <t.icon className="size-5" />
              {t.label}
            </Link>
          );
        })}
        <button type="button" onClick={() => setMoreOpen(true)} className={itemCls(false)}>
          <MoreHorizontal className="size-5" />
          Mais
        </button>
      </nav>
      <MobileMoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />
    </>
  );
}
