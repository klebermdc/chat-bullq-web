'use client';

import { useQuery } from '@tanstack/react-query';
import { useOrgId } from '@/hooks/use-org-query-key';
import { exchangeRatesService } from './service';

// A API lê as operadoras de 5 em 5h; reconsultar a cada 15 min basta para a
// tela mudar sozinha pouco depois de uma alteração.
const REFRESH_MS = 15 * 60_000;

export function useExchangeRates() {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ['exchange-rates', orgId],
    queryFn: exchangeRatesService.list,
    staleTime: REFRESH_MS,
    refetchInterval: REFRESH_MS,
    retry: 1,
  });
}
