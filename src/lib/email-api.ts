import { api } from './api';

export type SubscriberStatus = 'SUBSCRIBED' | 'UNSUBSCRIBED' | 'BOUNCED' | 'COMPLAINED';
export type CampaignStatus =
  | 'DRAFT' | 'SCHEDULED' | 'SENDING' | 'PAUSED' | 'SENT' | 'FAILED' | 'CANCELED';

export interface SubscriberTag {
  id: string;
  name: string;
  color: string | null;
}

export interface Subscriber {
  id: string;
  email: string;
  name: string | null;
  status: SubscriberStatus;
  source: string;
  consentSource: string | null;
  createdAt: string;
  firstPurchaseAt: string | null;
  lastPurchaseAt: string | null;
  /** Decimal serializado pela API — some para formatar como moeda no cliente. */
  totalSpent: string;
  orderCount: number;
  /** Tipo do item comprado (ingresso, hotel, carro…) — nunca o parque. Ver AudienceFilter. */
  categories: string[];
  suppliers: string[];
  /** Data em que os campos acima foram calculados na importação. `null` = nunca enriquecido. */
  enrichedAt: string | null;
  tags: SubscriberTag[];
}

/**
 * Filtro de público de uma campanha. Espelha `AudienceFilter` da API
 * (src/modules/email-audience/audience-filter.ts) — mesma forma dos dois lados
 * para a contagem nunca divergir do que o disparo de fato expande.
 */
export interface AudienceFilter {
  tagIds?: string[];
  categories?: string[];
  suppliers?: string[];
  purchasedSince?: string; // ISO
  purchasedUntil?: string; // ISO
  minSpent?: number;
  minOrders?: number;
}

export interface AudienceCountResult {
  count: number;
  filter: AudienceFilter;
}

export type SocialNetwork = 'instagram' | 'whatsapp' | 'facebook' | 'site';
export type SpacerSize = 'sm' | 'md' | 'lg';
export type BlockAlign = 'left' | 'center' | 'right';
export type FontFamily = 'sans' | 'serif';

export interface BlockStyle {
  color?: string;
  backgroundColor?: string;
  fontSize?: number;
  bold?: boolean;
  align?: BlockAlign;
  paddingY?: number;
  buttonColor?: string;
  buttonTextColor?: string;
  borderRadius?: number;
}

export interface EmailTheme {
  primaryColor: string;
  textColor: string;
  backgroundColor: string;
  containerColor: string;
  fontFamily: FontFamily;
}

export type EmailBlock =
  | { type: 'heading'; text: string; style?: BlockStyle }
  | { type: 'text'; text: string; style?: BlockStyle }
  | { type: 'image'; src: string; alt?: string; style?: BlockStyle }
  | { type: 'button'; label: string; href: string; style?: BlockStyle }
  | { type: 'divider'; style?: BlockStyle }
  | { type: 'logo'; src: string; href?: string; alt?: string; style?: BlockStyle }
  | { type: 'spacer'; size: SpacerSize; style?: BlockStyle }
  | { type: 'offer'; src?: string; title: string; price?: string; label: string; href: string; style?: BlockStyle }
  | { type: 'social'; links: Array<{ network: SocialNetwork; href: string }>; style?: BlockStyle };

export interface EmailContent {
  theme: EmailTheme;
  blocks: EmailBlock[];
}

export interface Campaign {
  id: string;
  name: string;
  subject: string;
  preheader: string | null;
  fromName: string | null;
  content: EmailContent;
  /** `{}` significa toda a base inscrita — é o comportamento padrão, nunca mudado silenciosamente. */
  audienceFilter: AudienceFilter;
  status: CampaignStatus;
  totalRecipients: number;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
}

export interface CampaignStats {
  total: number; pending: number; sent: number; delivered: number;
  bounced: number; complained: number; failed: number; opened: number; clicked: number;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

const unwrap = <T,>(res: { data: { data: T } }): T => res.data.data;

export const emailApi = {
  listSubscribers: (status?: SubscriberStatus, page = 1) =>
    api
      .get('/email/subscribers', { params: { status, page, limit: 50 } })
      .then(unwrap<Paged<Subscriber>>),

  importContacts: () => api.post('/email/subscribers/import/contacts').then(unwrap<ImportResult>),

  importOrders: () => api.post('/email/subscribers/import/sales-orders').then(unwrap<ImportResult>),

  importCsv: (csv: string) =>
    api.post('/email/subscribers/import/csv', { csv }).then(unwrap<ImportResult>),

  unsubscribe: (id: string) =>
    api.post(`/email/subscribers/${id}/unsubscribe`).then(unwrap<Subscriber>),

  addSubscriberTag: (id: string, tagId: string) =>
    api.post(`/email/subscribers/${id}/tags`, { tagId }).then(() => undefined),

  removeSubscriberTag: (id: string, tagId: string) =>
    api.delete(`/email/subscribers/${id}/tags/${tagId}`).then(() => undefined),

  listCampaigns: (page = 1) =>
    api.get('/email/campaigns', { params: { page, limit: 20 } }).then(unwrap<Paged<Campaign>>),

  getCampaign: (id: string) => api.get(`/email/campaigns/${id}`).then(unwrap<Campaign>),

  createCampaign: (body: Partial<Campaign>) =>
    api.post('/email/campaigns', body).then(unwrap<Campaign>),

  updateCampaign: (id: string, body: Partial<Campaign>) =>
    api.put(`/email/campaigns/${id}`, body).then(unwrap<Campaign>),

  sendCampaign: (id: string) =>
    api.post(`/email/campaigns/${id}/send`).then(unwrap<{ totalRecipients: number }>),

  resumeCampaign: (id: string) =>
    api.post(`/email/campaigns/${id}/resume`).then(unwrap<{ requeued: number }>),

  stats: (id: string) => api.get(`/email/campaigns/${id}/stats`).then(unwrap<CampaignStats>),

  /**
   * Conta quantos destinatários um filtro atinge, antes do disparo.
   * Sem `filter`, a API usa o `audienceFilter` já salvo na campanha; com
   * `filter`, usa o que foi passado — é o que permite a tela contar
   * enquanto o operador monta os critérios, antes de salvar.
   */
  audienceCount: (id: string, filter?: AudienceFilter) =>
    api
      .post(`/email/campaigns/${id}/audience-count`, { filter })
      .then(unwrap<AudienceCountResult>),

  failures: (id: string) =>
    api
      .get(`/email/campaigns/${id}/failures`)
      .then(unwrap<Array<{ to: string; status: string; failedReason: string | null }>>),

  preview: (content: unknown, preheader?: string) =>
    api.post('/email/preview', { content, preheader }).then(unwrap<{ html: string }>),
};
