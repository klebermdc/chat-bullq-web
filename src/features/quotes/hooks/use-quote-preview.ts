'use client';

import { useCallback, useState } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import type { PublicQuoteView } from '../types';
import type { QuoteDraft } from '../lib/quote-draft';
import { previewFromDraft } from '../lib/quote-preview-view';

export interface QuotePreviewState {
  view: PublicQuoteView;
  now: Date;
}

/** Atualização: nº e criação da cotação já enviada. */
export interface QuotePreviewOrigin {
  code?: string | null;
  createdAt?: string | null;
}

/**
 * "Ver como o cliente vai ver": confere o rascunho e guarda a página montada
 * dele. `show` devolve os erros (em texto, como o botão de enviar mostra) ou
 * null quando a prévia abriu. O rascunho do editor não é tocado.
 */
export function useQuotePreview(origin: QuotePreviewOrigin = {}) {
  const sellerName = useAuthStore((s) => s.user?.name ?? null);
  const [preview, setPreview] = useState<QuotePreviewState | null>(null);
  const { code, createdAt } = origin;

  const show = useCallback(
    (draft: QuoteDraft, currency: string): string | null => {
      const now = new Date();
      const result = previewFromDraft(draft, currency, { now, sellerName, code, createdAt });
      if (!result.ok) return result.errors.join('\n');
      setPreview({ view: result.view, now });
      return null;
    },
    [sellerName, code, createdAt],
  );

  const close = useCallback(() => setPreview(null), []);

  return { preview, show, close };
}
