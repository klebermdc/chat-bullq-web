import { api } from '@/lib/api';

export type AdConnectionStatus = 'ACTIVE' | 'INVALID_TOKEN' | 'REVOKED' | 'DISABLED';

export interface AdConnection {
  id: string;
  provider: string;
  externalAccountId: string;
  accountName: string | null;
  currency: string | null;
  timezoneName: string | null;
  status: AdConnectionStatus;
  tokenExpiresAt: string | null;
  lastSyncAt: string | null;
  lastSyncError: string | null;
  createdAt: string;
}

export interface MetaAdAccount {
  id: string;
  name: string | null;
  currency: string | null;
  timezoneName: string | null;
  businessId: string | null;
}

export interface ExchangeResult {
  handshakeId: string;
  accounts: MetaAdAccount[];
}

export const metaAdsService = {
  async list(): Promise<AdConnection[]> {
    const { data } = await api.get('/marketing/connections');
    return data.data ?? [];
  },
  async exchange(code: string): Promise<ExchangeResult> {
    const { data } = await api.post('/marketing/connections/meta/exchange', { code });
    return data.data;
  },
  async create(handshakeId: string, adAccountId: string): Promise<AdConnection> {
    const { data } = await api.post('/marketing/connections/meta', { handshakeId, adAccountId });
    return data.data;
  },
  async sync(id: string): Promise<{ message: string }> {
    const { data } = await api.post(`/marketing/connections/${id}/sync`, {});
    return data.data;
  },
  async remove(id: string): Promise<{ message: string }> {
    const { data } = await api.delete(`/marketing/connections/${id}`);
    return data.data;
  },
};
