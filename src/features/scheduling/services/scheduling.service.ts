import { api } from '@/lib/api';
import type {
  ScheduledMessage, CreateScheduledMessageInput, InactivitySettings,
  InactivityReport, ReengageSuggestion,
} from '../types';

export const schedulingService = {
  async listForConversation(conversationId: string): Promise<ScheduledMessage[]> {
    const { data } = await api.get(`/scheduled-messages/conversation/${conversationId}`);
    return data.data;
  },
  async create(input: CreateScheduledMessageInput): Promise<ScheduledMessage> {
    const { data } = await api.post('/scheduled-messages', input);
    return data.data;
  },
  async update(id: string, patch: { scheduledAt?: string; type?: string; content?: Record<string, any> }): Promise<ScheduledMessage> {
    const { data } = await api.patch(`/scheduled-messages/${id}`, patch);
    return data.data;
  },
  async cancel(id: string): Promise<void> {
    await api.delete(`/scheduled-messages/${id}`);
  },
  async getSettings(): Promise<InactivitySettings> {
    const { data } = await api.get('/inactivity/settings');
    return data.data;
  },
  async updateSettings(patch: Partial<InactivitySettings>): Promise<InactivitySettings> {
    const { data } = await api.put('/inactivity/settings', patch);
    return data.data;
  },
  async report(params: { band?: number; page?: number; pageSize?: number } = {}): Promise<InactivityReport> {
    const { data } = await api.get('/inactivity/report', { params });
    return data.data;
  },
  reportCsvUrl(): string {
    return `${api.defaults.baseURL}/inactivity/report/export`;
  },
  async reengageSuggestion(conversationId: string): Promise<ReengageSuggestion> {
    const { data } = await api.get(`/conversations/${conversationId}/reengage-suggestion`);
    return data.data;
  },
  async dismissSuggestion(conversationId: string): Promise<void> {
    await api.post(`/conversations/${conversationId}/reengage-suggestion/dismiss`, {});
  },
};
