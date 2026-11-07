import { api } from '@/lib/api';

export interface WebsiteLeadSettings {
  enabled: boolean;
  channelId: string | null;
  templateId: string | null;
  delayMinutes: number;
  hasToken: boolean;
  tokenPreview: string | null;
  tokenCreatedAt: string | null;
  channels: { id: string; name: string }[];
  templates: {
    id: string;
    channelId: string;
    name: string;
    displayName: string | null;
    status: string;
    category: string;
  }[];
  /** Envios dos últimos 30 dias por situação do retorno. */
  stats: Record<string, number>;
}

export interface UpdateWebsiteLeadSettings {
  enabled?: boolean;
  channelId?: string | null;
  templateId?: string | null;
  delayMinutes?: number;
}

export interface RotatedToken {
  token: string;
  tokenPreview: string;
  webhookPath: string;
  webhookPathGuiamento: string;
}

export interface ContactOrigin {
  site: (Record<string, string | null | undefined> & {
    campaignName: string | null;
    adsetName: string | null;
    adName: string | null;
  }) | null;
  ctwa: {
    sourceId: string | null;
    sourceType: string | null;
    at: string | null;
    adName: string | null;
    campaignName: string | null;
  } | null;
  submissions: {
    id: string;
    createdAt: string;
    formKind: string;
    followupStatus: string;
    followupReason: string | null;
    source: string | null;
    medium: string | null;
    campaign: string | null;
  }[];
}

export const websiteLeadsService = {
  async getSettings(): Promise<WebsiteLeadSettings> {
    const { data } = await api.get('/website-leads/settings');
    return data.data;
  },
  async updateSettings(payload: UpdateWebsiteLeadSettings): Promise<WebsiteLeadSettings> {
    const { data } = await api.put('/website-leads/settings', payload);
    return data.data;
  },
  async rotateToken(): Promise<RotatedToken> {
    const { data } = await api.post('/website-leads/settings/token', {});
    return data.data;
  },
  async contactOrigin(contactId: string): Promise<ContactOrigin> {
    const { data } = await api.get(`/website-leads/contacts/${contactId}/origin`);
    return data.data;
  },
};
