'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { authService } from '@/features/auth/services/auth.service';

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, setAuth } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      router.replace('/login');
      return;
    }
    if (user) {
      if (!user.isSuperAdmin) router.replace('/inbox');
      else setIsLoading(false);
      return;
    }
    authService
      .getMe()
      .then((data) => {
        setAuth(data.user, data.organizations);
        if (!data.user.isSuperAdmin) router.replace('/inbox');
        else setIsLoading(false);
      })
      .catch(() => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        router.replace('/login');
      });
  }, [router, user, setAuth]);

  if (isLoading) {
    return <div className="p-8 text-sm text-muted-foreground">Carregando…</div>;
  }
  return <div className="min-h-screen bg-background">{children}</div>;
}
