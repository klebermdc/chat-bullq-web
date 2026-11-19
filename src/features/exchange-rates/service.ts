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
  /** Sem busca automática: o atendente consulta no site (AZ). */
  manual: boolean;
}

export interface ExchangeRatesResponse {
  enabled: boolean;
  rates: OperatorRate[];
}

export const exchangeRatesService = {
  async list(): Promise<ExchangeRatesResponse> {
    const { data } = await api.get<ExchangeRatesResponse>('/exchange-rates');
    return data;
  },
};
