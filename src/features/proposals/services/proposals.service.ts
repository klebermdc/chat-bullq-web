import { api } from '@/lib/api';
import type { Proposal, CreateProposalInput, ProposalPreview, QuoteProposal } from '../types';
import type { QuotePreview } from '@/features/quotes/types';
import type { QuoteSubmission } from '@/features/quotes/lib/quote-draft';

/** Leitura de prints por IA: lenta de propósito (ver `create`). */
const SLOW_TIMEOUT_MS = 120000;
/**
 * Cotação: a API lê cada print numa chamada própria (em paralelo) e tenta
 * até 2x, cada uma com até 120s no provedor. Esperar menos que isso mostrava
 * "o servidor demorou" com a leitura ainda em andamento.
 */
const QUOTE_READ_TIMEOUT_MS = 250000;

type QuoteBaseInput = Pick<CreateProposalInput, 'conversationId' | 'checkoutUrl' | 'mode' | 'images'>;

export const proposalsService = {
  async create(input: CreateProposalInput): Promise<Proposal> {
    // O backend renderiza o checkout (headless, ~8s) + extrai via LLM, então
    // esse request é lento de propósito. Com prints ele ainda lê cada imagem
    // (até 3 tentativas). Timeout generoso (120s) pra não cortar antes de
    // terminar — o default do client é 15s, curto demais aqui.
    const { data } = await api.post('/proposals', input, { timeout: 120000 });
    return data.data;
  },
  /**
   * Conferência da proposta com print: o backend só lê e devolve o que seria
   * enviado. Nada é gravado nem vai ao cliente.
   */
  async preview(input: CreateProposalInput): Promise<ProposalPreview> {
    const { data } = await api.post(
      '/proposals',
      { ...input, preview: true },
      { timeout: 120000 },
    );
    return data.data;
  },
  /** Cotação por link, passo 1: a IA lê os prints em itens. Nada é gravado nem enviado. */
  async previewQuote(input: QuoteBaseInput): Promise<QuotePreview> {
    const { data } = await api.post(
      '/proposals',
      { ...input, includeLink: false, format: 'LINK', preview: true },
      { timeout: QUOTE_READ_TIMEOUT_MS },
    );
    return data.data;
  },
  /** Cotação por link, passo 2: grava a cotação conferida e manda o link ao cliente. */
  async createQuote(input: QuoteBaseInput & QuoteSubmission): Promise<QuoteProposal> {
    const { data } = await api.post(
      '/proposals',
      { ...input, includeLink: false, format: 'LINK' },
      { timeout: SLOW_TIMEOUT_MS },
    );
    return data.data;
  },
  /**
   * Cotação por link já enviada: grava a versão conferida no lugar da anterior.
   * O link é o mesmo e a validade recomeça; com `notify`, o cliente recebe o aviso.
   */
  async updateQuote(proposalId: string, input: QuoteSubmission & { notify: boolean; version?: number }): Promise<QuoteProposal> {
    const { data } = await api.patch(`/proposals/${proposalId}/quote`, input, { timeout: SLOW_TIMEOUT_MS });
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
