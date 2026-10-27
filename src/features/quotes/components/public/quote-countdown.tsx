import { formatDayLong } from '../../lib/quote-format';

interface Props {
  days: number;
  startDate: string;
}

/** Contagem até o primeiro dia da viagem. Só aparece com data futura. */
export function QuoteCountdown({ days, startDate }: Props) {
  const when = formatDayLong(startDate, startDate);
  return (
    <section className="qt-count" aria-label="Contagem regressiva">
      <div className="qt-count-days">
        <b className="qt-num">{days}</b>
        <span>{days === 1 ? 'dia' : 'dias'}</span>
      </div>
      <div>
        <h2>para a sua viagem começar</h2>
        {when && <p>O primeiro dia é {when.charAt(0).toLowerCase() + when.slice(1)}</p>}
      </div>
    </section>
  );
}

interface ExpiredProps {
  expiredAt: string | null;
  sellerFirstName: string | null;
}

/** No lugar da contagem quando a cotação venceu. */
export function QuoteExpiredNotice({ expiredAt, sellerFirstName }: ExpiredProps) {
  const who = sellerFirstName ?? 'a gente';
  return (
    <section className="qt-count qt-expired" aria-label="Cotação vencida">
      <h2>Os valores precisam ser atualizados</h2>
      <p>
        {expiredAt ? `Esta cotação venceu em ${expiredAt}. ` : 'Esta cotação venceu. '}
        Fale com {who} para atualizar os valores.
      </p>
    </section>
  );
}
