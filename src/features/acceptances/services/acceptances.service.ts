import { api } from '@/lib/api';
import type { AcceptanceConversationStatus, AcceptanceItem } from '../types';

/** O que os dois extratores (PDF e texto colado) devolvem. Mesmo shape. */
export interface VoucherExtraction {
  items: AcceptanceItem[];
  orderRef: string | null;
  /** Presente quando a leitura não rendeu; o envio segue normalmente. */
  warning?: string;
}

/**
 * O tipo é uma promessa nossa, não uma garantia da API: as duas pontas sobem
 * juntas, mas um deploy pela metade responderia sem `items` e o `.length` no
 * modal quebraria o anexo do voucher. Default na fronteira, uma vez só.
 */
function normalizeExtraction(raw: Partial<VoucherExtraction> | null): VoucherExtraction {
  return {
    items: raw?.items ?? [],
    orderRef: raw?.orderRef ?? null,
    warning: raw?.warning,
  };
}

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

  /**
   * Lê um voucher já subido e devolve os itens.
   *
   * SEM CHAMADOR HOJE, de propósito. O modal do Aceite parou de ler o PDF —
   * a leitura enchia a lista de ruído (até em inglês) num documento que o
   * cliente assina, e os itens passaram a sair só do texto colado. O endpoint
   * continua de pé no backend; este cliente fica junto para religar a leitura
   * ser uma linha, e não uma reescrita.
   */
  async extractVoucher(mediaUrl: string): Promise<VoucherExtraction> {
    const { data } = await api.post('/acceptances/extract-voucher', {
      mediaUrl,
    });
    return normalizeExtraction(data.data ?? data);
  },

  /**
   * Mesmo extrator, mas a partir do texto que o atendente COLOU — hoje o único
   * caminho automático de itens no modal do Aceite.
   */
  async extractVoucherText(text: string): Promise<VoucherExtraction> {
    const { data } = await api.post('/acceptances/extract-voucher-text', {
      text,
    });
    return normalizeExtraction(data.data ?? data);
  },
};
