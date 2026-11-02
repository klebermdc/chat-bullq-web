import type { ProposalDetails } from '@/features/proposals/types';
import type { QuoteItem } from '../types';
import { formatDateTimeShort, formatQuoteMoney, formatQuoteNumber } from './quote-format';
import { describeQuoteTracking, type QuoteTrackingSource } from './quote-tracking';

/** Cotações por link nas listas: página "Cotações" e card do cliente. */

const QUOTE_KIND = 'QUOTE';
const VISIBLE_PRODUCTS = 2;
const NO_NAME = 'Cliente sem nome';

export interface QuoteRowSource extends QuoteTrackingSource {
  totalValue: string | number;
  currency: string;
  details?: ProposalDetails | null;
  /** Só na busca da página "Cotações". */
  contact?: { name: string | null; phone: string | null } | null;
  sellerName?: string | null;
}

export interface QuoteRow {
  number: string | null;
  customer: string;
  phone: string | null;
  total: string | null;
  createdAt: string | null;
  products: string;
  seller: string | null;
  updated: string | null;
  opened: string;
  hasOpened: boolean;
  expiry: string | null;
  isExpired: boolean;
  url: string | null;
}

/** "Blue Tree · Magic Kingdom +2": hotel pelo nome, o resto pelo título. */
export function quoteProducts(items: readonly Pick<QuoteItem, 'title' | 'hotelName' | 'hotel'>[] | undefined): string {
  if (!items) return '';
  const names = items.map((item) => item.hotel?.name ?? item.hotelName ?? item.title);
  const hidden = names.length - VISIBLE_PRODUCTS;
  return names.slice(0, VISIBLE_PRODUCTS).join(' · ') + (hidden > 0 ? ` +${hidden}` : '');
}

export function quoteRow(source: QuoteRowSource, now: Date): QuoteRow {
  const t = describeQuoteTracking(source, now);
  return {
    number: source.quoteNumber ? `nº ${formatQuoteNumber(source.quoteNumber)}` : null,
    customer: source.details?.customerName?.trim() || source.contact?.name?.trim() || NO_NAME,
    phone: source.contact?.phone ?? null,
    total: formatQuoteMoney(Number(source.totalValue), source.currency),
    createdAt: formatDateTimeShort(source.createdAt),
    products: quoteProducts(source.details?.quote?.items),
    seller: source.sellerName ?? null,
    updated: t.updated,
    opened: t.opened,
    hasOpened: t.hasOpened,
    expiry: t.expiry,
    isExpired: t.isExpired,
    url: t.url,
  };
}

/** Só as cotações por link, tirando a que já está na tela. */
export function quotesOf<T extends { id: string; kind?: string | null }>(list: readonly T[] | undefined, exceptId?: string): T[] {
  return (list ?? []).filter((p) => p.kind === QUOTE_KIND && p.id !== exceptId);
}

export function pageCount(total: number, limit: number): number {
  return Math.max(1, Math.ceil(total / limit));
}
