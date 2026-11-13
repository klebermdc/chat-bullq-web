import { api } from '@/lib/api';

/**
 * Contrato de `/whatsapp-costs`. Os totais por dia são os números da Meta;
 * o detalhamento por vendedor e template é estimativa (quantidade × preço).
 */

/** Categoria × tipo de cobrança, como a Meta informa. */
export interface CategoryRow {
  /** SERVICE | MARKETING | UTILITY | AUTHENTICATION | outra */
  category: string;
  /** REGULAR (cobrada) | FREE_ENTRY_POINT | FREE_CUSTOMER_SERVICE | outro */
  type: string;
  volume: number;
  cost: number;
}

export interface CostDay {
  /** 'YYYY-MM-DD' no fuso da organização. */
  date: string;
  cost: number;
  billable: number;
  free: number;
  /** Só mensagens cobradas, por categoria. */
  byCategory: Record<string, { volume: number; cost: number }>;
}

export interface ChannelCosts {
  channelId: string;
  channelName: string;
  /** Cada conta do WhatsApp tem a sua moeda. */
  currency: string;
  status: 'ok' | 'error';
  /** Mensagem da falha da Meta para este canal; os outros seguem valendo. */
  error: string | null;
  totals: { cost: number; billable: number; free: number; byCategory: CategoryRow[] };
  /** Todos os dias do intervalo, inclusive os zerados. */
  daily: CostDay[];
}

export interface CostsResponse {
  from: string;
  to: string;
  tz: string;
  channels: ChannelCosts[];
  totalsByCurrency: Array<{ currency: string; cost: number }>;
}

export type SenderKind = 'agent' | 'ai' | 'system';

export interface SenderRow {
  name: string;
  kind: SenderKind;
  service: number;
  marketing: number;
  utility: number;
  cost: number;
  conversations: number;
}

export interface TemplateRow {
  name: string;
  category: string | null;
  sent: number;
  cost: number;
}

export interface PerConversation {
  median: number;
  p90: number;
  max: number;
  conversations: number;
}

export interface BreakdownResponse {
  channelId: string;
  currency: string;
  /** Preço por mensagem cobrada, ex.: `{ SERVICE: 0.035, MARKETING: 0.3217 }`. */
  unitPrices: Record<string, number>;
  senders: SenderRow[];
  templates: TemplateRow[];
  /** Mensagens cobradas por conversa; null quando não há conversa no período. */
  perConversation: PerConversation | null;
}

export interface PeriodParams {
  /** 'YYYY-MM-DD', inclusive. */
  from: string;
  /** 'YYYY-MM-DD', inclusive. */
  to: string;
}

const HTTP_FORBIDDEN = 403;

/**
 * A tela é só para dono e administrador. O interceptor de `lib/api.ts`
 * rejeita com um `Error` sem o status, então o 403 é aceito aqui e vira este
 * erro, que a tela reconhece com `instanceof`.
 */
export class WhatsappCostsForbiddenError extends Error {
  constructor() {
    super('Você não tem permissão para ver os custos do WhatsApp.');
    this.name = 'WhatsappCostsForbiddenError';
  }
}

const acceptForbidden = {
  validateStatus: (status: number) => (status >= 200 && status < 300) || status === HTTP_FORBIDDEN,
};

async function getOwnerOnly<T>(url: string, params: Record<string, string>): Promise<T> {
  const response = await api.get(url, { params, ...acceptForbidden });
  if (response.status === HTTP_FORBIDDEN) throw new WhatsappCostsForbiddenError();
  return response.data.data as T;
}

export const whatsappCostsService = {
  getCosts(period: PeriodParams): Promise<CostsResponse> {
    return getOwnerOnly<CostsResponse>('/whatsapp-costs', { from: period.from, to: period.to });
  },
  getBreakdown(channelId: string, period: PeriodParams): Promise<BreakdownResponse> {
    return getOwnerOnly<BreakdownResponse>('/whatsapp-costs/breakdown', {
      channelId,
      from: period.from,
      to: period.to,
    });
  },
};
