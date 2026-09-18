import { api } from '@/lib/api';

export interface QuickReply {
  id: string;
  shortcut: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuickReplyInput {
  shortcut: string;
  title: string;
  content: string;
}

export const quickRepliesService = {
  async list(): Promise<QuickReply[]> {
    const { data } = await api.get('/quick-replies');
    return data.data;
  },
  async create(payload: QuickReplyInput): Promise<QuickReply> {
    const { data } = await api.post('/quick-replies', payload);
    return data.data;
  },
  async update(id: string, payload: Partial<QuickReplyInput>): Promise<QuickReply> {
    const { data } = await api.patch(`/quick-replies/${id}`, payload);
    return data.data;
  },
  async remove(id: string): Promise<void> {
    await api.delete(`/quick-replies/${id}`);
  },
};

/** Mensagem de erro da API (400/409 trazem o motivo em `message`). */
export function apiErrorMessage(err: unknown, fallback: string): string {
  const message = (err as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
  if (Array.isArray(message) && typeof message[0] === 'string') return message[0];
  if (typeof message === 'string' && message) return message;
  return err instanceof Error ? err.message : fallback;
}
