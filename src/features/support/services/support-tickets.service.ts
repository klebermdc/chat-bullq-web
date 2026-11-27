import { api } from '@/lib/api';
import type { SupportCategory, SupportPriority } from '../lib/support-ticket-options';

export interface OpenManualTicketResult {
  cardId: string;
  /** "#S-0042" */
  ticketNumber: string;
  /** false = a conversa já tinha chamado aberto e o pedido foi anexado. */
  isNew: boolean;
}

export const supportTicketsService = {
  async openManual(input: {
    conversationId: string;
    category: SupportCategory;
    priority: SupportPriority;
    reason: string;
  }): Promise<OpenManualTicketResult> {
    const { data } = await api.post('/support-tickets', { ...input, reason: input.reason.trim() });
    return data.data;
  },
};
