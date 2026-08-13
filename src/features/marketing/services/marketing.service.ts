import { api } from '@/lib/api';

export interface MarketingMedia {
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  linkClicks: number;
  landingPageViews: number;
  ctrPct: number | null;
  frequency: number | null;
  currency: string;
}

export interface MarketingCrm {
  leads: number;
  wonDeals: number;
  wonRevenue: number;
}

export interface MarketingBudgetPace {
  spentPct: number;
  timePct: number;
}

export interface MarketingDerived {
  cpl: number | null;
  conversionPct: number | null;
  roiPct: number | null;
  leadsPerDay: number | null;
  budgetPace: MarketingBudgetPace | null;
  projectedSpend: number | null;
}

export type IndicatorColor = 'green' | 'yellow' | 'red' | 'grey';
export type IndicatorFormat = 'currency' | 'percent' | 'number';

export interface MarketingIndicator {
  key: string;
  label: string;
  value: number | null;
  target: number | null;
  color: IndicatorColor;
  format: IndicatorFormat;
}

export interface MarketingOverview {
  media: MarketingMedia;
  crm: MarketingCrm;
  derived: MarketingDerived;
  indicators: MarketingIndicator[];
  hasConnection: boolean;
  lastSyncAt: string | null;
  currencyMismatch: boolean;
  /** Não-nulo quando alguma conexão da org parou de sincronizar. */
  brokenConnection: {
    status: 'INVALID_TOKEN' | 'REVOKED' | 'DISABLED';
    accountName: string | null;
    lastSyncError: string | null;
  } | null;
}

export interface MarketingDailyPoint {
  date: string;
  spend: number;
  leads: number;
}

export interface MarketingGoals {
  monthlyBudget: number | null;
  targetCpl: number | null;
  targetCtrPct: number | null;
  targetLeadsPerDay: number | null;
  targetFrequencyMax: number | null;
  targetConversionPct: number | null;
}

export interface MarketingAttributionRow {
  adId: string;
  adName: string | null;
  campaignName: string | null;
  /** `null` quando nao ha linha de gasto ingerida para o anuncio. */
  spend: number | null;
  leads: number;
  deals: number;
  revenue: number;
  cpl: number | null;
  roas: number | null;
}

export interface MarketingAttributionUnattributed {
  leads: number;
  deals: number;
  revenue: number;
  spend: null;
}

export interface MarketingAttributionCoverage {
  leadsTotal: number;
  leadsWithAdId: number;
  pct: number;
}

export interface MarketingAttribution {
  rows: MarketingAttributionRow[];
  unattributed: MarketingAttributionUnattributed;
  coverage: MarketingAttributionCoverage;
}

export interface MarketingCreativeRow extends MarketingAttributionRow {
  ctr: number | null;
  impressions: number;
}

export const marketingService = {
  async overview(from: string, to: string): Promise<MarketingOverview> {
    const { data } = await api.get('/marketing/overview', { params: { from, to } });
    return data.data;
  },
  async daily(from: string, to: string): Promise<MarketingDailyPoint[]> {
    const { data } = await api.get('/marketing/daily', { params: { from, to } });
    return data.data ?? [];
  },
  async goals(): Promise<MarketingGoals> {
    const { data } = await api.get('/marketing/goals');
    return data.data;
  },
  /** Um campo ausente mantém o valor atual; `null` explícito limpa a meta. */
  async saveGoals(payload: Partial<MarketingGoals>): Promise<MarketingGoals> {
    const { data } = await api.put('/marketing/goals', payload);
    return data.data;
  },
  async attribution(from: string, to: string): Promise<MarketingAttribution> {
    const { data } = await api.get('/marketing/attribution', { params: { from, to } });
    return data.data;
  },
  async creatives(from: string, to: string): Promise<MarketingCreativeRow[]> {
    const { data } = await api.get('/marketing/creatives', { params: { from, to } });
    return data.data ?? [];
  },
};
