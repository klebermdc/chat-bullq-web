import { api } from '@/lib/api';

export const conversationsService = {
  async start(payload: { channelId: string; phone?: string; contactId?: string; name?: string; message: string }): Promise<{ conversationId: string }> {
    const { data } = await api.post<{ data: { conversationId: string } }>('/conversations/start', payload);
    return data.data;
  },
};
