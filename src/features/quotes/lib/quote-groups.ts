import { normalize, operatorFromText } from '@/features/ticket-rules/lib/match-ticket-rule';
import type { QuoteItem } from '../types';
import { sortItemsByDate, toneAt, type QuoteTicketEntry } from './quote-blocks';

/**
 * Separa os itens da página pública em grupos com um balão no topo
 * ("Ingressos", "Hospedagem"...), para o cliente ver de cara o que é cada coisa.
 */

export type QuoteItemKind = 'tickets' | 'hotel' | 'other';

export interface QuoteItemGroup {
  kind: QuoteItemKind;
  label: string;
  entries: QuoteTicketEntry[];
}

/** Ordem fixa na página: ingressos primeiro, depois hotel, depois o resto. */
const GROUPS: { kind: QuoteItemKind; label: string }[] = [
  { kind: 'tickets', label: 'Ingressos' },
  { kind: 'hotel', label: 'Hospedagem' },
  { kind: 'other', label: 'Outros serviços' },
];

const HOTEL_WORDS = /\b(?:hotel|hoteis|hospedagem|pousada)\b/;
const TICKET_WORDS = /\b(?:ingressos?|tickets?|passes?)\b/;

export function itemKind(item: QuoteItem): QuoteItemKind {
  const raw = `${item.provider} ${item.title}`;
  const text = normalize(raw);
  if (item.hotel || item.hotelName?.trim() || HOTEL_WORDS.test(text)) return 'hotel';
  if (operatorFromText(raw) || TICKET_WORDS.test(text)) return 'tickets';
  return 'other';
}

/** Grupos não vazios, cada um por data; as cores alternam na ordem da página. */
export function groupQuoteItems(items: readonly QuoteItem[]): QuoteItemGroup[] {
  let position = 0;
  return GROUPS.map(({ kind, label }) => {
    const sorted = sortItemsByDate(items.filter((i) => itemKind(i) === kind));
    const entries = sorted.map((item) => ({ item, tone: toneAt(position++) }));
    return { kind, label, entries };
  }).filter((g) => g.entries.length > 0);
}

/** Nome do item no resumo do total: o mesmo título grande do bilhete. */
export function itemLabel(item: QuoteItem): string {
  return item.title.trim() || item.provider.trim();
}

/** Itens do resumo do total na mesma ordem e com o mesmo nome dos bilhetes acima. */
export function totalLines(items: readonly QuoteItem[]): { label: string; total: number }[] {
  return groupQuoteItems(items).flatMap((g) => g.entries.map(({ item }) => ({ label: itemLabel(item), total: item.total })));
}
