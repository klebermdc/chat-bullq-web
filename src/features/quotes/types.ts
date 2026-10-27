/**
 * Cotação por link — tipos iguais aos da API (contrato v1.1).
 * NUNCA há CPF nem nome de viajante aqui: o print traz, a cotação não guarda.
 */

export interface QuoteItem {
  provider: string;
  title: string;
  /** YYYY-MM-DD */
  startDate: string | null;
  /** YYYY-MM-DD (igual a startDate quando é 1 dia) */
  endDate: string | null;
  description: string | null;
  adults: number;
  children: number;
  priceAdult: number | null;
  priceChild: number | null;
  total: number;
  cancellationPolicy: string | null;
}

export interface QuoteInstallments {
  count: number;
  value: number;
}

export interface QuoteData {
  items: QuoteItem[];
  currency: string;
  total: number;
  pixTotal: number | null;
  installments: QuoteInstallments | null;
  notes: string | null;
}

export interface QuoteCompany {
  name: string;
  tagline: string;
  cnpj: string;
  instagram: string;
  facebook: string;
  site: string;
  hours: string;
}

export type QuoteTermsBlock = { kind: 'p'; text: string } | { kind: 'list'; items: string[] };

/** Regras gerais, iguais para toda cotação: aviso de câmbio e cancelamento. */
export interface QuoteTerms {
  exchangeNotice: string;
  cancellation: { title: string; revisedAt: string; blocks: QuoteTermsBlock[] };
}

export type PublicQuoteStatus = 'ACTIVE' | 'EXPIRED';

/** GET /public/quotes/:token (já desembrulhado do envelope `data`). */
export interface PublicQuoteView {
  status: PublicQuoteStatus;
  code: string;
  customerName: string | null;
  seller: { name: string; whatsapp: string | null };
  /** Ausente numa API anterior ao adendo v1.1. */
  company: QuoteCompany | null;
  /** Ausente numa API anterior a 27/10/2026: a página só esconde os blocos. */
  terms?: QuoteTerms | null;
  createdAt: string;
  expiresAt: string;
  quote: QuoteData;
}

/** Toda cotação vale 24 horas (o câmbio muda); a API aplica o padrão. */
export const QUOTE_VALIDITY_HOURS = 24;

/** Resposta do preview com format LINK: nada foi gravado nem enviado. */
export interface QuotePreview {
  preview: true;
  quote: QuoteData;
  customerName: string | null;
  /** Posição (1, 2…) dos prints que a IA não conseguiu ler. Ausente numa API antiga. */
  unreadPrints?: number[];
}
