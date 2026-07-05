import { api } from '@/lib/api';

export type AiProvider = 'GROQ' | 'OPENAI' | 'SAKANA';
export type AiCapability = 'TRANSCRIPTION' | 'EMBEDDINGS' | 'AGENT_LLM';

export interface AiProviderKey {
  id: string;
  name: string;
  provider: AiProvider;
  keyPreview: string;
  capabilities: AiCapability[];
  baseUrl: string | null;
  model: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertAiProviderKey {
  name: string;
  provider: AiProvider;
  key?: string;
  capabilities: AiCapability[];
  baseUrl?: string;
  model?: string;
}

export const aiProvidersService = {
  async list(): Promise<AiProviderKey[]> {
    const { data } = await api.get('/ai-provider-keys');
    return data.data;
  },
  async create(payload: UpsertAiProviderKey): Promise<AiProviderKey> {
    const { data } = await api.post('/ai-provider-keys', payload);
    return data.data;
  },
  async update(id: string, payload: Partial<UpsertAiProviderKey>): Promise<AiProviderKey> {
    const { data } = await api.patch(`/ai-provider-keys/${id}`, payload);
    return data.data;
  },
  async remove(id: string): Promise<void> {
    await api.delete(`/ai-provider-keys/${id}`);
  },
};
