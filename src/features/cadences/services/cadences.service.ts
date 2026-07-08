import { api } from '@/lib/api';
import type { Cadence, ActiveEnrollment } from '../types';

export const cadencesService = {
  async list(): Promise<Cadence[]> {
    const { data } = await api.get('/cadences');
    return data.data;
  },
  async getDefaultTemplate(): Promise<Cadence> {
    const { data } = await api.get('/cadences/template/default');
    return data.data;
  },
  async create(payload: Partial<Cadence>): Promise<Cadence> {
    const { data } = await api.post('/cadences', payload);
    return data.data;
  },
  async update(id: string, payload: Partial<Cadence>): Promise<Cadence> {
    const { data } = await api.put(`/cadences/${id}`, payload);
    return data.data;
  },
  async activeForConversation(conversationId: string): Promise<ActiveEnrollment> {
    const { data } = await api.get(`/cadences/enrollments/active/${conversationId}`);
    return data.data;
  },
  async startForConversation(
    cadenceId: string,
    conversationId: string,
  ): Promise<unknown> {
    const { data } = await api.post(`/cadences/${cadenceId}/start`, { conversationId });
    return data.data;
  },
  async stopEnrollment(enrollmentId: string): Promise<unknown> {
    const { data } = await api.post(`/cadences/enrollments/${enrollmentId}/stop`, {});
    return data.data;
  },
};
