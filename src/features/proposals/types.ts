export interface ProposalPark {
  nome: string;
  dias: number;
  data: string;
}

/** PARKS = ingressos (carrinho); OTHER = outro produto (carro, seguro…). */
export type ProposalKind = 'PARKS' | 'OTHER';

/** Conteúdo livre da proposta — é o que vale quando `kind` é OTHER. */
export interface ProposalDetails {
  title?: string;
  lines?: string[];
  /** URLs dos prints enviados ao cliente junto com a proposta. */
  images?: string[];
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
}

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
