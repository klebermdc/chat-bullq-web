import type { SenderKind } from '../services/whatsapp-costs.service';

/**
 * Nomes em português simples para o que a Meta manda em código. O que vier
 * de novo da Meta cai em "Outros" sem quebrar a tela.
 */
export const CHARGED_TYPE = 'REGULAR';
const OTHER_LABEL = 'Outros';

const CATEGORY_LABELS: Record<string, string> = {
  SERVICE: 'Respostas (24h)',
  MARKETING: 'Templates de marketing',
  UTILITY: 'Templates de utilidade',
  AUTHENTICATION: 'Códigos de verificação',
};

/** Rótulo curto, para legenda de gráfico e coluna estreita. */
const CATEGORY_SHORT_LABELS: Record<string, string> = {
  SERVICE: 'Respostas 24h',
  MARKETING: 'Marketing',
  UTILITY: 'Utilidade',
  AUTHENTICATION: 'Autenticação',
};

const TYPE_LABELS: Record<string, string> = {
  REGULAR: 'Cobradas',
  FREE_ENTRY_POINT: 'Grátis: vieram de anúncio',
  FREE_CUSTOMER_SERVICE: 'Grátis: franquia da Meta',
};

const SENDER_KIND_LABELS: Record<SenderKind, string> = {
  agent: 'Vendedor',
  ai: 'IA',
  system: 'Sistema',
};

const normalize = (code: string | null | undefined): string => (code ?? '').trim().toUpperCase();

export function categoryLabel(category: string | null | undefined): string {
  return CATEGORY_LABELS[normalize(category)] ?? OTHER_LABEL;
}

export function categoryShortLabel(category: string | null | undefined): string {
  return CATEGORY_SHORT_LABELS[normalize(category)] ?? OTHER_LABEL;
}

export function typeLabel(type: string | null | undefined): string {
  return TYPE_LABELS[normalize(type)] ?? 'Outra situação';
}

/** Só REGULAR é cobrada; todo o resto (grátis ou desconhecido) não entra na conta. */
export function isChargedType(type: string | null | undefined): boolean {
  return normalize(type) === CHARGED_TYPE;
}

export function isMarketingCategory(category: string | null | undefined): boolean {
  return normalize(category) === 'MARKETING';
}

export function senderKindLabel(kind: SenderKind): string {
  return SENDER_KIND_LABELS[kind] ?? OTHER_LABEL;
}
