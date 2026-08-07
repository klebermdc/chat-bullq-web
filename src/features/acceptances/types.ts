export interface AcceptanceItem {
  description: string;
  qty?: number;
  date?: string;
  note?: string;
  /** Localizador / nº de confirmação, quando o item veio de um voucher. */
  ref?: string;
}

/** Voucher entregue junto com o aceite. O `sha256` é calculado no backend. */
export interface VoucherRef {
  url: string;
  filename: string;
  size: number;
  sha256: string;
}

/**
 * Resultado de UM envio ao cliente (voucher ou link) no `markOrderSent`.
 *
 * É `queued`, não `sent`, porque é só isso que o backend sabe na hora de
 * responder: o `MessagesService.send` apenas enfileira, e a checagem da janela
 * de 24h/72h do WhatsApp roda depois, num worker — uma mensagem aceita aqui
 * ainda pode virar FAILED lá. Dizer "enviado" era mentira em janela fechada.
 */
export interface DeliverySendResult {
  queued: boolean;
  messageId?: string;
  error?: string;
}

export interface VoucherSendResult extends DeliverySendResult {
  filename: string;
}

export type AcceptanceStatus = 'PENDING' | 'SIGNED' | 'EXPIRED' | 'CANCELED';

/** Status do aceite vinculado a uma conversa (visão autenticada, atendente). */
export interface AcceptanceConversationStatus {
  id: string;
  status: AcceptanceStatus;
  items: AcceptanceItem[];
  signedAt: string | null;
  signerName: string | null;
  signerIp: string | null;
  signerUserAgent: string | null;
  pdfUrl: string | null;
  createdAt: string;
  expiresAt: string | null;
}

/** Visão pública do aceite (página do cliente, sem sessão). */
export interface PublicAcceptanceView {
  status: AcceptanceStatus;
  organizationName: string;
  items: AcceptanceItem[];
  termText: string;
  signedAt: string | null;
  signerName: string | null;
  pdfUrl: string | null;
  vouchers: VoucherRef[];
  orderRef: string | null;
  /**
   * Política de cancelamento da organização, COPIADA no momento em que o aceite
   * foi criado — não é um join com a org viva. Assim, mudar a política hoje não
   * reescreve o que o cliente assinou mês passado, que é justamente a prova que
   * o comprovante precisa sustentar. Aceites antigos (anteriores ao campo) e
   * orgs sem política configurada vêm `null` = não renderiza bloco nenhum.
   */
  policyText: string | null;
}
