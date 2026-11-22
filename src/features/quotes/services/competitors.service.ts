import { api } from '@/lib/api';
import type { CompetitorCompareRequest, CompetitorComparison, PriceResearchResult, PriceWatchTrends } from '../types';

/** A API consulta várias lojas em paralelo: mais lento que o default (15s) do client. */
export const COMPETITORS_TIMEOUT_MS = 45000;
/** Abre o carrinho num navegador antes de consultar as lojas. */
export const PRICE_RESEARCH_TIMEOUT_MS = 120000;
/** Coletar a cesta agora: dezenas de lojas × itens, leva mais de um minuto. */
export const PRICE_WATCH_RUN_TIMEOUT_MS = 180000;

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

  /** Tendências da coleta diária da cesta. */
  async trends(days: number): Promise<PriceWatchTrends> {
    const { data } = await api.get('/proposals/price-watch/trends', { params: { days } });
    return data.data;
  },

  /** Troca a cesta da coleta diária (só ADM/Owner); null tira a cesta. */
  async setBasket(basketLink: string | null): Promise<void> {
    await api.put('/proposals/price-watch/basket', { basketLink });
  },

  /** Coleta a cesta agora (só ADM/Owner). */
  async runNow(): Promise<{ saved: number }> {
    const { data } = await api.post('/proposals/price-watch/run', {}, { timeout: PRICE_WATCH_RUN_TIMEOUT_MS });
    return data.data;
  },
};
