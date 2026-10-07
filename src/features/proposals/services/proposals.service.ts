import { api } from '@/lib/api';
import type { Proposal, CreateProposalInput } from '../types';

export const proposalsService = {
  async create(input: CreateProposalInput): Promise<Proposal> {
    // O backend renderiza o checkout (headless, ~8s) + extrai via LLM, então
    // esse request é lento de propósito. Com prints ele ainda lê cada imagem
    // (até 3 tentativas). Timeout generoso (120s) pra não cortar antes de
    // terminar — o default do client é 15s, curto demais aqui.
    const { data } = await api.post('/proposals', input, { timeout: 120000 });
    return data.data;
  },
  async listForContact(contactId: string): Promise<Proposal[]> {
    const { data } = await api.get(`/proposals/contact/${contactId}`);
    return data.data;
  },
  async listForConversation(conversationId: string): Promise<Proposal[]> {
    const { data } = await api.get(`/proposals/conversation/${conversationId}`);
    return data.data;
  },
};
