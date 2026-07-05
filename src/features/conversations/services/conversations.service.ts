import { api } from '@/lib/api';

export const conversationsService = {
  async start(payload: {
    channelId: string;
    phone?: string;
    contactId?: string;
    name?: string;
    email?: string;
    notes?: string;
    message: string;
  }): Promise<{ conversationId: string; contactId: string }> {
    const { data } = await api.post<{ data: { conversationId: string; contactId: string } }>(
      '/conversations/start',
      payload,
    );
    return data.data;
  },
};
