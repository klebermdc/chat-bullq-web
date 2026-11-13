'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { fetchAccess, SHOPPER_KEY } from './api';

const ACCESS_STALE_MS = 5 * 60_000;

/** Só quem está em settings.mysteryShopper.viewerEmails vê o cliente oculto. */
export function useMysteryShopperAccess(): { allowed: boolean; isLoading: boolean } {
  const { activeOrgId } = useAuthStore();
  const { data, isLoading } = useQuery({
    queryKey: [...SHOPPER_KEY, 'access', activeOrgId],
    queryFn: fetchAccess,
    staleTime: ACCESS_STALE_MS,
    retry: false,
    enabled: !!activeOrgId,
  });
  return { allowed: data?.allowed === true, isLoading };
}
