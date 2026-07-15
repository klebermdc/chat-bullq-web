import { api } from '@/lib/api';

export interface SonaxSettings {
  enabled: boolean;
  idCliente: string;
  tokenConfigured: boolean;
  click2callBaseUrl?: string;
  webhookUrl: string | null;
}

export interface CallInsightData {
  hasCall: boolean;
  callId?: string;
  status?: string;
  durationSec?: number | null;
  recordingUrl?: string | null;
  startedAt?: string;
  insightState?: 'PENDING' | 'READY' | 'FAILED' | 'SKIPPED';
  insight?: {
    summary: string;
    nextSteps: string[];
    sentiment: 'positivo' | 'neutro' | 'negativo';
  } | null;
  hasTranscript?: boolean;
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
  async getLatestInsight(conversationId: string): Promise<CallInsightData> {
    const { data } = await api.get(
      `/conversations/${conversationId}/calls/latest-insight`,
    );
    return data.data ?? data;
  },
  async getTranscript(
    conversationId: string,
    callId: string,
  ): Promise<{ callId: string; transcript: string }> {
    const { data } = await api.get(
      `/conversations/${conversationId}/calls/${callId}/transcript`,
    );
    return data.data ?? data;
  },
};
