'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { fetchSnapshot, VIRTUAL_HQ_KEY } from './api';

/** O escritório se atualiza sozinho a cada minuto (sem socket na v1). */
const REFRESH_MS = 60_000;
const ACCESS_STALE_MS = 5 * 60_000;

export function useVirtualHqSnapshot() {
  const { activeOrgId } = useAuthStore();
  return useQuery({
    queryKey: [...VIRTUAL_HQ_KEY, 'snapshot', activeOrgId],
    queryFn: fetchSnapshot,
    refetchInterval: REFRESH_MS,
    enabled: !!activeOrgId,
  });
}

/** Item do menu só aparece para orgs com o escritório ligado. */
export function useVirtualHqAccess(): boolean {
  const { activeOrgId } = useAuthStore();
  const { data } = useQuery({
    queryKey: [...VIRTUAL_HQ_KEY, 'snapshot', activeOrgId],
    queryFn: fetchSnapshot,
    staleTime: ACCESS_STALE_MS,
    retry: false,
    enabled: !!activeOrgId,
  });
  return !!data;
}
