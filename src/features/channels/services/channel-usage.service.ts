import { api } from '@/lib/api';

export interface UsageSummary {
  channelId: string;
  channelName: string;
  total: number;
  byCategory: Record<string, number>;
  estimatedCost: number;
  currency: string;
}

export interface UsageBucket {
  bucket: string;
  total: number;
  byCategory: Record<string, number>;
  estimatedCost: number;
  currency: string;
}

export interface PricingConfig {
  currency: string;
  rates: Record<string, number>;
}

export const channelUsageService = {
  async summary(params?: { from?: string; to?: string }): Promise<UsageSummary[]> {
    const { data } = await api.get('/channel-usage/summary', { params });
    return data.data;
  },
  async timeseries(params: {
    channelId: string;
    from?: string;
    to?: string;
    bucket?: 'day' | 'month';
  }): Promise<UsageBucket[]> {
    const { data } = await api.get('/channel-usage/timeseries', { params });
    return data.data;
  },
  async getPricing(): Promise<PricingConfig> {
    const { data } = await api.get('/channel-usage/pricing');
    return data.data;
  },
  async setPricing(body: PricingConfig): Promise<PricingConfig> {
    const { data } = await api.put('/channel-usage/pricing', body);
    return data.data;
  },
};
