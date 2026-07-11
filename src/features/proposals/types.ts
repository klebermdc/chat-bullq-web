export interface ProposalPark {
  nome: string;
  dias: number;
  data: string;
}

export interface Proposal {
  id: string;
  contactId: string;
  conversationId: string;
  checkoutUrl: string;
  adults: number;
  children: number;
  startDate: string;
  endDate: string;
  parks: ProposalPark[];
  totalValue: string; // Decimal serializa como string
  currency: string;
  createdAt: string;
}

export type ProposalMode = 'NEW' | 'UPDATE';

export interface CreateProposalInput {
  conversationId: string;
  checkoutUrl: string;
  mode?: ProposalMode;
}
