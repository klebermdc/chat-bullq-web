import { api } from '@/lib/api';

export interface SonaxSettings {
  enabled: boolean;
  idCliente: string;
  tokenConfigured: boolean;
  click2callBaseUrl?: string;
  webhookUrl: string | null;
}

export const callsService = {
  async initiate(conversationId: string): Promise<{ callId: string; status: string }> {
    const { data } = await api.post(`/conversations/${conversationId}/call`);
    return data.data ?? data;
  },
  async getSonaxSettings(): Promise<SonaxSettings> {
    const { data } = await api.get('/organizations/settings/sonax');
    return data.data ?? data;
  },
  async saveSonaxSettings(body: {
    enabled: boolean;
    idCliente: string;
    token?: string;
    click2callBaseUrl?: string;
  }): Promise<SonaxSettings> {
    const { data } = await api.put('/organizations/settings/sonax', body);
    return data.data ?? data;
  },
};
