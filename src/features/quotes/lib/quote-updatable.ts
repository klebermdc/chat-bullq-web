import type { Proposal } from '@/features/proposals/types';
import type { QuotePreview } from '../types';
import { previewFromSaved } from './quote-draft';
import { latestQuote } from './quote-tracking';

/**
 * A cotação por link da conversa que dá para reabrir no editor de atualização:
 * a mais recente, desde que tenha os itens gravados (as de antes do editor não têm).
 */
export function updatableQuote(list: readonly Proposal[] | undefined): Proposal | null {
  const quote = latestQuote(list);
  return quote && previewFromSaved(quote.details) !== null ? quote : null;
}

/**
 * "Atualizar com print": o print novo traz itens e valores; da cotação já
 * enviada ficam o nome do cliente, a observação e o link da loja.
 */
export function replaceItemsFromPrint(saved: QuotePreview, fresh: QuotePreview): QuotePreview {
  return {
    ...fresh,
    customerName: saved.customerName ?? fresh.customerName,
    quote: {
      ...fresh.quote,
      notes: saved.quote.notes ?? fresh.quote.notes,
      storeUrl: saved.quote.storeUrl ?? fresh.quote.storeUrl ?? null,
    },
  };
}
