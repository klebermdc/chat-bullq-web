import { api } from '@/lib/api';
import type { BusinessHoursConfig } from '@/features/ai-agents/services/ai-settings.service';

export interface Member {
  id: string;
  userId: string;
  organizationId: string;
  role: 'OWNER' | 'ADMIN' | 'AGENT';
  agentStatus: string;
  sonaxRamal?: string | null;
  sonaxWebphoneUrl?: string | null;
  joinedAt: string;
  workingHours?: BusinessHoursConfig | null;
  offHoursNoticeEnabled?: boolean;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
    isActive: boolean;
  };
}

export const membersService = {
  async list(): Promise<Member[]> {
    const { data } = await api.get('/organizations/members');
    return data.data;
  },
  async invite(payload: { email: string; role?: string }): Promise<any> {
    const { data } = await api.post('/organizations/members/invite', payload);
    return data.data;
  },
  async updateRole(memberId: string, role: string): Promise<any> {
    const { data } = await api.patch(`/organizations/members/${memberId}/role`, { role });
    return data.data;
  },
  async remove(memberId: string): Promise<void> {
    await api.delete(`/organizations/members/${memberId}`);
  },
  async changePassword(payload: { currentPassword: string; newPassword: string }): Promise<void> {
    await api.post('/users/me/change-password', payload);
  },
  async resetMemberPassword(memberId: string, newPassword: string): Promise<void> {
    await api.patch(`/organizations/members/${memberId}/password`, { newPassword });
  },
  async updateMemberEmail(memberId: string, email: string): Promise<void> {
    await api.patch(`/organizations/members/${memberId}/email`, { email });
  },
  async updateRamal(memberId: string, sonaxRamal: string): Promise<void> {
    await api.patch(`/organizations/members/${memberId}/ramal`, { sonaxRamal });
  },
  async updateWebphone(memberId: string, webphoneUrl: string): Promise<void> {
    await api.patch(`/organizations/members/${memberId}/webphone`, { webphoneUrl });
  },
  async updateWorkingHours(
    memberId: string,
    payload: { workingHours: BusinessHoursConfig | null; offHoursNoticeEnabled: boolean },
  ): Promise<void> {
    await api.patch(`/organizations/members/${memberId}/working-hours`, payload);
  },
};
