import { api } from '@/lib/api';
import type { OrderFicha } from './types';

export const orderFichaService = {
  async getForConversation(conversationId: string): Promise<OrderFicha | null> {
    const { data } = await api.get(`/order-ficha/conversation/${conversationId}`);
    return (data?.data ?? data) ?? null;
  },
};
