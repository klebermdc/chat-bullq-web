'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Radio,
  Users,
  Tags,
  Bell,
  Building2,
  KeyRound,
  Sparkles,
  BookUser,
  Layers,
  Webhook,
  BrainCircuit,
  FileText,
  RotateCcw,
  Clock,
  Repeat,
  Phone,
  MessageSquare,
  Share2,
  CalendarClock,
  Megaphone,
  type LucideIcon,
} from 'lucide-react';
import { cn, isRouteActive } from '@/lib/utils';

type SettingsItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

type SettingsGroup = {
  title: string;
  items: readonly SettingsItem[];
};

export const SETTINGS_GROUPS: readonly SettingsGroup[] = [
  {
    title: 'Atendimento',
    items: [
      { href: '/settings/channels', label: 'Canais', icon: Radio },
      { href: '/settings/templates', label: 'Templates', icon: FileText },
      { href: '/settings/greeting', label: 'Saudação', icon: MessageSquare },
      { href: '/settings/horarios', label: 'Horários', icon: CalendarClock },
    ],
  },
  {
    title: 'Automação',
    items: [
      { href: '/settings/cadences', label: 'Cadências', icon: Repeat },
      { href: '/settings/recovery', label: 'Recuperação', icon: RotateCcw },
      { href: '/settings/inactivity', label: 'Inatividade', icon: Clock },
      { href: '/settings/reengagement', label: 'Reengajamento', icon: Repeat },
      { href: '/settings/segments', label: 'Segmentos', icon: Layers },
    ],
  },
  {
    title: 'Organização',
    items: [
      { href: '/settings/general', label: 'Geral', icon: Building2 },
      { href: '/settings/members', label: 'Membros', icon: Users },
      { href: '/settings/contacts', label: 'Contatos', icon: BookUser },
      { href: '/settings/tags', label: 'Tags', icon: Tags },
    ],
  },
  {
    title: 'Inteligência Artificial',
    items: [
      { href: '/settings/ai', label: 'IA', icon: Sparkles },
      { href: '/settings/ai-providers', label: 'Provedores IA', icon: BrainCircuit },
    ],
  },
  {
    title: 'Integrações',
    items: [
      { href: '/settings/sonax', label: 'Ligações', icon: Phone },
      { href: '/settings/notifications', label: 'Notificações', icon: Bell },
      { href: '/settings/api-keys', label: 'API Keys', icon: KeyRound },
      { href: '/settings/webhooks', label: 'Webhooks', icon: Webhook },
      { href: '/settings/meta-capi', label: 'Meta CAPI', icon: Share2 },
      { href: '/settings/meta-ads', label: 'Meta Ads', icon: Megaphone },
    ],
  },
] as const;

const ALL_ITEMS: readonly SettingsItem[] = SETTINGS_GROUPS.flatMap((group) => group.items);

const ACTIVE_CLASSES = 'bg-primary/10 font-medium text-primary';
const IDLE_CLASSES =
  'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100';

/**
 * Navegação das Configurações: coluna lateral no desktop (agrupada por
 * seção) e faixa horizontal rolável no mobile, onde a coluna não cabe.
 */
export function SettingsNav() {
  const pathname = usePathname();

  return (
    <>
      <nav
        aria-label="Configurações"
        className="-mx-6 flex gap-1 overflow-x-auto border-b border-zinc-200 px-6 pb-px md:hidden dark:border-zinc-800"
      >
        {ALL_ITEMS.map((item) => {
          const isActive = isRouteActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors',
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:text-zinc-300',
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <nav
        aria-label="Configurações"
        className="hidden w-56 shrink-0 space-y-6 self-start border-r border-zinc-200 pr-4 md:sticky md:top-0 md:block dark:border-zinc-800"
      >
        {SETTINGS_GROUPS.map((group) => (
          <div key={group.title}>
            <h2 className="px-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              {group.title}
            </h2>
            <ul className="mt-1.5 space-y-0.5">
              {group.items.map((item) => {
                const isActive = isRouteActive(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={isActive ? 'page' : undefined}
                      className={cn(
                        'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
                        isActive ? ACTIVE_CLASSES : IDLE_CLASSES,
                      )}
                    >
                      <item.icon className="size-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </>
  );
}
