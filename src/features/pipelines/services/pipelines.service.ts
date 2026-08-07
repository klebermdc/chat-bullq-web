import { api } from '@/lib/api';
import type { AcceptanceItem, VoucherRef } from '@/features/acceptances/types';

export type StageType = 'NORMAL' | 'WON' | 'LOST';
export type CardStatus = 'OPEN' | 'WON' | 'LOST';

export interface PipelineStage {
  id: string;
  pipelineId: string;
  name: string;
  color: string | null;
  type: StageType;
  order: number;
  createdAt: string;
}

export interface Pipeline {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  isDefault: boolean;
  archived: boolean;
  order: number;
  stages?: PipelineStage[];
  _count?: { cards: number };
  createdAt: string;
  updatedAt: string;
}

export interface CardSummary {
  id: string;
  organizationId: string;
  pipelineId: string;
  stageId: string;
  title: string;
  description: string | null;
  value: string | number | null;
  currency: string;
  status: CardStatus;
  order: number;
  contactId: string | null;
  conversationId: string | null;
  assignedToId: string | null;
  metadata: Record<string, unknown>;
  closedAt: string | null;
  closedReason: string | null;
  createdAt: string;
  updatedAt: string;
  /** Data da viagem (startDate da proposta mais recente do contato). Null se não houver proposta. */
  travelStartDate?: string | null;
  contact?: {
    id: string;
    name: string | null;
    phone: string | null;
    avatarUrl: string | null;
  } | null;
  assignedTo?: {
    id: string;
    name: string;
    avatarUrl: string | null;
  } | null;
  conversation?: {
    id: string;
    channelId: string;
    /** Termômetro do lead (SDR): 1=frio, 2=morno, 3=quente. */
    temperature?: number | null;
    /** Atendente que atende a conversa (o responsável real do lead). */
    assignedTo?: {
      id: string;
      name: string;
      avatarUrl: string | null;
    } | null;
    channel: {
      id: string;
      type: string;
      name: string;
    };
    /** Tags da conversa — usadas p/ derivar a origem do lead. */
    tags?: {
      tag: { id: string; name: string; color: string | null };
    }[];
  } | null;
}

export interface BoardResponse {
  pipeline: Pipeline;
  stages: PipelineStage[];
  cards: Record<string, CardSummary[]>; // by stageId
}

export interface CreatePipelineInput {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  isDefault?: boolean;
  stages?: Array<{
    name: string;
    color?: string;
    type?: StageType;
    order?: number;
  }>;
}

export interface CreateCardInput {
  /** Optional when conversationId is set — backend derives title from contact. */
  title?: string;
  description?: string;
  stageId?: string;
  value?: number;
  currency?: string;
  contactId?: string;
  conversationId?: string;
  assignedToId?: string;
}

export interface ConversationCard {
  id: string;
  pipelineId: string;
  stageId: string;
  status: CardStatus;
  pipeline: {
    id: string;
    name: string;
    color: string | null;
    icon: string | null;
    archived: boolean;
  };
  stage: {
    id: string;
    name: string;
    color: string | null;
    type: StageType;
    order: number;
  };
}

/** Parque/ingresso de uma proposta (extraído do carrinho). */
export interface ProposalPark {
  nome: string;
  dias: number;
  data: string; // ISO date (YYYY-MM-DD)
}

/** Proposta enviada ao cliente (render do checkout → estruturada). */
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
  totalValue: string | number;
  currency: string;
  createdAt: string;
}

export type Sentiment = 'satisfeito' | 'neutro' | 'irritado';

/** Resumo IA da conversa (mesmo payload do Painel Inteligente). */
export interface AiSummary {
  summary: string;
  sentiment: Sentiment;
  objection: string | null;
  replies: string[];
}

export const pipelinesService = {
  async list(): Promise<Pipeline[]> {
    const { data } = await api.get('/pipelines');
    return data.data ?? data;
  },
  /**
   * Cards (across pipelines) que apontam pra essa conversa. Usado pelo
   * popover de pipelines no header da conversa.
   */
  async listByConversation(conversationId: string): Promise<ConversationCard[]> {
    const { data } = await api.get(
      `/pipelines/cards/by-conversation/${conversationId}`,
    );
    return data.data ?? data;
  },
  async create(input: CreatePipelineInput): Promise<Pipeline> {
    const { data } = await api.post('/pipelines', input);
    return data.data ?? data;
  },
  async update(id: string, input: Partial<Pipeline>): Promise<Pipeline> {
    const { data } = await api.patch(`/pipelines/${id}`, input);
    return data.data ?? data;
  },
  async remove(id: string): Promise<void> {
    await api.delete(`/pipelines/${id}`);
  },
  async getBoard(id: string): Promise<BoardResponse> {
    const { data } = await api.get(`/pipelines/${id}/board`);
    return data.data ?? data;
  },
  async upsertStages(
    id: string,
    stages: Array<{
      id?: string;
      name: string;
      color?: string;
      type?: StageType;
      order?: number;
    }>,
  ): Promise<PipelineStage[]> {
    const { data } = await api.put(`/pipelines/${id}/stages`, { stages });
    return data.data ?? data;
  },
  async createCard(
    pipelineId: string,
    input: CreateCardInput,
  ): Promise<CardSummary> {
    const { data } = await api.post(`/pipelines/${pipelineId}/cards`, input);
    return data.data ?? data;
  },
  async updateCard(
    cardId: string,
    input: Partial<CardSummary>,
  ): Promise<CardSummary> {
    const { data } = await api.patch(`/pipelines/cards/${cardId}`, input);
    return data.data ?? data;
  },
  async removeCard(cardId: string): Promise<void> {
    await api.delete(`/pipelines/cards/${cardId}`);
  },
  /**
   * Última proposta enviada pro card. Prefere buscar pela conversa; sem conversa
   * vinculada, cai pro contato. Retorna a mais recente (endpoints já vêm desc).
   */
  async getLatestProposal(card: {
    conversationId: string | null;
    contactId: string | null;
  }): Promise<Proposal | null> {
    const path = card.conversationId
      ? `/proposals/conversation/${card.conversationId}`
      : card.contactId
        ? `/proposals/contact/${card.contactId}`
        : null;
    if (!path) return null;
    const { data } = await api.get(path);
    const list: Proposal[] = data.data ?? data;
    return Array.isArray(list) && list.length > 0 ? list[0] : null;
  },
  /** Resumo/recomendação IA da conversa (gera+cacheia no backend). */
  async getAiSummary(
    conversationId: string,
    refresh = false,
  ): Promise<AiSummary> {
    const { data } = await api.get(
      `/conversations/${conversationId}/ai-summary${refresh ? '?refresh=1' : ''}`,
    );
    return data.data ?? data;
  },
  async moveCard(
    cardId: string,
    toStageId: string,
    toIndex: number,
  ): Promise<CardSummary> {
    const { data } = await api.post(`/pipelines/cards/${cardId}/move`, {
      toStageId,
      toIndex,
    });
    return data.data ?? data;
  },
  /**
   * E6 — Entrega: move o card da conversa pra etapa final "Pedido enviado".
   * Com `withAcceptance`, o backend também gera um aceite de entrega e devolve o
   * link (`acceptanceLink`) pra enviar ao cliente.
   */
  async markOrderSent(
    conversationId: string,
    payload?: {
      withAcceptance?: boolean;
      items?: AcceptanceItem[];
      termText?: string;
      // O `sha256` é o único campo que NÃO mandamos: quem calcula é o backend,
      // lendo o arquivo do storage (hash vindo do navegador não prova nada).
      vouchers?: Omit<VoucherRef, 'sha256'>[];
      orderRef?: string;
    },
  ): Promise<
    CardSummary & {
      acceptanceLink?: string;
      voucherResults?: { filename: string; sent: boolean; error?: string }[];
    }
  > {
    const { data } = await api.post(
      `/pipelines/conversations/${conversationId}/order-sent`,
      payload ?? {},
    );
    return data.data ?? data;
  },
  /** E5.1 — Fechamento: marca Ganho (guarda o nº do pedido) e move o card pra WON. */
  async markWon(
    conversationId: string,
    orderNumber?: string,
  ): Promise<CardSummary> {
    const { data } = await api.post(
      `/pipelines/conversations/${conversationId}/won`,
      { orderNumber },
    );
    return data.data ?? data;
  },
  /** Correção manual da origem do lead (Card do Cliente). */
  async setOrigin(
    conversationId: string,
    origin: 'INSTAGRAM_ORGANIC' | 'WHATSAPP_DIRECT',
  ): Promise<{ tags: { id: string; name: string }[] }> {
    const { data } = await api.put(`/conversations/${conversationId}/origin`, {
      origin,
    });
    return data.data ?? data;
  },
};
