import type { CountdownTarget } from '../../lib/quote-blocks';
import { formatDayLong } from '../../lib/quote-format';

interface Props {
  days: number;
  target: CountdownTarget;
}

/** "8 de dezembro de 2026" — sem o dia da semana. */
function dateWithoutWeekday(iso: string): string | null {
  return formatDayLong(iso, iso)?.replace(/^[^,]+, /, '') ?? null;
}

/** Contagem até o primeiro parque (ou o primeiro dia da viagem). Só aparece com data futura. */
export function QuoteCountdown({ days, target }: Props) {
  const when = dateWithoutWeekday(target.date);
  const lead = target.isFirstPark ? 'Primeiro parque em' : 'A viagem começa em';
  return (
    <section className="qt-count" aria-label="Contagem regressiva">
      <div className="qt-count-days">
        <b className="qt-num">{days}</b>
        <span>{days === 1 ? 'dia' : 'dias'}</span>
      </div>
      <div>
        <h2>para a sua viagem começar</h2>
        {when && <p>{lead} {when}</p>}
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
