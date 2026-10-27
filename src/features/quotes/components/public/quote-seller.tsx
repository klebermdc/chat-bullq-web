interface Props {
  sellerName: string;
  sellerFirstName: string | null;
  companyName: string;
  hours: string | null;
  hasWhatsApp: boolean;
  notes: string | null;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? [parts[0], parts[parts.length - 1]] : parts;
  return letters.map((p) => p.charAt(0).toLocaleUpperCase('pt-BR')).join('') || '?';
}

/** Cartão do vendedor e, se houver, o recado dele para o cliente. */
export function QuoteSeller({ sellerName, sellerFirstName, companyName, hours, hasWhatsApp, notes }: Props) {
  const name = sellerName.trim();
  return (
    <>
      {name && (
        <section className="qt-agent" aria-label="Seu consultor">
          <div className="qt-avatar" aria-hidden="true">
            {initials(name)}
          </div>
          <div>
            <small>Seu consultor na {companyName}</small>
            <b>{name}</b>
            {hasWhatsApp && <span>Responde pelo WhatsApp</span>}
            {hours && <span>Atendimento: {hours}</span>}
          </div>
        </section>
      )}
      {notes && (
        <section className="qt-note" aria-label="Recado do consultor">
          <strong>{sellerFirstName ? `Recado de ${sellerFirstName}` : 'Recado do consultor'}</strong>
          <p>{notes}</p>
        </section>
      )}
    </>
  );
}
