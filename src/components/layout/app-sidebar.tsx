'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  PieChart,
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
  MessageCircle,
  KanbanSquare,
  PanelLeftClose,
  PanelLeftOpen,
  User,
  Mail,
  Instagram,
  TrendingUp,
  Bot,
} from 'lucide-react';
import { InboxTree } from '@/features/inbox-views/components/inbox-tree';
import { PipelinesTree } from '@/features/pipelines/components/pipelines-tree';
import { EmailTree } from '@/features/email/components/email-tree';

import { useAuthStore } from '@/stores/auth-store';
import { usePermissions } from '@/lib/permissions';
import { cn, isRouteActive } from '@/lib/utils';
import { getInitials } from '@/lib/initials';
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

const ORG_HEADER_CLS =
  'menu-strong flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-2.5 text-left text-sm/6 font-semibold';

const navItems = [
  { href: '/dashboard', label: 'Painel', icon: LayoutDashboard, feature: 'dashboard.view' },
  { href: '/inactivity', label: 'Inatividade', icon: Clock, feature: 'inactivity.view' },
  { href: '/projects', label: 'Projetos', icon: FolderKanban, feature: 'projects.view' },
  { href: '/automations', label: 'Automações', icon: Zap, feature: 'automations.view' },
  { href: '/relatorios-vendas', label: 'Relatórios de Vendas', icon: BarChart3, feature: 'sales-reports.view' },
  // O painel de CRM também aparece em /marketing, mas precisa de entrada
  // própria: é onde o gestor vê leads sem resposta, deals e conversas.
  { href: '/relatorios', label: 'Relatórios de CRM', icon: PieChart, feature: 'crm-reports.view' },
  { href: '/marketing', label: 'Marketing', icon: TrendingUp, feature: 'marketing.view' },
];

// Destinos de topo mostrados no rail recolhido (só ícones): os mesmos do menu
// aberto e na mesma ordem (Inbox, Inbox Instagram, CRM, Email, navItems).
// O Jarvis não entra: no menu aberto ele só existe dentro de Configurações.
const railItems = [
  // `exact` porque /inbox/instagram é sub-rota de /inbox: sem isso os dois
  // ícones do rail acenderiam juntos dentro do Inbox Instagram.
  { href: '/inbox', label: 'Inbox', icon: MessageCircle, feature: 'inbox.view', exact: true },
  { href: '/inbox/instagram', label: 'Inbox Instagram', icon: Instagram, feature: 'inbox.instagram.view' },
  { href: '/pipelines', label: 'CRM', icon: KanbanSquare, feature: 'pipelines.view' },
  { href: '/email', label: 'Email', icon: Mail, feature: 'email.view' },
  ...navItems,
  // Atalho que só existe no rail: no menu aberto o Jarvis fica em Configurações.
  { href: '/settings/jarvis', label: 'Jarvis', icon: Bot, feature: 'ai-agents.view' },
];

/**
 * Rail recolhido: só ícones, largura estreita, fundo em ametista cheia.
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
    <nav aria-label="Menu principal" className="flex h-full flex-col items-center">
      <div className="menu-border flex w-full flex-col items-center gap-2 border-b px-2 py-3">
        <button
          type="button"
          onClick={collapse?.toggle}
          aria-label="Abrir menu"
          aria-expanded={false}
          title="Abrir menu"
          className="flex size-11 items-center justify-center rounded-xl text-[color:var(--menu-icon)] transition-colors hover:bg-[var(--menu-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          <PanelLeftOpen className="size-5" />
        </button>
        <div title={activeOrg?.name ?? 'Organização'}>
          <Avatar
            initials={getInitials(activeOrg?.name)}
            className="size-9 bg-[var(--menu-active-from)] text-xs text-[color:var(--menu-active-text)]"
            square
          />
        </div>
      </div>

      <div className="scrollbar-none flex flex-1 flex-col items-center gap-1.5 overflow-y-auto py-4">
        {railItems.filter((item) => can(item.feature)).map((item) => {
          const isActive =
            'exact' in item && item.exact
              ? pathname === item.href
              : isRouteActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex size-11 shrink-0 items-center justify-center rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70',
                isActive ? 'menu-row-active' : 'menu-row',
              )}
            >
              <item.icon className="size-[22px]" />
            </Link>
          );
        })}
      </div>

      <div className="menu-border flex w-full justify-center border-t px-2 py-4">
        <Dropdown>
          <DropdownButton
            className="rounded-full transition-transform hover:scale-105"
            title={user?.name}
            aria-label={`Menu da conta${user?.name ? ` de ${user.name}` : ''}`}
          >
            <Avatar
              src={user?.avatarUrl}
              initials={getInitials(user?.name)}
              className="size-10 ring-2 ring-white/25"
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

  const hasOrgSwitcher = organizations.length > 1;
  const orgName = activeOrg?.name ?? 'Organização';
  const orgIdentity = (
    <>
      <Avatar
        initials={getInitials(activeOrg?.name)}
        className="size-6 bg-[var(--menu-active-from)] text-[11px] text-[color:var(--menu-active-text)]"
        square
      />
      <span className="min-w-0 flex-1 truncate">{orgName}</span>
    </>
  );

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-1">
          {hasOrgSwitcher ? (
            <Dropdown>
              <DropdownButton
                aria-label={`Trocar de organização: ${orgName}`}
                className={cn(ORG_HEADER_CLS, 'hover:bg-[var(--menu-hover)]')}
              >
                {orgIdentity}
                <ChevronsUpDown aria-hidden="true" className="menu-muted ml-auto size-4 shrink-0" />
              </DropdownButton>
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
            </Dropdown>
          ) : (
            // Uma organização só: não há o que trocar, então é só o nome —
            // um botão de menu sem menu não fazia nada ao ser acionado.
            <div className={ORG_HEADER_CLS} title={orgName}>
              {orgIdentity}
            </div>
          )}
          {collapse && (
            <button
              type="button"
              onClick={collapse.toggle}
              aria-label="Recolher menu"
              aria-expanded
              title="Recolher menu"
              className="menu-btn flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors"
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
          {can('email.view') && <EmailTree />}
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
          <DropdownButton
            aria-label={`Menu da conta${user?.name ? ` de ${user.name}` : ''}`}
            className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left hover:bg-[var(--menu-hover)]"
          >
            <Avatar
              src={user?.avatarUrl}
              initials={getInitials(user?.name)}
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
