import { api } from '@/lib/api';

export interface RecoverySettings {
  organizationId?: string;
  outreachChannelId?: string | null;
  openerTemplateName?: string | null;
  followUpTemplateName?: string | null;
  templateLang?: string | null;
}

export const recoverySettingsService = {
  get: () =>
    api.get('/recovery/settings').then((r) => r.data.data as RecoverySettings),
  update: (payload: Partial<RecoverySettings>) =>
    api
      .patch('/recovery/settings', payload)
      .then((r) => r.data.data as RecoverySettings),
};
