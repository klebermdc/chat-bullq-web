'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Settings,
  LogOut,
  ChevronsUpDown,
  Building2,
  ChevronUp,
  Zap,
  FolderKanban,
  Clock,
  BarChart3,
  FileBarChart,
  MessageCircle,
  KanbanSquare,
  Bot,
  Workflow,
  PanelLeftClose,
  PanelLeftOpen,
  User,
} from 'lucide-react';
import { InboxTree } from '@/features/inbox-views/components/inbox-tree';
import { JarvisTree } from '@/features/ai-agents/components/jarvis-tree';
import { PipelinesTree } from '@/features/pipelines/components/pipelines-tree';

import { useAuthStore } from '@/stores/auth-store';
import { usePermissions } from '@/lib/permissions';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui/avatar';
import {
  Sidebar,
  SidebarHeader,
  SidebarBody,
  SidebarFooter,
  SidebarSection,
  SidebarItem,
  SidebarLabel,
  SidebarSpacer,
} from '@/components/ui/sidebar';
import {
  Dropdown,
  DropdownButton,
  DropdownMenu,
  DropdownItem,
  DropdownLabel,
  DropdownDivider,
} from '@/components/ui/dropdown';
import { ThemeToggleItem } from '@/components/layout/theme-toggle-item';
import { useSidebarCollapse } from '@/components/ui/sidebar-layout';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, feature: 'dashboard.view' },
  { href: '/inactivity', label: 'Inatividade', icon: Clock, feature: 'inactivity.view' },
  { href: '/projects', label: 'Projetos', icon: FolderKanban, feature: 'projects.view' },
  { href: '/automations', label: 'Automações', icon: Zap, feature: 'automations.view' },
  // O construtor de fluxos existia desde sempre em /chatbot, com rota, permissão
  // (`chatbot.view`) e editor completos — só nunca foi pendurado no menu. Quem não
  // soubesse a URL de cor não tinha como chegar nele.
  { href: '/chatbot', label: 'Chatbot', icon: Workflow, feature: 'chatbot.view' },
  { href: '/relatorios-vendas', label: 'Relatórios de Vendas', icon: BarChart3, feature: 'sales-reports.view' },
  { href: '/relatorios', label: 'Relatórios', icon: FileBarChart, feature: 'crm-reports.view' },
];

// Destinos de topo mostrados no rail recolhido (só ícones). Espelha as
// seções que na versão aberta viram árvores (Inbox/Pipelines/Jarvis).
const railItems = [
  { href: '/inbox', label: 'Inbox', icon: MessageCircle, feature: 'inbox.view' },
  { href: '/pipelines', label: 'Pipelines', icon: KanbanSquare, feature: 'pipelines.view' },
  { href: '/ai-agents', label: 'Jarvis', icon: Bot, feature: 'ai-agents.view' },
  ...navItems,
];

/**
 * Rail recolhido: só ícones, largura estreita, fundo roxo bem clarinho.
 * Cada ícone leva à raiz da seção; o botão da borda (SidebarLayout)
 * reabre o menu completo. Tooltip nativo (title) revela o rótulo no hover.
 */
function AppSidebarRail() {
  const pathname = usePathname();
  const { user, organizations, activeOrgId, logout } = useAuthStore();
  const { can } = usePermissions();
  const activeOrg = organizations.find((o) => o.id === activeOrgId);
  const collapse = useSidebarCollapse();

  return (
    <nav className="flex h-full flex-col items-center">
      <div className="menu-border flex w-full flex-col items-center gap-2 border-b px-2 py-3">
        <button
          type="button"
          onClick={collapse?.toggle}
          aria-label="Abrir menu"
          title="Abrir menu"
          className="flex size-9 items-center justify-center rounded-lg text-[color:var(--menu-icon)] transition-colors hover:bg-[var(--menu-hover)]"
        >
          <PanelLeftOpen className="size-5" />
        </button>
        <div title={activeOrg?.name ?? 'Organização'}>
          <Avatar
            initials={activeOrg?.name?.slice(0, 2).toUpperCase()}
            className="size-8 bg-primary text-[11px] text-primary-foreground"
            square
          />
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center gap-1 overflow-y-auto py-4">
        {railItems.filter((item) => can(item.feature)).map((item) => {
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              aria-label={item.label}
              className={cn(
                'flex size-10 items-center justify-center rounded-lg transition-colors',
                isActive ? 'menu-row-active' : 'menu-row',
              )}
            >
              <item.icon className="size-5" />
            </Link>
          );
        })}
      </div>

      <div className="menu-border flex w-full justify-center border-t px-2 py-4">
        <Dropdown>
          <DropdownButton
            className="rounded-full transition-transform hover:scale-105"
            title={user?.name}
          >
            <Avatar
              src={user?.avatarUrl}
              initials={user?.name?.slice(0, 2).toUpperCase()}
              className="size-9"
              square
            />
          </DropdownButton>
          <DropdownMenu anchor="top start" className="min-w-56">
            {can('settings.view') && (
              <DropdownItem href="/settings">
                <Settings />
                <DropdownLabel>Configurações</DropdownLabel>
              </DropdownItem>
            )}
            <DropdownItem href="/minha-conta">
              <User />
              <DropdownLabel>Minha conta</DropdownLabel>
            </DropdownItem>
            <ThemeToggleItem />
            <DropdownDivider />
            <DropdownItem onClick={logout}>
              <LogOut />
              <DropdownLabel>Sair</DropdownLabel>
            </DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </div>
    </nav>
  );
}

export function AppSidebar() {
  const { user, organizations, activeOrgId, setActiveOrg, logout } =
    useAuthStore();
  const { can } = usePermissions();
  const activeOrg = organizations.find((o) => o.id === activeOrgId);
  const collapse = useSidebarCollapse();

  const handleOrgSwitch = (orgId: string) => {
    setActiveOrg(orgId);
    window.location.reload();
  };

  // No desktop recolhido mostramos só o rail de ícones. O drawer mobile
  // sempre renderiza o menu completo (collapse é null lá).
  if (collapse?.collapsed) {
    return <AppSidebarRail />;
  }

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-1">
          <Dropdown>
            <DropdownButton className="menu-strong flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-2.5 text-left text-sm/6 font-semibold hover:bg-[var(--menu-hover)]">
              <Avatar
                initials={activeOrg?.name?.slice(0, 2).toUpperCase()}
                className="size-6 bg-primary text-[10px] text-primary-foreground"
                square
              />
              <span className="min-w-0 flex-1 truncate">
                {activeOrg?.name ?? 'Organização'}
              </span>
              <ChevronsUpDown className="menu-muted ml-auto size-4 shrink-0" />
            </DropdownButton>
            {organizations.length > 1 && (
              <DropdownMenu anchor="bottom start" className="min-w-56">
                {organizations.map((org) => (
                  <DropdownItem
                    key={org.id}
                    onClick={() => handleOrgSwitch(org.id)}
                  >
                    <Building2 />
                    <DropdownLabel>{org.name}</DropdownLabel>
                  </DropdownItem>
                ))}
              </DropdownMenu>
            )}
          </Dropdown>
          {collapse && (
            <button
              type="button"
              onClick={collapse.toggle}
              aria-label="Recolher menu"
              title="Recolher menu"
              className="flex size-8 shrink-0 items-center justify-center rounded-lg text-violet-600 transition-colors hover:bg-violet-100 hover:text-violet-800 dark:text-violet-300 dark:hover:bg-violet-400/15"
            >
              <PanelLeftClose className="size-5" />
            </button>
          )}
        </div>
      </SidebarHeader>

      <SidebarBody>
        <SidebarSection>
          <InboxTree />
          <PipelinesTree />
          {can('ai-agents.view') && <JarvisTree />}
          {navItems
            .filter((item) => can(item.feature))
            .map((item) => (
              <SidebarItem key={item.href} href={item.href}>
                <item.icon className="size-5" />
                <SidebarLabel>{item.label}</SidebarLabel>
              </SidebarItem>
            ))}
        </SidebarSection>

        <SidebarSpacer />
      </SidebarBody>

      <SidebarFooter>
        <Dropdown>
          <DropdownButton className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left hover:bg-[var(--menu-hover)]">
            <Avatar
              src={user?.avatarUrl}
              initials={user?.name?.slice(0, 2).toUpperCase()}
              className="size-10"
              square
            />
            <span className="min-w-0 flex-1">
              <span className="menu-strong block truncate text-sm/5 font-medium">
                {user?.name}
              </span>
              <span className="menu-muted block truncate text-xs/5 font-normal">
                {user?.email}
              </span>
            </span>
            <ChevronUp className="menu-muted ml-auto size-4 shrink-0" />
          </DropdownButton>
          <DropdownMenu anchor="top start" className="min-w-56">
            {can('settings.view') && (
              <DropdownItem href="/settings">
                <Settings />
                <DropdownLabel>Configurações</DropdownLabel>
              </DropdownItem>
            )}
            <DropdownItem href="/minha-conta">
              <User />
              <DropdownLabel>Minha conta</DropdownLabel>
            </DropdownItem>
            <ThemeToggleItem />
            <DropdownDivider />
            <DropdownItem onClick={logout}>
              <LogOut />
              <DropdownLabel>Sair</DropdownLabel>
            </DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </SidebarFooter>
    </Sidebar>
  );
}
