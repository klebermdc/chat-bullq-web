import type { PublicQuoteView, QuoteInstallments, QuoteItem } from '../types';
import { daysUntil, parseCalendarDay } from './quote-format';
import { quoteContactLinks, type QuoteContactLinks } from './whatsapp-link';

/**
 * Decide o que a página pública mostra. Regra do dono: bloco sem dado SOME —
 * nada de placeholder, "R$ 0" ou "a confirmar" na frente do cliente.
 */

export type TicketTone = 'teal' | 'violet';

export interface QuoteTicketEntry {
  item: QuoteItem;
  tone: TicketTone;
}

const TONES: TicketTone[] = ['teal', 'violet'];
const DAY_MS = 86_400_000;

function serialToIso(serial: number): string {
  return new Date(serial * DAY_MS).toISOString().slice(0, 10);
}

/** Por data de início; itens sem data vão para o fim, na ordem original. */
export function sortItemsByDate(items: readonly QuoteItem[]): QuoteItem[] {
  const key = (i: QuoteItem) => parseCalendarDay(i.startDate)?.serial ?? Number.POSITIVE_INFINITY;
  return [...items].sort((a, b) => key(a) - key(b));
}

function itemEndSerial(item: QuoteItem): number | null {
  const start = parseCalendarDay(item.startDate);
  if (!start) return null;
  const end = parseCalendarDay(item.endDate);
  return Math.max(start.serial, end?.serial ?? start.serial);
}

/** Bilhetes por data, alternando as cores. */
export function buildTickets(items: readonly QuoteItem[]): QuoteTicketEntry[] {
  return sortItemsByDate(items).map((item, index) => ({ item, tone: TONES[index % TONES.length] }));
}

function cleanText(text: string | null | undefined): string | null {
  const trimmed = text?.trim();
  return trimmed ? trimmed : null;
}

function tripRange(items: readonly QuoteItem[]) {
  const starts = items.map((i) => parseCalendarDay(i.startDate)?.serial).filter((s): s is number => s !== undefined);
  const ends = items.map(itemEndSerial).filter((s): s is number => s !== null);
  if (starts.length === 0) return null;
  return { startDate: serialToIso(Math.min(...starts)), endDate: serialToIso(Math.max(...ends)) };
}

export interface QuotePresentation {
  isExpired: boolean;
  showPrices: boolean;
  countdownDays: number | null;
  tripRange: { startDate: string; endDate: string } | null;
  people: { adults: number; children: number };
  tickets: QuoteTicketEntry[];
  payment: { pixTotal: number | null; installments: QuoteInstallments | null } | null;
  notes: string | null;
  contact: QuoteContactLinks | null;
}

export function presentQuote(view: PublicQuoteView, now: Date): QuotePresentation {
  const { quote } = view;
  const isExpired = view.status === 'EXPIRED';
  const range = tripRange(quote.items);
  const days = range && !isExpired ? daysUntil(range.startDate, now) : null;
  const hasPayment = quote.pixTotal !== null || quote.installments !== null;
  return {
    isExpired,
    showPrices: !isExpired,
    countdownDays: days !== null && days > 0 ? days : null,
    tripRange: range,
    people: {
      adults: Math.max(0, ...quote.items.map((i) => i.adults)),
      children: Math.max(0, ...quote.items.map((i) => i.children)),
    },
    tickets: buildTickets(quote.items),
    payment: hasPayment && !isExpired ? { pixTotal: quote.pixTotal, installments: quote.installments } : null,
    notes: cleanText(quote.notes),
    contact: quoteContactLinks(view),
  };
}
