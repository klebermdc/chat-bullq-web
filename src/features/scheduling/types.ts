export type ScheduledMessageStatus = 'PENDING' | 'SENDING' | 'SENT' | 'CANCELED' | 'FAILED';
export type ScheduledMessageOrigin = 'MANUAL' | 'AUTO_REENGAGE';

export interface ScheduledMessage {
  id: string;
  conversationId: string;
  contactId: string;
  channelId: string;
  origin: ScheduledMessageOrigin;
  contentType: string;
  content: Record<string, any>;
  scheduledAt: string;
  status: ScheduledMessageStatus;
  attempt: number;
  maxAttempts: number;
  sentAt: string | null;
  canceledAt: string | null;
  cancelReason: string | null;
  failedReason: string | null;
  createdAt: string;
}

export interface CreateScheduledMessageInput {
  conversationId: string;
  type: string;
  content: Record<string, any>;
  scheduledAt: string; // ISO UTC
  quickReplyId?: string;
  templateId?: string;
  cancelOnReply?: boolean;
}

export interface InactivitySettings {
  organizationId: string;
  enabled: boolean;
  bandsDays: number[];
  /** Unidade por faixa, paralela a bandsDays. Ex.: ['HOURS','HOURS','DAYS']. */
  bandsUnits: ('DAYS' | 'HOURS')[];
  autoReengage: boolean;
  reengageFromBand: number;
  maxAttempts: number;
  retryEveryHours: number;
  quietHoursStart: number | null;
  quietHoursEnd: number | null;
  reengageOnlyAiParked: boolean;
}

export interface InactivityReport {
  byBand: { band: number; count: number }[];
  items: {
    conversationId: string;
    band: number;
    daysStale: number | null;
    contact: { id: string; name: string } | null;
    channel: { id: string; name: string } | null;
    assignedTo: { id: string; name: string } | null;
    hasPendingSchedule: boolean;
  }[];
  page: number;
  pageSize: number;
}

export interface ReengageSuggestion {
  eligible: boolean;
  band: number | null;
  draft: string | null;
}
