'use client';

import { useQuery } from '@tanstack/react-query';
import { useOrgId } from '@/hooks/use-org-query-key';
import { quickRepliesService } from '../services/quick-replies.service';

const QUICK_REPLIES_STALE_MS = 60_000;

export function quickRepliesQueryKey(orgId: string | null | undefined) {
  return ['quick-replies', orgId] as const;
}

/** Mensagens rápidas da organização (compartilhadas por toda a equipe). */
export function useQuickReplies(enabled = true) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: quickRepliesQueryKey(orgId),
    queryFn: () => quickRepliesService.list(),
    enabled: enabled && !!orgId,
    staleTime: QUICK_REPLIES_STALE_MS,
  });
}
