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

export type PublicQuoteStatus = 'ACTIVE' | 'EXPIRED';

/** GET /public/quotes/:token (já desembrulhado do envelope `data`). */
export interface PublicQuoteView {
  status: PublicQuoteStatus;
  code: string;
  customerName: string | null;
  seller: { name: string; whatsapp: string | null };
  /** Ausente numa API anterior ao adendo v1.1. */
  company: QuoteCompany | null;
  createdAt: string;
  expiresAt: string;
  quote: QuoteData;
}

/** Validades oferecidas ao atendente: 24h (padrão), 48h, 7 dias. */
export const QUOTE_VALIDITY_OPTIONS = [24, 48, 168] as const;
export type QuoteValidityHours = (typeof QUOTE_VALIDITY_OPTIONS)[number];

/** Resposta do preview com format LINK: nada foi gravado nem enviado. */
export interface QuotePreview {
  preview: true;
  quote: QuoteData;
  customerName: string | null;
}
