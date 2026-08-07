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
}
