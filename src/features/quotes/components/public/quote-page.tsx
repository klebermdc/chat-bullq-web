import { QuoteCallBubble } from './quote-call-bubble';
import { QuotePromos } from './quote-promos';
import { presentQuote } from '../../lib/quote-blocks';
import { groupQuoteItems } from '../../lib/quote-groups';
import { QuoteGroupBalloon } from './quote-group-balloon';
import { firstName, formatDateBR, formatSentDate, formatValidUntil } from '../../lib/quote-format';
import type { PublicQuoteView } from '../../types';
import { QuoteActions } from './quote-actions';
import { QuoteCountdown, QuoteExpiredNotice } from './quote-countdown';
import { QuoteFacts } from './quote-facts';
import { QuoteFooter } from './quote-footer';
import { QuoteFootnotes } from './quote-footnotes';
import { QuoteHero } from './quote-hero';
import { QuotePolicies } from './quote-policies';
import { QuoteSeller } from './quote-seller';
import { QuoteTicket } from './quote-ticket';
import { QuoteTotal } from './quote-total';

export const FALLBACK_COMPANY_NAME = 'Orlando Fast Pass';

interface Props {
  view: PublicQuoteView;
  pdfUrl: string;
  now: Date;
}

/** A cotação inteira. Cada bloco some quando não há dado para ele. */
export function QuotePage({ view, pdfUrl, now }: Props) {
  const p = presentQuote(view, now);
  const { quote } = view;
  const sellerFirst = firstName(view.seller.name);
  const companyName = view.company?.name ?? FALLBACK_COMPANY_NAME;
  const validUntil = formatValidUntil(view.expiresAt, { withYear: true });
  return (
    <div className="qt-page">
      <QuoteHero
        customerFirstName={firstName(view.customerName)}
        companyName={companyName}
        sentDate={formatSentDate(view.createdAt, view.updatedAt)}
        isExpired={p.isExpired}
        hasOverlap={p.isExpired || p.countdownDays !== null}
      />
      <main className="qt-gutter">
        {p.isExpired && <QuoteExpiredNotice expiredAt={validUntil} sellerFirstName={sellerFirst} />}
        {p.countdownDays !== null && p.tripRange && (
          <QuoteCountdown days={p.countdownDays} startDate={p.tripRange.startDate} />
        )}
        <QuoteFacts
          people={p.people}
          tripRange={p.tripRange}
          total={p.showPrices ? quote.total : null}
          currency={quote.currency}
          itemCount={quote.items.length}
        />
        <QuotePromos ids={['planejador']} />
        <section className="qt-block" aria-labelledby="qt-h-items">
          <h2 id="qt-h-items">O que está na sua cotação</h2>
          {groupQuoteItems(quote.items).map((group) => (
            <div key={group.kind} className="qt-group-block">
              <QuoteGroupBalloon kind={group.kind} label={group.label} count={group.entries.length} />
              {group.entries.map((t, i) => (
                <QuoteTicket key={i} item={t.item} tone={t.tone} currency={quote.currency} showPrices={p.showPrices} />
              ))}
            </div>
          ))}
          {view.terms && <QuotePolicies cancellation={view.terms.cancellation} />}
        </section>
        {p.showPrices && (
          <QuoteTotal quote={quote} people={p.people} payment={p.payment} exchangeNotice={view.terms?.exchangeNotice ?? null} />
        )}
        <QuotePromos ids={['viagens']} />
        <QuoteSeller
          sellerName={view.seller.name}
          sellerFirstName={sellerFirst}
          companyName={companyName}
          hours={view.company?.hours ?? null}
          hasWhatsApp={p.contact !== null}
          notes={p.notes}
        />
        <QuoteActions
          contact={p.contact}
          sellerFirstName={sellerFirst}
          isExpired={p.isExpired}
          pdfUrl={p.isExpired ? null : pdfUrl}
        />
        {p.contact && !p.isExpired && (
          <QuoteCallBubble
            link={p.contact.call}
            sellerName={view.seller.name}
            sellerFirstName={sellerFirst}
            customerFirstName={firstName(view.customerName)}
          />
        )}
        {!p.isExpired && <QuoteFootnotes />}
      </main>
      <QuoteFooter company={view.company} companyName={companyName} code={view.code} createdAt={formatDateBR(view.createdAt)} />
    </div>
  );
}
