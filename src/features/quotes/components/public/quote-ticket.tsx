import type { TicketTone } from '../../lib/quote-blocks';
import { formatDayLong, formatQuoteMoney, plural } from '../../lib/quote-format';
import type { QuoteItem } from '../../types';
import { QuoteHotelCard } from './quote-hotel-card';
import { TealBandArt, VioletBandArt } from './quote-sky';

interface Props {
  item: QuoteItem;
  tone: TicketTone;
  currency: string;
  showPrices: boolean;
}

function TicketPrices({ item, currency }: { item: QuoteItem; currency: string }) {
  return (
    <>
      <div className="qt-perf" />
      <div className="qt-t-foot">
        <div className="qt-row total">
          <span>Total do item</span>
          <b className="qt-num">{formatQuoteMoney(item.total, currency)}</b>
        </div>
      </div>
    </>
  );
}

/** Um item da cotação como bilhete: faixa colorida, texto e picote com o preço. */
export function QuoteTicket({ item, tone, currency, showPrices }: Props) {
  const date = formatDayLong(item.startDate, item.endDate);
  const provider = item.provider.trim();
  const description = item.description?.trim();
  return (
    <article className={`qt-ticket ${tone}`}>
      <div className={`qt-band ${tone}${date ? '' : ' is-plain'}`}>
        {tone === 'teal' ? <TealBandArt /> : <VioletBandArt />}
        {date && <span className="qt-date-chip">{date}</span>}
      </div>
      <div className="qt-t-body">
        {provider && <p className="qt-brand">{provider}</p>}
        <h3>{item.title}</h3>
        {description && <p className="qt-desc">{description}</p>}
        {item.hotel && <QuoteHotelCard hotel={item.hotel} />}
        {(item.adults > 0 || item.children > 0) && (
          <div className="qt-chips">
            {item.adults > 0 && <span className="qt-chip">{plural(item.adults, 'adulto', 'adultos')}</span>}
            {item.children > 0 && <span className="qt-chip">{plural(item.children, 'criança', 'crianças')}</span>}
          </div>
        )}
      </div>
      {showPrices && <TicketPrices item={item} currency={currency} />}
    </article>
  );
}
