import { api } from '@/lib/api';

/** Contrato de `GET /exchange-rates` (R$ por US$ 1 em cada operadora). */
export interface OperatorRate {
  code: string;
  name: string;
  url: string;
  value: number | null;
  sourceUpdatedLabel: string | null;
  fetchedAt: string | null;
  changedAt: string | null;
  stale: boolean;
  /** Sem busca automática: o ADM lança à mão (AZ). */
  manual: boolean;
  /** Quem lançou o valor manual. */
  updatedByName: string | null;
}

export interface ExchangeRatesResponse {
  enabled: boolean;
  rates: OperatorRate[];
}

export const exchangeRatesService = {
  async list(): Promise<ExchangeRatesResponse> {
    // A API embrulha toda resposta em { data }.
    const response = await api.get<{ data: ExchangeRatesResponse }>('/exchange-rates');
    return response.data.data;
  },

  /** Lança o câmbio de uma operadora manual (só ADM/Owner). */
  async setManual(code: string, value: number): Promise<void> {
    await api.put(`/exchange-rates/${encodeURIComponent(code)}`, { value });
  },
};
