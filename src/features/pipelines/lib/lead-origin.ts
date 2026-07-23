import type { CardSummary } from '../services/pipelines.service';

export type LeadOriginResolved = {
  /** Chave estável (p/ o seletor de correção). */
  key: 'INSTAGRAM_ORGANIC' | 'WHATSAPP_DIRECT' | 'INSTAGRAM' | 'AD' | 'SITE';
  label: string;
  emoji: string;
};

/** Nome da tag → origem explícita. Espelha ORIGIN_TAG_NAMES da API. */
const TAG_TO_ORIGIN: Record<string, LeadOriginResolved> = {
  'Instagram Orgânico': { key: 'INSTAGRAM_ORGANIC', label: 'Instagram Orgânico', emoji: '📸' },
  Anúncio: { key: 'AD', label: 'Anúncio', emoji: '📣' },
  Site: { key: 'SITE', label: 'Site', emoji: '🌐' },
};

/**
 * Resolve a origem do lead: tag de origem explícita vence; senão, fallback pelo
 * canal. Sempre retorna algo (todo card tem selo).
 */
export function resolveLeadOrigin(card: CardSummary): LeadOriginResolved {
  const tags = card.conversation?.tags ?? [];
  for (const t of tags) {
    const hit = TAG_TO_ORIGIN[t.tag.name];
    if (hit) return hit;
  }
  const channelType = card.conversation?.channel?.type;
  if (channelType === 'INSTAGRAM') {
    return { key: 'INSTAGRAM', label: 'Instagram', emoji: '📸' };
  }
  return { key: 'WHATSAPP_DIRECT', label: 'WhatsApp direto', emoji: '💬' };
}
