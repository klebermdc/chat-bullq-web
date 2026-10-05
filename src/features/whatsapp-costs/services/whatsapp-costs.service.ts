import { api } from '@/lib/api';

/** Uma fatia de `totals.byCategory`: categoria × tipo × cobrável. */
export interface BillingCategoryRow {
  /** service | referral_conversion | marketing | utility | authentication | unknown */
  category: string;
  /** free_customer_service | free_entry_point | regular | null */
  type: string | null;
  billable: boolean;
  count: number;
  /** 0 quando `billable` é falso. */
  estimatedCost: number;
}

export interface BillingDay {
  /** 'YYYY-MM-DD', dia de São Paulo. */
  date: string;
  /** Contagem por categoria, ex.: `{ marketing: 4, service: 0 }`. */
  billable: Record<string, number>;
  /** Contagem por categoria, ex.: `{ service: 77, referral_conversion: 125 }`. */
  free: Record<string, number>;
  estimatedCost: number;
}

export interface BillingResponse {
  currency: string;
  /** `{ marketing, utility, authentication, service }` */
  rates: Record<string, number>;
  totals: {
    /** Mensagens com informação de cobrança no período. */
    messages: number;
    billable: number;
    free: number;
    estimatedCost: number;
    byCategory: BillingCategoryRow[];
  };
  /** Todos os dias do intervalo, inclusive os sem mensagem. */
  daily: BillingDay[];
  /** Primeiro dia em que a Meta marcou atendimento como cobrável; null se nunca. */
  firstBillableServiceDate: string | null;
  /** Custo do período se todo atendimento hoje grátis fosse cobrado pela tarifa `service`. */
  projectedServiceCost: number;
}

export interface DeliveryDay {
  date: string;
  outbound: number;
  delivered: number;
  read: number;
  failed: number;
  templates: number;
  freeForm: number;
}

export interface DeliveryResponse {
  totals: {
    outbound: number;
    /** Status DELIVERED ou READ. */
    delivered: number;
    read: number;
    failed: number;
    pending: number;
    /** delivered / outbound, 0..1 */
    deliveryRate: number;
    /** read / delivered, 0..1 */
    readRate: number;
    /** failed / outbound, 0..1 */
    failureRate: number;
  };
  daily: DeliveryDay[];
  /** Texto curto em pt-BR, no máximo 8, do maior para o menor. */
  failuresByReason: Array<{ reason: string; count: number }>;
}

export interface PricingConfig {
  currency: string;
  rates: Record<string, number>;
}

export interface PeriodParams {
  from: string;
  to: string;
}

const HTTP_FORBIDDEN = 403;

/**
 * Os endpoints de `/channel-usage` são só para dono e administrador. O
 * interceptor de `lib/api.ts` rejeita com um `Error` sem o status, então o 403
 * é aceito aqui e vira este erro, que a tela reconhece com `instanceof`.
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

async function getOwnerOnly<T>(url: string, params?: PeriodParams): Promise<T> {
  const response = await api.get(url, { params, ...acceptForbidden });
  if (response.status === HTTP_FORBIDDEN) throw new WhatsappCostsForbiddenError();
  return response.data.data as T;
}

export const whatsappCostsService = {
  getBilling(params: PeriodParams): Promise<BillingResponse> {
    return getOwnerOnly<BillingResponse>('/channel-usage/billing', params);
  },
  getDelivery(params: PeriodParams): Promise<DeliveryResponse> {
    return getOwnerOnly<DeliveryResponse>('/channel-usage/delivery', params);
  },
  getPricing(): Promise<PricingConfig> {
    return getOwnerOnly<PricingConfig>('/channel-usage/pricing');
  },
  async setPricing(body: PricingConfig): Promise<PricingConfig> {
    const { data } = await api.put('/channel-usage/pricing', body);
    return data.data;
  },
};
