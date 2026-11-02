import { PhoneIcon } from './quote-icons';
import { initials } from './quote-seller';

interface Props {
  link: string;
  sellerName: string;
  sellerFirstName: string | null;
  customerFirstName: string | null;
}

/** Balão do consultor no fim da cotação: leva ao WhatsApp dele para combinar a chamada. */
export function QuoteCallBubble({ link, sellerName, sellerFirstName, customerFirstName }: Props) {
  const question = customerFirstName ? `${customerFirstName}, vamos conversar sobre a sua cotação?` : 'Vamos conversar sobre a sua cotação?';
  return (
    <section className="qt-call" aria-label="Agendar uma chamada com o consultor">
      <div className="qt-avatar" aria-hidden="true">
        {initials(sellerName)}
      </div>
      <div className="qt-call-bubble">
        <strong>{question}</strong>
        <p>Agende uma chamada comigo: passo por tudo com você e ajusto o que precisar.</p>
        <a className="qt-call-btn" href={link} target="_blank" rel="noopener noreferrer">
          <PhoneIcon />
          {sellerFirstName ? `Agendar chamada com ${sellerFirstName}` : 'Agendar uma chamada'}
        </a>
      </div>
    </section>
  );
}
