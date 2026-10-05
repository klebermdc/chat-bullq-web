'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useOrgId } from '@/hooks/use-org-query-key';
import type { PeriodRange } from '../lib/period';
import {
  WhatsappCostsForbiddenError,
  whatsappCostsService,
  type PricingConfig,
} from '../services/whatsapp-costs.service';

const BILLING_KEY = 'whatsapp-costs-billing';
const DELIVERY_KEY = 'whatsapp-costs-delivery';
const PRICING_KEY = 'whatsapp-costs-pricing';
const MAX_RETRIES = 1;

// Sem permissão não adianta tentar de novo: a resposta será a mesma.
const retryUnlessForbidden = (failureCount: number, error: Error) =>
  !(error instanceof WhatsappCostsForbiddenError) && failureCount < MAX_RETRIES;

export const isForbidden = (error: unknown): boolean => error instanceof WhatsappCostsForbiddenError;

export function useBilling(range: PeriodRange) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: [BILLING_KEY, orgId, range.from, range.to],
    queryFn: () => whatsappCostsService.getBilling(range),
    retry: retryUnlessForbidden,
  });
}

export function useDelivery(range: PeriodRange) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: [DELIVERY_KEY, orgId, range.from, range.to],
    queryFn: () => whatsappCostsService.getDelivery(range),
    retry: retryUnlessForbidden,
  });
}

export function usePricing() {
  const orgId = useOrgId();
  return useQuery({
    queryKey: [PRICING_KEY, orgId],
    queryFn: () => whatsappCostsService.getPricing(),
    retry: retryUnlessForbidden,
  });
}

export function useSavePricing() {
  const orgId = useOrgId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (pricing: PricingConfig) => whatsappCostsService.setPricing(pricing),
    onSuccess: () =>
      // A estimativa de custo depende das tarifas: refaz as duas consultas.
      Promise.all([
        queryClient.invalidateQueries({ queryKey: [PRICING_KEY, orgId] }),
        queryClient.invalidateQueries({ queryKey: [BILLING_KEY, orgId] }),
      ]),
  });
}
