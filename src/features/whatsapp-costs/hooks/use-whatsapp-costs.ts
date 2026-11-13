'use client';

import { useQuery } from '@tanstack/react-query';
import { useOrgId } from '@/hooks/use-org-query-key';
import type { PeriodRange } from '../lib/period';
import { WhatsappCostsForbiddenError, whatsappCostsService } from '../services/whatsapp-costs.service';

const COSTS_KEY = 'whatsapp-costs';
const BREAKDOWN_KEY = 'whatsapp-costs-breakdown';
const MAX_RETRIES = 1;
// A Meta fecha os números com atraso; não adianta reconsultar a cada foco.
const STALE_MS = 5 * 60_000;

// Sem permissão não adianta tentar de novo: a resposta será a mesma.
const retryUnlessForbidden = (failureCount: number, error: Error) =>
  !(error instanceof WhatsappCostsForbiddenError) && failureCount < MAX_RETRIES;

export const isForbidden = (error: unknown): boolean => error instanceof WhatsappCostsForbiddenError;

export function useWhatsappCosts(range: PeriodRange) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: [COSTS_KEY, orgId, range.from, range.to],
    queryFn: () => whatsappCostsService.getCosts(range),
    retry: retryUnlessForbidden,
    staleTime: STALE_MS,
  });
}

/** Detalhamento de um canal; só consulta quando há canal escolhido e saudável. */
export function useWhatsappCostsBreakdown(channelId: string | null, range: PeriodRange, enabled: boolean) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: [BREAKDOWN_KEY, orgId, channelId, range.from, range.to],
    queryFn: () => whatsappCostsService.getBreakdown(channelId as string, range),
    enabled: enabled && channelId !== null,
    retry: retryUnlessForbidden,
    staleTime: STALE_MS,
  });
}
