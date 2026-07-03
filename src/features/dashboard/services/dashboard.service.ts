import { api } from '@/lib/api';

export interface DashboardFilters {
  from?: string;
  to?: string;
  channelId?: string;
  departmentId?: string;
  status?: string;
  assignedToId?: string;
}

export interface LeadsReport {
  newLeads: number;
  proactiveLeads: number;
  respondedLeads: number;
  respondedRate: number | null;
  bySeller: Array<{
    seller: { id: string; name: string; avatarUrl: string | null } | null;
    received: number;
    responded: number;
    open: number;
    closed: number;
    avgFirstResponseMin: number | null;
  }>;
}

function toParams(f: DashboardFilters = {}): Record<string, string> {
  const p: Record<string, string> = {};
  if (f.from) p.from = f.from;
  if (f.to) p.to = f.to;
  if (f.channelId) p.channelId = f.channelId;
  if (f.departmentId) p.departmentId = f.departmentId;
  if (f.status) p.status = f.status;
  if (f.assignedToId) p.assignedToId = f.assignedToId;
  return p;
}

export interface DashboardOverview {
  activeConversations: number;
  activeBreakdown: { pending: number; open: number; waiting: number; bot: number };
  /** Conversas marcadas como presas pelo watchdog (após exceder maxAttempts). */
  stuckConversations: number;

  avgFirstResponseMinutes: number | null;
  avgFirstResponseTrend: number;

  slaCompliancePercent: number | null;
  slaTrend: number;

  resolutionRatePercent: number | null;
  resolutionTrend: number;

  fcrPercent: number | null;
  csatScore: number | null;
  csatResponses: number;
  csatTrend: number;

  totalConversations: number;
  conversationsTrend: number;
  openConversations: number;
  pendingConversations: number;
  totalMessages: number;
  messagesTrend: number;
  avgResolutionMinutes: number | null;
}

export interface CsatBreakdown {
  avgScore: number | null;
  totalResponses: number;
  totalRequested: number;
  responseRate: number | null;
  distribution: Record<number, number>;
  recentComments: Array<{
    id: string;
    score: number;
    comment: string | null;
    respondedAt: string | null;
    contactName: string;
  }>;
}

export interface ReopenStats {
  totalReopens: number;
  uniqueConversationsReopened: number;
  reopenRate: number | null;
  series: Array<{ date: string; value: number }>;
  worstOffenders: Array<{
    conversationId: string;
    contactName: string;
    agentName: string | null;
    reopenedCount: number;
  }>;
}

export interface SparklinePoint { date: string; value: number; }
export interface KpiSparklines {
  active: SparklinePoint[];
  firstResponse: SparklinePoint[];
  sla: SparklinePoint[];
  resolution: SparklinePoint[];
}

export interface VolumeByDay { date: string; count: number; }
export interface VolumeByChannel { channelId: string; channelName: string; channelType: string; count: number; }
export interface VolumeByStatus { status: string; count: number; }
export interface VolumeFlow { date: string; created: number; closed: number; }
export interface MessagesFlow { date: string; inbound: number; outbound: number; }
export interface PeakHours { matrix: number[][]; max: number; }
export interface BotPerformance {
  botResolved: number;
  humanHandled: number;
  inFlight: number;
  total: number;
  botResolutionRate: number | null;
  escalationRate: number | null;
}
export interface TopTag { id: string; name: string; color: string; count: number; }
export interface AgentPerformance {
  agent: { id: string; name: string; avatarUrl: string | null };
  totalConversations: number;
  closedConversations: number;
  activeConversations: number;
  resolutionRate: number;
  avgFirstResponseMinutes: number | null;
  avgResolutionMinutes: number | null;
}

export const dashboardService = {
  async getOverview(filters?: DashboardFilters): Promise<DashboardOverview> {
    const { data } = await api.get('/dashboard/overview', { params: toParams(filters) });
    return data.data;
  },
  async getVolumeByDay(filters?: DashboardFilters): Promise<VolumeByDay[]> {
    const { data } = await api.get('/dashboard/volume-by-day', { params: toParams(filters) });
    return data.data;
  },
  async getVolumeByChannel(filters?: DashboardFilters): Promise<VolumeByChannel[]> {
    const { data } = await api.get('/dashboard/volume-by-channel', { params: toParams(filters) });
    return data.data;
  },
  async getVolumeByStatus(filters?: DashboardFilters): Promise<VolumeByStatus[]> {
    const { data } = await api.get('/dashboard/volume-by-status', { params: toParams(filters) });
    return data.data;
  },
  async getKpiSparklines(filters?: DashboardFilters): Promise<KpiSparklines> {
    const { data } = await api.get('/dashboard/kpi-sparklines', { params: toParams(filters) });
    return data.data;
  },
  async getAgentPerformance(filters?: DashboardFilters): Promise<AgentPerformance[]> {
    const { data } = await api.get('/dashboard/agent-performance', { params: toParams(filters) });
    return data.data;
  },
  async getVolumeFlow(filters?: DashboardFilters): Promise<VolumeFlow[]> {
    const { data } = await api.get('/dashboard/volume-flow', { params: toParams(filters) });
    return data.data;
  },
  async getPeakHours(filters?: DashboardFilters): Promise<PeakHours> {
    const { data } = await api.get('/dashboard/peak-hours', { params: toParams(filters) });
    return data.data;
  },
  async getMessagesFlow(filters?: DashboardFilters): Promise<MessagesFlow[]> {
    const { data } = await api.get('/dashboard/messages-flow', { params: toParams(filters) });
    return data.data;
  },
  async getBotPerformance(filters?: DashboardFilters): Promise<BotPerformance> {
    const { data } = await api.get('/dashboard/bot-performance', { params: toParams(filters) });
    return data.data;
  },
  async getCsat(filters?: DashboardFilters): Promise<CsatBreakdown> {
    const { data } = await api.get('/dashboard/csat', { params: toParams(filters) });
    return data.data;
  },
  async getReopens(filters?: DashboardFilters): Promise<ReopenStats> {
    const { data } = await api.get('/dashboard/reopens', { params: toParams(filters) });
    return data.data;
  },
  async getTopTags(filters?: DashboardFilters, limit?: number): Promise<TopTag[]> {
    const params = toParams(filters);
    if (limit) params.limit = String(limit);
    const { data } = await api.get('/dashboard/top-tags', { params });
    return data.data;
  },
  async getLeadsReport(filters?: DashboardFilters): Promise<LeadsReport> {
    const { data } = await api.get('/dashboard/leads', { params: toParams(filters) });
    return data.data;
  },
};
