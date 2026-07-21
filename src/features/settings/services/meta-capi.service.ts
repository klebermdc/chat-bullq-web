import { api } from '@/lib/api';

export interface MetaCapiConfig {
  datasetId: string;
  tokenPreview: string;
  testEventCode: string | null;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertMetaCapi {
  datasetId: string;
  token?: string;
  testEventCode?: string;
  enabled?: boolean;
}

export const metaCapiService = {
  async get(): Promise<MetaCapiConfig | null> {
    const { data } = await api.get('/meta-capi/config');
    return data.data ?? null;
  },
  async update(payload: UpsertMetaCapi): Promise<MetaCapiConfig> {
    const { data } = await api.put('/meta-capi/config', payload);
    return data.data;
  },
  async remove(): Promise<void> {
    await api.delete('/meta-capi/config');
  },
  async test(): Promise<{ ok: boolean; response: unknown }> {
    const { data } = await api.post('/meta-capi/test', {});
    return data.data ?? data;
  },
};
