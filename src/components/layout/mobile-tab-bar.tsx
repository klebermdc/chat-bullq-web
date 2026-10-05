'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessageCircle, Users, LayoutDashboard, MoreHorizontal } from 'lucide-react';
import { useMobileChrome } from '@/stores/mobile-chrome-store';
import { cn } from '@/lib/utils';

// Mesmas palavras e ícones do menu do desktop (app-sidebar).
const tabs = [
  { href: '/inbox', label: 'Inbox', icon: MessageCircle, match: (p: string) => p.startsWith('/inbox') },
  { href: '/settings/contacts', label: 'Contatos', icon: Users, match: (p: string) => p.startsWith('/settings/contacts') },
  { href: '/dashboard', label: 'Painel', icon: LayoutDashboard, match: (p: string) => p.startsWith('/dashboard') },
];

// 56px no total com a borda de 1px do <nav> — o layout reserva 3.5rem + área
// segura embaixo do conteúdo; se mexer aqui, mexa lá.
const itemCls = (active: boolean) =>
  cn(
    'relative flex h-[calc(3.5rem-1px)] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
    active ? 'text-primary' : 'text-muted-foreground',
  );

function ActiveIndicator() {
  return <span aria-hidden="true" className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-primary" />;
}

export function MobileTabBar() {
  const pathname = usePathname();
  const hideTabBar = useMobileChrome((s) => s.hideTabBar);
  const setNavDrawerOpen = useMobileChrome((s) => s.setNavDrawerOpen);
  const isNavDrawerOpen = useMobileChrome((s) => s.navDrawerOpen);

  if (hideTabBar) return null;

  // Fora das três abas (CRM, Relatórios, Configurações…) a página atual está
  // dentro de "Mais": é ele que acende, para nunca ficar sem aba marcada.
  const isMoreActive = !tabs.some((t) => t.match(pathname));

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-card pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {tabs.map((t) => {
        const active = t.match(pathname);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? 'page' : undefined}
            className={itemCls(active)}
          >
            {active && <ActiveIndicator />}
            <t.icon aria-hidden="true" className="size-[22px]" />
            <span className="max-w-full truncate px-1">{t.label}</span>
          </Link>
        );
      })}
      {/* "Mais" abre o drawer de navegação completo (AppSidebar) do SidebarLayout. */}
      <button
        type="button"
        onClick={() => setNavDrawerOpen(true)}
        aria-label={
          isMoreActive ? 'Mais opções de navegação (contém a página atual)' : 'Mais opções de navegação'
        }
        aria-haspopup="dialog"
        aria-expanded={isNavDrawerOpen}
        className={itemCls(isMoreActive)}
      >
        {isMoreActive && <ActiveIndicator />}
        <MoreHorizontal aria-hidden="true" className="size-[22px]" />
        <span>Mais</span>
      </button>
    </nav>
  );
}
