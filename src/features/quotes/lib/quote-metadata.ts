import type { PublicQuoteView } from '../types';
import { sortItemsByDate } from './quote-blocks';
import { firstName, formatDateTimeShort, formatDayCompact, plural } from './quote-format';

const FALLBACK_COMPANY = 'Orlando Fast Pass';

/** Título da aba e da prévia do WhatsApp. */
export function quoteMetaTitle(view: PublicQuoteView): string {
  const company = view.company?.name ?? FALLBACK_COMPANY;
  const name = firstName(view.customerName);
  return name ? `Cotação para ${name} · ${company}` : `Sua cotação · ${company}`;
}

function tripDates(view: PublicQuoteView): string | null {
  const dated = sortItemsByDate(view.quote.items).filter((i) => i.startDate);
  if (dated.length === 0) return null;
  const ends = dated.map((i) => i.endDate ?? i.startDate ?? '').sort();
  return formatDayCompact(dated[0].startDate, ends[ends.length - 1]);
}

/** "{n} itens · {datas} · válida até {dd/mm HH:mm}" — partes sem dado somem. */
export function quoteMetaDescription(view: PublicQuoteView): string {
  const until = formatDateTimeShort(view.expiresAt);
  const validity = view.status === 'EXPIRED' ? 'cotação vencida' : until ? `válida até ${until}` : null;
  return [plural(view.quote.items.length, 'item', 'itens'), tripDates(view), validity]
    .filter((p): p is string => Boolean(p))
    .join(' · ');
}
