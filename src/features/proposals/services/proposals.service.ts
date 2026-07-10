import { api } from '@/lib/api';
import type { Proposal, CreateProposalInput } from '../types';

export const proposalsService = {
  async create(input: CreateProposalInput): Promise<Proposal> {
    const { data } = await api.post('/proposals', input);
    return data.data;
  },
  async listForContact(contactId: string): Promise<Proposal[]> {
    const { data } = await api.get(`/proposals/contact/${contactId}`);
    return data.data;
  },
};
