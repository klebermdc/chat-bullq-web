import { formatDateTimeShort, formatQuoteNumber, formatValidUntil } from './quote-format';

/**
 * "Cliente abriu" para o vendedor: quantas vezes a página foi aberta, quando
 * foi a última e se ainda vale. Os campos vêm de GET /proposals/conversation.
 */

export interface QuoteTrackingSource {
  id: string;
  kind?: string | null;
  createdAt: string;
  quoteUrl?: string | null;
  expiresAt?: string | null;
  viewCount?: number | null;
  firstViewedAt?: string | null;
  lastViewedAt?: string | null;
  quoteNumber?: number | null;
  quoteUpdatedAt?: string | null;
}

export interface QuoteTracking {
  /** "Cotação nº 0152" (ou o nome genérico numa API sem número). */
  title: string;
  /** "atualizada hoje 14:32"; null se nunca foi atualizada. */
  updated: string | null;
  opened: string;
  hasOpened: boolean;
  expiry: string | null;
  isExpired: boolean;
  url: string | null;
}

/** A lista do endpoint já vem da mais nova para a mais antiga. */
export function latestQuote<T extends QuoteTrackingSource>(list: readonly T[] | undefined): T | null {
  return list?.find((p) => p.kind === 'QUOTE') ?? null;
}

function lastViewLabel(iso: string, now: Date): string | null {
  const stamp = formatDateTimeShort(iso);
  if (!stamp) return null;
  const [day, time] = stamp.split(' ');
  const today = formatDateTimeShort(now.toISOString())?.split(' ')[0];
  return day === today ? `hoje ${time}` : stamp;
}

function openedLabel(source: QuoteTrackingSource, now: Date): string | null {
  const count = source.viewCount ?? 0;
  if (count <= 0) return null;
  const last = source.lastViewedAt ? lastViewLabel(source.lastViewedAt, now) : null;
  return last ? `aberta ${count}x · última ${last}` : `aberta ${count}x`;
}

export function describeQuoteTracking(source: QuoteTrackingSource, now: Date): QuoteTracking {
  const opened = openedLabel(source, now);
  const expiresAt = source.expiresAt ? new Date(source.expiresAt) : null;
  const validExpiry = expiresAt && !Number.isNaN(expiresAt.getTime()) ? expiresAt : null;
  const isExpired = validExpiry !== null && validExpiry.getTime() <= now.getTime();
  const until = source.expiresAt && !isExpired ? formatValidUntil(source.expiresAt) : null;
  const updatedAt = source.quoteUpdatedAt ? lastViewLabel(source.quoteUpdatedAt, now) : null;
  return {
    title: source.quoteNumber ? `Cotação nº ${formatQuoteNumber(source.quoteNumber)}` : 'Cotação por link',
    updated: updatedAt ? `atualizada ${updatedAt}` : null,
    opened: opened ?? 'ainda não abriu',
    hasOpened: opened !== null,
    expiry: isExpired ? 'vencida' : until ? `vence ${until}` : null,
    isExpired,
    url: source.quoteUrl?.trim() || null,
  };
}
