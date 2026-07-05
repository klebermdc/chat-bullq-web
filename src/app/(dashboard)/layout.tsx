'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SidebarLayout } from '@/components/ui/sidebar-layout';
import { Navbar, NavbarSection, NavbarSpacer } from '@/components/ui/navbar';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { MobileTabBar } from '@/components/layout/mobile-tab-bar';
import { useAuthStore } from '@/stores/auth-store';
import { useMobileChrome } from '@/stores/mobile-chrome-store';
import { authService } from '@/features/auth/services/auth.service';
import { usePermissionsSync } from '@/features/settings/hooks/use-permissions-sync';
import { ToolFailureBanner } from '@/features/ai-agents/components/tool-failure-banner';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, setAuth, activeOrgId, setActiveOrg } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  // Quando a tab bar se esconde (chat aberto no mobile), removemos a folga
  // inferior que a reservava — senão sobra uma faixa morta sob o chat.
  const hideTabBar = useMobileChrome((s) => s.hideTabBar);

  usePermissionsSync();

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      router.replace('/login');
      return;
    }

    if (user) {
      setIsLoading(false);
      return;
    }

    authService
      .getMe()
      .then((data) => {
        setAuth(data.user, data.organizations);
        // Ensure activeOrgId is set (setAuth handles this, but double-check)
        const currentOrgId = localStorage.getItem('active_org_id');
        if (!currentOrgId && data.organizations.length > 0) {
          setActiveOrg(data.organizations[0].id);
        }
        setIsLoading(false);
      })
      .catch(() => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        router.replace('/login');
      });
  }, [router, user, setAuth, setActiveOrg]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <SidebarLayout
      sidebar={<AppSidebar />}
      navbar={
        <Navbar>
          <NavbarSpacer />
          <NavbarSection><></></NavbarSection>
        </Navbar>
      }
    >
      <div className="flex h-full flex-col">
        <ToolFailureBanner />
        <div className={`flex-1 min-h-0 lg:pb-0 ${hideTabBar ? 'pb-0' : 'pb-14'}`}>{children}</div>
      </div>
      <MobileTabBar />
    </SidebarLayout>
  );
}
