export interface ProposalPark {
  nome: string;
  dias: number;
  data: string;
}

import type { QuoteData, QuoteValidityHours } from '@/features/quotes/types';

/**
 * PARKS = ingressos (carrinho); OTHER = outro produto (carro, seguro…);
 * QUOTE = cotação enviada como página com link.
 */
export type ProposalKind = 'PARKS' | 'OTHER' | 'QUOTE';

/** Conteúdo livre da proposta — é o que vale quando `kind` é OTHER. */
export interface ProposalDetails {
  title?: string;
  lines?: string[];
  /** URLs dos prints enviados ao cliente junto com a proposta (em QUOTE, só lidos). */
  images?: string[];
  /** Só em QUOTE: a cotação conferida pelo atendente. */
  quote?: QuoteData;
  customerName?: string | null;
}

export interface Proposal {
  id: string;
  contactId: string;
  conversationId: string;
  /** Vazio quando a proposta foi enviada sem link. */
  checkoutUrl: string;
  // Em OTHER: adults/children vêm 0, parks vazio e as datas não significam nada.
  adults: number;
  children: number;
  startDate: string;
  endDate: string;
  parks: ProposalPark[];
  totalValue: string; // Decimal serializa como string; 0 = valor não informado
  currency: string;
  createdAt: string;
  /** Ausente nas propostas antigas — tratar como PARKS. */
  kind?: ProposalKind;
  details?: ProposalDetails | null;
  /*
    Só em QUOTE, e só no GET /proposals/conversation/:id (o de contato não
    traz): acompanhamento do link — "cliente abriu".
  */
  quoteUrl?: string | null;
  expiresAt?: string | null;
  viewCount?: number;
  firstViewedAt?: string | null;
  lastViewedAt?: string | null;
}

export type ProposalMode = 'NEW' | 'UPDATE';

/** Print já enviado ao servidor (retorno de `inboxService.uploadMedia`). */
export interface ProposalImageInput {
  url: string;
  mimeType: string;
  filename?: string;
  size?: number;
}

export interface CreateProposalInput {
  conversationId: string;
  /** Texto colado (link e/ou resumo). Pode ir vazio quando há print e `includeLink` é false. */
  checkoutUrl: string;
  mode?: ProposalMode;
  /** false = a mensagem vai sem a linha do link do checkout. Default true. */
  includeLink?: boolean;
  /** Prints (máx. 4; png/jpeg/webp): vão para o cliente e são lidos para montar a proposta. */
  images?: ProposalImageInput[];
  /**
   * Proposta lida do print e conferida pelo atendente. Obrigatória para enviar
   * com prints: o cliente recebe o que foi conferido, não uma nova leitura.
   */
  reviewed?: ReviewedProposal;
  /** Texto conferido (e talvez corrigido) pelo atendente: é o que o cliente recebe. Só com `reviewed`. */
  text?: string;
  /** LINK = cotação como página (exige includeLink false e prints). Default TEXT. */
  format?: ProposalFormat;
  /** Só com LINK: a cotação conferida/editada pelo atendente. */
  quote?: QuoteData;
  /** Só com LINK: como chamar o cliente na página e na mensagem (até 60). */
  customerName?: string | null;
  /** Só com LINK: validade do link em horas. Default 24. */
  validityHours?: QuoteValidityHours;
}

export type ProposalFormat = 'TEXT' | 'LINK';

/** Resposta do envio com LINK: a proposta gravada + o link mandado ao cliente. */
export type QuoteProposal = Proposal & { quoteUrl: string };

/** Produto que não é ingresso (carro, hotel, transfer…), como lido do print. */
export interface ReviewedOtherProposal {
  kind: 'OTHER';
  title: string;
  lines: string[];
  totalValue: number;
  currency: string;
}

export interface ReviewedParksProposal {
  kind: 'PARKS';
  adults: number;
  children: number;
  startDate: string;
  endDate: string;
  parks: ProposalPark[];
  totalValue: number;
  currency: string;
}

export type ReviewedProposal = ReviewedOtherProposal | ReviewedParksProposal;

/** Resposta do passo de conferência: nada foi gravado nem enviado ainda. */
export interface ProposalPreview {
  preview: true;
  proposal: ReviewedProposal;
  /** Mensagem como seria enviada ao cliente com a proposta lida. */
  text: string;
}
