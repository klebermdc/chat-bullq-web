import { ClockIcon, LockIcon } from './quote-icons';

/** Letras miúdas: validade e por que não pedimos documentos agora. */
export function QuoteFootnotes({ validUntil }: { validUntil: string | null }) {
  return (
    <div className="qt-footnotes">
      {validUntil && (
        <p>
          <ClockIcon />
          Esta cotação vale até {validUntil}. Depois disso os valores podem mudar.
        </p>
      )}
      <p>
        <LockIcon />
        Nomes e documentos dos viajantes só são pedidos na hora de fechar.
      </p>
    </div>
  );
}
