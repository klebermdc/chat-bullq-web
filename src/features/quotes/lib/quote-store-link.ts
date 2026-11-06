import type { StoredQuoteData } from '../types';

/**
 * Link da loja online da cotação: só o atendente vê, para consultar depois.
 * Nunca vai ao cliente (página, PDF e mensagens não leem este campo).
 * Mesmas regras da API: http(s), com domínio, até 500 caracteres.
 */
export const STORE_URL_MAX = 500;
export const STORE_URL_ERROR = 'O link da loja precisa começar com http:// ou https://.';

const HTTP_URL_RE = /^https?:\/\/\S+$/i;
const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);

export function isStoreUrl(value: string): boolean {
  if (!HTTP_URL_RE.test(value)) return false;
  try {
    const url = new URL(value);
    return ALLOWED_PROTOCOLS.has(url.protocol) && url.hostname.includes('.');
  } catch {
    return false;
  }
}

/** Link gravado na cotação, só se for http(s) — seguro para virar href. */
export function savedStoreUrl(details: { quote?: StoredQuoteData | null } | null | undefined): string | null {
  const raw = details?.quote?.storeUrl;
  if (typeof raw !== 'string') return null;
  const value = raw.trim();
  return value && isStoreUrl(value) ? value : null;
}
