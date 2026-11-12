import { QUOTE_VALIDITY_HOURS, type PublicQuoteView, type QuoteData } from '../types';
import { QUOTE_COMPANY, QUOTE_PREVIEW_TERMS } from './quote-company';
import { validateQuoteDraft, type QuoteDraft, type QuoteSubmission } from './quote-draft';

/**
 * Prévia da página pública ANTES do envio: o mesmo `PublicQuoteView` que a
 * API devolve em GET /public/quotes/:token, montado a partir do rascunho em
 * conferência. Nada é gravado nem enviado.
 */

/** Nº que aparece na prévia de uma cotação nova (o de verdade sai ao gravar). */
export const PREVIEW_QUOTE_CODE = 'nova';

/**
 * O número do canal (o wa.me dos botões) só a API sabe. Na prévia os botões
 * não têm ação; o número fictício só faz eles aparecerem como o cliente vê.
 */
export const PREVIEW_SELLER_WHATSAPP = '550000000000';

const HOUR_MS = 3_600_000;

export interface QuotePreviewContext {
  now: Date;
  /** Quem grava a cotação é o vendedor da página (como na API). */
  sellerName: string | null;
  /** Atualização: o nº já enviado. Ausente = cotação nova. */
  code?: string | null;
  /** Atualização: quando a cotação foi criada. Ausente = agora. */
  createdAt?: string | null;
}

export type QuotePreviewResult = { ok: true; view: PublicQuoteView } | { ok: false; errors: string[] };

/** Lista branca do contrato público: o link da loja (só da equipe) fica de fora. */
function publicQuoteData({ quote }: QuoteSubmission): QuoteData {
  const { items, currency, total, pixTotal, installments, notes } = quote;
  return { items, currency, total, pixTotal, installments, notes };
}

export function buildPreviewView(submission: QuoteSubmission, ctx: QuotePreviewContext): PublicQuoteView {
  const nowIso = ctx.now.toISOString();
  const isUpdate = Boolean(ctx.createdAt);
  return {
    status: 'ACTIVE',
    code: ctx.code || PREVIEW_QUOTE_CODE,
    customerName: submission.customerName,
    // Vendedor sem nome: a página fala em nome da empresa, como na API.
    seller: { name: ctx.sellerName?.trim() || QUOTE_COMPANY.name, whatsapp: PREVIEW_SELLER_WHATSAPP },
    company: { ...QUOTE_COMPANY },
    terms: QUOTE_PREVIEW_TERMS,
    createdAt: ctx.createdAt || nowIso,
    // A validade recomeça a cada envio e a cada atualização.
    expiresAt: new Date(ctx.now.getTime() + QUOTE_VALIDITY_HOURS * HOUR_MS).toISOString(),
    updatedAt: isUpdate ? nowIso : null,
    quote: publicQuoteData(submission),
  };
}

/** Confere o rascunho como o botão de enviar e, se passar, monta a página. */
export function previewFromDraft(draft: QuoteDraft, currency: string, ctx: QuotePreviewContext): QuotePreviewResult {
  const result = validateQuoteDraft(draft, currency);
  if (!result.ok) return result;
  return { ok: true, view: buildPreviewView(result.value, ctx) };
}
