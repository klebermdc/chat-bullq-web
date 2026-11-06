import type { Proposal } from '@/features/proposals/types';
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
