import { api } from '@/lib/api';

export interface WebhookSub {
  id: string;
  url: string;
  events: string[];
  isActive: boolean;
  description: string | null;
  secret: string;
  consecutiveFailures: number;
  disabledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookDelivery {
  id: string;
  type: string;
  status: string;
  attemptCount: number;
  responseStatus: number | null;
  lastError: string | null;
  createdAt: string;
  deliveredAt: string | null;
}

export const WEBHOOK_EVENTS = [
  'MESSAGE_RECEIVED',
  'CONVERSATION_CREATED',
  'CONVERSATION_STATUS_CHANGED',
  'CONVERSATION_ASSIGNED',
  'TAG_ADDED',
  'TAG_REMOVED',
] as const;

export const webhooksService = {
  async list(): Promise<WebhookSub[]> {
    const { data } = await api.get('/webhooks');
    return data.data;
  },
  async create(payload: { url: string; events: string[]; description?: string }): Promise<WebhookSub> {
    const { data } = await api.post('/webhooks', payload);
    return data.data;
  },
  async update(
    id: string,
    payload: Partial<{ url: string; events: string[]; isActive: boolean; description: string }>
  ): Promise<WebhookSub> {
    const { data } = await api.patch(`/webhooks/${id}`, payload);
    return data.data;
  },
  async remove(id: string): Promise<void> {
    await api.delete(`/webhooks/${id}`);
  },
  async deliveries(id: string): Promise<WebhookDelivery[]> {
    const { data } = await api.get(`/webhooks/${id}/deliveries`);
    return data.data;
  },
  async ping(id: string): Promise<void> {
    await api.post(`/webhooks/${id}/ping`);
  },
};
