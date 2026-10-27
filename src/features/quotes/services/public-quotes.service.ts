import type { PublicQuoteView } from '../types';

/**
 * Leitura pública da cotação (sem login). Roda no SERVIDOR: a página é um
 * server component e o robô de prévia do WhatsApp precisa receber o HTML pronto.
 * Dentro do Docker a API pode ter um endereço interno; fora dele, a pública.
 */
const PUBLIC_API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
const SERVER_API_BASE = process.env.API_INTERNAL_URL ?? PUBLIC_API_BASE;

/** Mesma regra do controller público: barra lixo antes de gastar um request. */
export const QUOTE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{20,64}$/;

export type PublicQuoteResult =
  | { kind: 'ok'; view: PublicQuoteView }
  | { kind: 'not-found' }
  | { kind: 'error' };

/** A API embrulha tudo em { data } (ResponseInterceptor); aceita cru também. */
function unwrap(body: unknown): unknown {
  return body && typeof body === 'object' && 'data' in body ? (body as { data: unknown }).data : body;
}

/**
 * `unwrap` é um cast, não validação. Confere o mínimo que a página usa sem
 * checar e preenche o que uma API mais velha (antes do adendo v1.1) não manda.
 */
function normalize(raw: unknown): PublicQuoteView | null {
  const view = raw as Partial<PublicQuoteView> | null;
  if (!view || !view.quote || !Array.isArray(view.quote.items) || !view.seller) return null;
  return {
    ...(view as PublicQuoteView),
    status: view.status === 'EXPIRED' ? 'EXPIRED' : 'ACTIVE',
    customerName: view.customerName ?? null,
    company: view.company ?? null,
    seller: { name: view.seller.name ?? '', whatsapp: view.seller.whatsapp ?? null },
  };
}

async function loadDevFixture(token: string): Promise<PublicQuoteResult | null> {
  // Só em `next dev`: o build de produção elimina este ramo inteiro.
  if (process.env.NODE_ENV !== 'development') return null;
  const { findQuoteFixture } = await import('../fixtures/quote-fixtures');
  const view = findQuoteFixture(token);
  return view ? { kind: 'ok', view } : null;
}

export async function fetchPublicQuote(token: string): Promise<PublicQuoteResult> {
  if (!QUOTE_TOKEN_PATTERN.test(token)) return { kind: 'not-found' };
  const fixture = await loadDevFixture(token);
  if (fixture) return fixture;
  try {
    const res = await fetch(`${SERVER_API_BASE}/public/quotes/${token}`, { cache: 'no-store' });
    if (res.status === 404 || res.status === 400) return { kind: 'not-found' };
    if (!res.ok) return { kind: 'error' };
    const view = normalize(unwrap(await res.json()));
    return view ? { kind: 'ok', view } : { kind: 'error' };
  } catch {
    // API fora do ar ou resposta que não é JSON: a página mostra "tente de novo".
    return { kind: 'error' };
  }
}

/** Link do PDF: o navegador do cliente baixa direto da API pública. */
export function publicQuotePdfUrl(token: string): string {
  return `${PUBLIC_API_BASE}/public/quotes/${token}/pdf`;
}

/** Marca que o cliente abriu. Só o navegador chama (nunca o render nem o robô de prévia). */
export async function markPublicQuoteViewed(token: string): Promise<void> {
  await fetch(`${PUBLIC_API_BASE}/public/quotes/${token}/view`, { method: 'POST', keepalive: true });
}
