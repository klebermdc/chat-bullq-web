import { api } from '@/lib/api';

export interface AttendantGreetingSettings {
  organizationId: string;
  enabled: boolean;
  template: string;
}

export const attendantGreetingService = {
  async get(): Promise<AttendantGreetingSettings> {
    const { data } = await api.get('/attendant-greeting/settings');
    return data.data;
  },
  async update(
    patch: Partial<Pick<AttendantGreetingSettings, 'enabled' | 'template'>>,
  ): Promise<AttendantGreetingSettings> {
    const { data } = await api.put('/attendant-greeting/settings', patch);
    return data.data;
  },
};
