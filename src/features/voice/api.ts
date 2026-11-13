import { api } from '@/lib/api';

export interface VoiceCallSettings {
  enabled: boolean;
  delayHours: number;
  /** A API tem LiveKit configurado (sem isso, nenhuma ligação sai). */
  dialerConfigured: boolean;
}

export const VOICE_SETTINGS_QUERY_KEY = ['voice-settings'] as const;
export const DELAY_OPTIONS = [12, 24, 48, 72] as const;

const unwrap = <T,>(body: { data: T }): T => body.data;

export async function fetchVoiceSettings(): Promise<VoiceCallSettings> {
  const { data } = await api.get('/voice/settings');
  return unwrap(data);
}

export async function updateVoiceSettings(payload: { enabled: boolean; delayHours?: number }): Promise<VoiceCallSettings> {
  const { data } = await api.patch('/voice/settings', payload);
  return unwrap(data);
}

/** Texto do resumo mostrado na tela. */
export function voiceSummary(s: Pick<VoiceCallSettings, 'enabled' | 'delayHours' | 'dialerConfigured'>): string {
  if (!s.enabled) return 'Desligado: a Aline não pede permissão nem liga para nenhum cliente.';
  if (!s.dialerConfigured) return 'Ligado, mas a conexão de ligações ainda não está configurada: nenhuma ligação sai por enquanto.';
  return `Ligado: a Aline liga ${s.delayHours} horas depois da cotação, se o cliente não responder.`;
}
