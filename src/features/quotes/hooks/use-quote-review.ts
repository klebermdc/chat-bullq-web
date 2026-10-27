'use client';

import { useCallback, useRef, useState } from 'react';
import { draftFromPreview, type QuoteDraft } from '../lib/quote-draft';
import type { QuotePreview } from '../types';

export interface QuoteReview {
  draft: QuoteDraft;
  currency: string;
}

/**
 * Estado da conferência da cotação por link no modal de proposta: o rascunho
 * lido dos prints (editável) e a moeda que veio da leitura.
 */
export function useQuoteReview() {
  const [review, setReview] = useState<QuoteReview | null>(null);
  const seq = useRef(0);
  // Chave estável por item: o React não pode confundir os campos ao remover um.
  const nextKey = useCallback(() => `quote-item-${++seq.current}`, []);

  const start = useCallback(
    (preview: QuotePreview) => setReview({ draft: draftFromPreview(preview, nextKey), currency: preview.quote.currency }),
    [nextKey],
  );
  const setDraft = useCallback(
    (draft: QuoteDraft) => setReview((current) => (current ? { ...current, draft } : current)),
    [],
  );
  const reset = useCallback(() => setReview(null), []);

  return { review, start, setDraft, reset, nextKey };
}
