import type { QuoteContactLinks } from '../../lib/whatsapp-link';
import { ChatIcon, DownloadIcon } from './quote-icons';

interface Props {
  contact: QuoteContactLinks | null;
  sellerFirstName: string | null;
  isExpired: boolean;
  pdfUrl: string | null;
}

function closeLabel(isExpired: boolean, sellerFirstName: string | null): string {
  if (isExpired) return sellerFirstName ? `Atualizar com ${sellerFirstName}` : 'Pedir valores atualizados';
  return sellerFirstName ? `Quero fechar com ${sellerFirstName}` : 'Quero fechar';
}

/** CTA dourado + secundários. Sem WhatsApp do vendedor, só o aviso de responder a mensagem. */
export function QuoteActions({ contact, sellerFirstName, isExpired, pdfUrl }: Props) {
  return (
    <div className="qt-actions">
      {contact ? (
        <a className="qt-cta" href={contact.close} target="_blank" rel="noopener noreferrer">
          <ChatIcon />
          {closeLabel(isExpired, sellerFirstName)}
        </a>
      ) : (
        <p className="qt-reply">Responda a mensagem no WhatsApp</p>
      )}
      {(pdfUrl || contact) && (
        <div className="qt-sec">
          {pdfUrl && (
            <a className="qt-btn2" href={pdfUrl} target="_blank" rel="noopener noreferrer">
              <DownloadIcon />
              Baixar PDF
            </a>
          )}
          {contact && (
            <a className="qt-btn2" href={contact.question} target="_blank" rel="noopener noreferrer">
              Tenho uma dúvida
            </a>
          )}
        </div>
      )}
    </div>
  );
}
