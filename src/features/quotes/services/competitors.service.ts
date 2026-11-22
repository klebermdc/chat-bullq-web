import { api } from '@/lib/api';
import type { CompetitorCompareRequest, CompetitorComparison, PriceResearchResult } from '../types';

/** A API consulta várias lojas em paralelo: mais lento que o default (15s) do client. */
export const COMPETITORS_TIMEOUT_MS = 45000;
/** Abre o carrinho num navegador antes de consultar as lojas. */
export const PRICE_RESEARCH_TIMEOUT_MS = 90000;

export const competitorsService = {
  /** Preço de cada item da cotação nas lojas da concorrência. Nada é gravado nem enviado. */
  async compare(request: CompetitorCompareRequest): Promise<CompetitorComparison> {
    const { data } = await api.post('/proposals/quote/competitors', request, { timeout: COMPETITORS_TIMEOUT_MS });
    return data.data;
  },

  /** Lê o carrinho da OFP pelo link e compara cada item com a concorrência. */
  async research(storeLink: string): Promise<PriceResearchResult> {
    const { data } = await api.post('/proposals/price-research', { storeLink }, { timeout: PRICE_RESEARCH_TIMEOUT_MS });
    return data.data;
  },
};
