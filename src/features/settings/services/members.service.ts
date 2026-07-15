import { api } from '@/lib/api';

export interface Member {
  id: string;
  userId: string;
  organizationId: string;
  role: 'OWNER' | 'ADMIN' | 'AGENT';
  agentStatus: string;
  sonaxRamal?: string | null;
  joinedAt: string;
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
  async updateRamal(memberId: string, sonaxRamal: string): Promise<void> {
    await api.patch(`/organizations/members/${memberId}/ramal`, { sonaxRamal });
  },
};
