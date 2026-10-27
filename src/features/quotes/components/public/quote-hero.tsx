import Image from 'next/image';
import { ClockIcon } from './quote-icons';
import { QuoteSky } from './quote-sky';

interface Props {
  customerFirstName: string | null;
  companyName: string;
  validUntil: string | null;
  isExpired: boolean;
  /** true quando um cartão sobe por cima do fim do céu (contagem ou aviso). */
  hasOverlap: boolean;
}

/** Topo noturno: logo, validade, saudação e título. */
export function QuoteHero({ customerFirstName, companyName, validUntil, isExpired, hasOverlap }: Props) {
  return (
    <header className={`qt-hero qt-dark qt-gutter${hasOverlap ? '' : ' is-short'}`}>
      <QuoteSky />
      <div className="qt-hero-inner">
        <Image
          className="qt-logo"
          src="/cotacao/logo-branco.png"
          alt={companyName}
          width={368}
          height={193}
          priority
          unoptimized
        />
        {validUntil && (
          <span className="qt-pill">
            <ClockIcon size={14} color="#FFC23D" />
            {isExpired ? `Cotação vencida em ${validUntil}` : `Cotação válida até ${validUntil}`}
          </span>
        )}
        {customerFirstName && <p className="qt-hello">Olá, {customerFirstName}!</p>}
        {isExpired ? (
          <h1>Esta cotação venceu</h1>
        ) : (
          <>
            <h1>
              Sua viagem para Orlando está <em>prontinha</em>
            </h1>
            <p className="qt-lead">Separamos tudo com calma para você conferir cada detalhe.</p>
          </>
        )}
      </div>
    </header>
  );
}
