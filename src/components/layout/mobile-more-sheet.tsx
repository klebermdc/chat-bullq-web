'use client';

import Link from 'next/link';
import { LayoutDashboard, FolderKanban, Zap, Bot, GitBranch, Settings, LogOut, Building2 } from 'lucide-react';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { useAuthStore } from '@/stores/auth-store';

const links = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/pipelines', label: 'Pipelines', icon: GitBranch },
  { href: '/ai-agents', label: 'Jarvis (IA)', icon: Bot },
  { href: '/projects', label: 'Projetos', icon: FolderKanban },
  { href: '/automations', label: 'Automações', icon: Zap },
  { href: '/settings', label: 'Configurações', icon: Settings },
];

export function MobileMoreSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, organizations, activeOrgId, setActiveOrg, logout } = useAuthStore();
  const activeOrg = organizations.find((o) => o.id === activeOrgId);

  const rowCls =
    'flex items-center gap-3 px-4 py-3 text-sm text-zinc-700 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800';

  return (
    <BottomSheet open={open} onClose={onClose} title="Menu">
      {organizations.length > 1 && (
        <div className="border-b border-zinc-100 pb-2 dark:border-zinc-800">
          <div className="px-4 pb-1 pt-1 text-[11px] font-medium uppercase tracking-wide text-zinc-400">
            Organização
          </div>
          {organizations.map((org) => (
            <button
              key={org.id}
              onClick={() => {
                setActiveOrg(org.id);
                window.location.reload();
              }}
              className={`${rowCls} w-full text-left ${org.id === activeOrgId ? 'font-semibold text-primary' : ''}`}
            >
              <Building2 className="size-5" />
              {org.name}
            </button>
          ))}
        </div>
      )}

      {links.map((l) => (
        <Link key={l.href} href={l.href} onClick={onClose} className={rowCls}>
          <l.icon className="size-5" />
          {l.label}
        </Link>
      ))}

      <button onClick={() => { onClose(); logout(); }} className={`${rowCls} w-full text-left text-red-600 dark:text-red-400`}>
        <LogOut className="size-5" />
        Sair {user?.email ? `(${user.email})` : ''}
      </button>
      <div className="px-4 pb-2 pt-1 text-[11px] text-zinc-400">{activeOrg?.name}</div>
    </BottomSheet>
  );
}
