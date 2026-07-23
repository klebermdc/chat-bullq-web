import { api } from '@/lib/api';

export type DealStatus = 'OPEN' | 'WON' | 'LOST';

export interface DealsFilters {
  from?: string;
  to?: string;
  dateField?: 'createdAt' | 'closedAt';
  pipelineId?: string;
  stageIds?: string[];
  status?: DealStatus;
  assignedToId?: string;
  valueMin?: string;
  valueMax?: string;
  hasProposal?: 'true' | 'false';
  page?: number;
  perPage?: number;
}

export interface DealRow {
  id: string;
  contactName: string | null;
  pipelineName: string;
  stageName: string;
  status: DealStatus;
  value: number | null;
  assignedToName: string | null;
  createdAt: string;
  closedAt: string | null;
  closedReason: string | null;
}

export interface DealsReport {
  metrics: {
    count: number;
    totalValue: number;
    won: { count: number; value: number };
    lost: { count: number; value: number };
    conversionRate: number;
    avgWonTicket: number;
  };
  rows: DealRow[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

function toParams(f: DealsFilters): Record<string, string> {
  const p: Record<string, string> = {};
  if (f.from) p.from = f.from;
  if (f.to) p.to = f.to;
  if (f.dateField) p.dateField = f.dateField;
  if (f.pipelineId) p.pipelineId = f.pipelineId;
  if (f.stageIds?.length) p.stageIds = f.stageIds.join(',');
  if (f.status) p.status = f.status;
  if (f.assignedToId) p.assignedToId = f.assignedToId;
  if (f.valueMin) p.valueMin = f.valueMin;
  if (f.valueMax) p.valueMax = f.valueMax;
  if (f.hasProposal) p.hasProposal = f.hasProposal;
  if (f.page) p.page = String(f.page);
  if (f.perPage) p.perPage = String(f.perPage);
  return p;
}

export interface LeadsFilters {
  from?: string;
  to?: string;
  channelId?: string;
  assignedToId?: string;
  tagId?: string;
  hasProposal?: 'true' | 'false';
  hasDeal?: 'true' | 'false';
  temperatureMin?: string; // '1'|'2'|'3'
  page?: number;
  perPage?: number;
}

export interface LeadRow {
  id: string;
  name: string | null;
  phone: string | null;
  channelName: string | null;
  assignedToName: string | null;
  tags: string[];
  hasProposal: boolean;
  hasDeal: boolean;
  temperature: number | null;
  createdAt: string;
}

export interface LeadsReport {
  metrics: {
    count: number;
    withProposal: { count: number; pct: number };
    withDeal: { count: number; pct: number };
    byTag: Array<{ name: string; count: number }>;
  };
  rows: LeadRow[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

function leadsToParams(f: LeadsFilters): Record<string, string> {
  const p: Record<string, string> = {};
  if (f.from) p.from = f.from;
  if (f.to) p.to = f.to;
  if (f.channelId) p.channelId = f.channelId;
  if (f.assignedToId) p.assignedToId = f.assignedToId;
  if (f.tagId) p.tagId = f.tagId;
  if (f.hasProposal) p.hasProposal = f.hasProposal;
  if (f.hasDeal) p.hasDeal = f.hasDeal;
  if (f.temperatureMin) p.temperatureMin = f.temperatureMin;
  if (f.page) p.page = String(f.page);
  if (f.perPage) p.perPage = String(f.perPage);
  return p;
}

export type ConversationStatus =
  | 'PENDING'
  | 'BOT'
  | 'OPEN'
  | 'WAITING'
  | 'CLOSED';

export interface ConversationsFilters {
  from?: string;
  to?: string;
  status?: ConversationStatus;
  channelId?: string;
  assignedToId?: string;
  tagId?: string;
  reopened?: 'true' | 'false';
  answered?: 'true' | 'false';
  page?: number;
  perPage?: number;
}

export interface ConversationRow {
  id: string;
  contactName: string | null;
  channelName: string | null;
  status: ConversationStatus;
  assignedToName: string | null;
  firstResponseSeconds: number | null;
  reopenedCount: number;
  createdAt: string;
  closedAt: string | null;
}

export interface ConversationsReport {
  metrics: {
    count: number;
    open: number;
    closed: number;
    reopened: number;
    avgFirstResponseSeconds: number | null;
    answeredCount: number;
    byChannel: Array<{ name: string; count: number }>;
  };
  rows: ConversationRow[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

function conversationsToParams(f: ConversationsFilters): Record<string, string> {
  const p: Record<string, string> = {};
  if (f.from) p.from = f.from;
  if (f.to) p.to = f.to;
  if (f.status) p.status = f.status;
  if (f.channelId) p.channelId = f.channelId;
  if (f.assignedToId) p.assignedToId = f.assignedToId;
  if (f.tagId) p.tagId = f.tagId;
  if (f.reopened) p.reopened = f.reopened;
  if (f.answered) p.answered = f.answered;
  if (f.page) p.page = String(f.page);
  if (f.perPage) p.perPage = String(f.perPage);
  return p;
}

export const crmReportsService = {
  async getDeals(f: DealsFilters): Promise<DealsReport> {
    const { data } = await api.get('/crm-reports/deals', { params: toParams(f) });
    return data.data ?? data;
  },
  async downloadDealsCsv(f: DealsFilters): Promise<Blob> {
    const { data } = await api.get('/crm-reports/deals/export.csv', {
      params: toParams(f),
      responseType: 'blob',
    });
    return data as Blob;
  },
  async getLeads(f: LeadsFilters): Promise<LeadsReport> {
    const { data } = await api.get('/crm-reports/leads', {
      params: leadsToParams(f),
    });
    return data.data ?? data;
  },
  async downloadLeadsCsv(f: LeadsFilters): Promise<Blob> {
    const { data } = await api.get('/crm-reports/leads/export.csv', {
      params: leadsToParams(f),
      responseType: 'blob',
    });
    return data as Blob;
  },
  async getConversations(f: ConversationsFilters): Promise<ConversationsReport> {
    const { data } = await api.get('/crm-reports/conversations', {
      params: conversationsToParams(f),
    });
    return data.data ?? data;
  },
  async downloadConversationsCsv(f: ConversationsFilters): Promise<Blob> {
    const { data } = await api.get('/crm-reports/conversations/export.csv', {
      params: conversationsToParams(f),
      responseType: 'blob',
    });
    return data as Blob;
  },
};
