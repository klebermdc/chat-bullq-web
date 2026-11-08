import { normalize, operatorFromText } from '@/features/ticket-rules/lib/match-ticket-rule';
import type { QuoteItem } from '../types';

/** Que tipo de coisa é o item: ingresso de parque, hospedagem ou outro serviço. */
export type QuoteItemKind = 'tickets' | 'hotel' | 'other';

const HOTEL_WORDS = /\b(?:hotel|hoteis|hospedagem|pousada)\b/;
const TICKET_WORDS = /\b(?:ingressos?|tickets?|passes?)\b/;

export function itemKind(item: QuoteItem): QuoteItemKind {
  const raw = `${item.provider} ${item.title}`;
  const text = normalize(raw);
  if (item.hotel || item.hotelName?.trim() || HOTEL_WORDS.test(text)) return 'hotel';
  if (operatorFromText(raw) || TICKET_WORDS.test(text)) return 'tickets';
  return 'other';
}
