import { api } from '@/lib/api';
import type { Cadence, ActiveEnrollment } from '../types';

/** Envia só os campos do UpsertCadenceDto — tira id/organizationId/isTemplate
 *  que o ValidationPipe do backend pode rejeitar (forbidNonWhitelisted). */
function toDto(c: Partial<Cadence>) {
  return {
    name: c.name,
    pipelineId: c.pipelineId ?? null,
    stageId: c.stageId ?? null,
    lostStageId: c.lostStageId ?? null,
    hotTagId: c.hotTagId ?? null,
    optOutTagId: c.optOutTagId ?? null,
    trigger: c.trigger,
    enabled: c.enabled ?? false,
    allowManual: c.allowManual ?? true,
    watchedStageIds: c.watchedStageIds ?? [],
    onYesMessage: c.onYesMessage ?? null,
    onNoMessage: c.onNoMessage ?? null,
    steps: (c.steps ?? []).map((s) => ({
      order: s.order,
      delayMinutes: s.delayMinutes,
      content: s.content,
      options: s.options,
      templateId: s.templateId ?? null,
    })),
  };
}

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
    const { data } = await api.post('/cadences', toDto(payload));
    return data.data;
  },
  async update(id: string, payload: Partial<Cadence>): Promise<Cadence> {
    const { data } = await api.put(`/cadences/${id}`, toDto(payload));
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
  /** Retoma agora um enrollment PAUSED, sem esperar a janela de silêncio. */
  async resumeEnrollment(enrollmentId: string): Promise<unknown> {
    const { data } = await api.post(`/cadences/enrollments/${enrollmentId}/resume`, {});
    return data.data;
  },
};
