import type { TemplateAudience } from '../types';

export const AUDIENCE_LABEL: Record<TemplateAudience, { short: string; long: string }> = {
  CLIENT: { short: 'Cliente', long: 'Cliente (assina pelo link)' },
  INTERNAL: { short: 'Interno', long: 'Interno (só baixar PDF)' },
};
