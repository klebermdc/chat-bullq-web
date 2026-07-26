import { api } from '@/lib/api';
import type { AcceptanceConversationStatus } from '../types';

export const acceptancesService = {
  /**
   * Aceite vinculado à conversa. Backend responde o registro ou null quando não
   * existe. Trata o envelope {data,meta} (padrão do repo) sem confundir um payload
   * nulo com o próprio envelope.
   */
  async getForConversation(
    conversationId: string,
  ): Promise<AcceptanceConversationStatus | null> {
    const { data } = await api.get(
      `/acceptances/conversation/${conversationId}`,
    );
    const payload =
      data && typeof data === 'object' && 'data' in data
        ? (data as { data: AcceptanceConversationStatus | null }).data
        : (data as AcceptanceConversationStatus | null);
    return payload ?? null;
  },

  /** Reenvia o link do aceite ao cliente. Retorna o novo link. */
  async resend(id: string): Promise<{ link: string }> {
    const { data } = await api.post(`/acceptances/${id}/resend`, {});
    return data.data ?? data;
  },
};
