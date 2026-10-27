import type { QuotePresentation } from '../../lib/quote-blocks';
import { formatPeople, formatQuoteMoney } from '../../lib/quote-format';
import type { QuoteData } from '../../types';

interface Props {
  quote: QuoteData;
  people: QuotePresentation['people'];
  payment: QuotePresentation['payment'];
}

function PaymentBox({ payment, currency }: { payment: NonNullable<QuotePresentation['payment']>; currency: string }) {
  const pix = formatQuoteMoney(payment.pixTotal, currency);
  const parcel = payment.installments ? formatQuoteMoney(payment.installments.value, currency) : null;
  return (
    <div className="qt-pay">
      {pix && (
        <div>
          <span>No Pix, à vista</span>
          <b className="qt-num">{pix}</b>
        </div>
      )}
      {payment.installments && parcel && (
        <div>
          <span>No cartão</span>
          <b className="qt-num">
            {payment.installments.count}x de {parcel}
          </b>
        </div>
      )}
    </div>
  );
}

/** Cartão escuro do total: um valor por item, o total e as formas de pagamento. */
export function QuoteTotal({ quote, people, payment }: Props) {
  const per = formatPeople(people.adults, people.children);
  return (
    <section className="qt-sum qt-dark" aria-label="Total da reserva">
      {quote.items.length > 1 && (
        <>
          <ul className="qt-sum-lines">
            {quote.items.map((item, i) => (
              <li key={i}>
                <span>{item.provider.trim() || item.title}</span>
                <span className="qt-num">{formatQuoteMoney(item.total, quote.currency)}</span>
              </li>
            ))}
          </ul>
          <hr />
        </>
      )}
      <div>
        <p className="qt-sum-label">Total da reserva</p>
        <p className="qt-sum-big qt-num">{formatQuoteMoney(quote.total, quote.currency)}</p>
        {per && <p className="qt-sum-per">para {per}</p>}
      </div>
      {payment && <PaymentBox payment={payment} currency={quote.currency} />}
    </section>
  );
}
