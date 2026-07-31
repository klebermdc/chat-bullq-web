import { api } from '@/lib/api';

export type ErrorSource = 'API' | 'CHANNEL' | 'AI' | 'JOB';
export type ErrorSeverity = 'CRITICAL' | 'ERROR' | 'WARNING';
export type ErrorIssueStatus = 'OPEN' | 'RESOLVED' | 'MUTED';

export interface BugIssue {
  id: string;
  fingerprint: string;
  source: ErrorSource;
  code: string;
  severity: ErrorSeverity;
  status: ErrorIssueStatus;
  title: string;
  lastStack: string | null;
  count: number;
  firstSeenAt: string;
  lastSeenAt: string;
  resolvedAt: string | null;
  mutedUntil: string | null;
  organizationId: string | null;
  impactedContacts: number;
}

export interface BugOccurrence {
  id: string;
  occurredAt: string;
  context: Record<string, unknown>;
  stack: string | null;
  organizationId: string | null;
  channelId: string | null;
  conversationId: string | null;
  contactId: string | null;
  userId: string | null;
}

export interface BugDetail extends BugIssue {
  occurrences: BugOccurrence[];
}

export interface BugFilters {
  source?: ErrorSource;
  severity?: ErrorSeverity;
  status?: ErrorIssueStatus;
  q?: string;
  page?: number;
  perPage?: number;
}

export const bugsService = {
  async list(filters: BugFilters): Promise<{ items: BugIssue[]; total: number }> {
    const { data } = await api.get('/platform/errors', { params: filters });
    return data.data;
  },
  async detail(id: string): Promise<BugDetail> {
    const { data } = await api.get(`/platform/errors/${id}`);
    return data.data;
  },
  async updateStatus(id: string, status: ErrorIssueStatus, mutedUntil?: string): Promise<void> {
    await api.patch(`/platform/errors/${id}`, { status, mutedUntil });
  },
};
