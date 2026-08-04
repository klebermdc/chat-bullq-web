import { api } from './api';

export type SubscriberStatus = 'SUBSCRIBED' | 'UNSUBSCRIBED' | 'BOUNCED' | 'COMPLAINED';
export type CampaignStatus =
  | 'DRAFT' | 'SCHEDULED' | 'SENDING' | 'PAUSED' | 'SENT' | 'FAILED' | 'CANCELED';

export interface Subscriber {
  id: string;
  email: string;
  name: string | null;
  status: SubscriberStatus;
  source: string;
  consentSource: string | null;
  createdAt: string;
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

  failures: (id: string) =>
    api
      .get(`/email/campaigns/${id}/failures`)
      .then(unwrap<Array<{ to: string; status: string; failedReason: string | null }>>),

  preview: (content: unknown, preheader?: string) =>
    api.post('/email/preview', { content, preheader }).then(unwrap<{ html: string }>),
};
