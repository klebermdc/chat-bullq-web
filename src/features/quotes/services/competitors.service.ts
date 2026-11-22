import { api } from '@/lib/api';
import type { CompetitorCompareRequest, CompetitorComparison } from '../types';

/** A API consulta várias lojas em paralelo: mais lento que o default (15s) do client. */
export const COMPETITORS_TIMEOUT_MS = 45000;

export const competitorsService = {
  /** Preço de cada item da cotação nas lojas da concorrência. Nada é gravado nem enviado. */
  async compare(request: CompetitorCompareRequest): Promise<CompetitorComparison> {
    const { data } = await api.post('/proposals/quote/competitors', request, { timeout: COMPETITORS_TIMEOUT_MS });
    return data.data;
  },
};
