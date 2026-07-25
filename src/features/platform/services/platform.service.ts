import { api } from '@/lib/api';

export interface PlatformOrg {
  id: string;
  name: string;
  slug: string;
  plan: string;
  suspendedAt: string | null;
  createdAt: string;
  _count: { members: number; conversations: number };
}

export interface CreateOrgPayload {
  companyName: string;
  plan?: string;
  ownerName: string;
  ownerEmail: string;
  ownerPassword: string;
}

export const platformService = {
  async list(): Promise<PlatformOrg[]> {
    const { data } = await api.get('/platform/organizations');
    return data.data;
  },
  async create(payload: CreateOrgPayload): Promise<{ organization: PlatformOrg; owner: any }> {
    const { data } = await api.post('/platform/organizations', payload);
    return data.data;
  },
  async suspend(id: string): Promise<void> {
    await api.patch(`/platform/organizations/${id}/suspend`);
  },
  async activate(id: string): Promise<void> {
    await api.patch(`/platform/organizations/${id}/activate`);
  },
};
