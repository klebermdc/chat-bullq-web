import { api } from '@/lib/api';

export const conversationsService = {
  async start(payload: {
    channelId: string;
    phone?: string;
    contactId?: string;
    name?: string;
    email?: string;
    notes?: string;
    /** Texto livre — canais não-oficiais (Baileys/Wasender). */
    message?: string;
    /** Payload de template HSM { name, language:{code}, components } — canal oficial (1º contato). */
    template?: Record<string, any>;
  }): Promise<{ conversationId: string; contactId: string }> {
    const { data } = await api.post<{ data: { conversationId: string; contactId: string } }>(
      '/conversations/start',
      payload,
    );
    return data.data;
  },
};
