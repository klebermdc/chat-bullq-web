import { ChevronIcon } from './quote-icons';

interface Props {
  policies: { label: string; text: string }[];
}

/** "Posso cancelar ou mudar a data?" — só com as regras que vieram do fornecedor. */
export function QuotePolicies({ policies }: Props) {
  if (policies.length === 0) return null;
  const single = policies.length === 1;
  return (
    <details className="qt-policy">
      <summary>
        Posso cancelar ou mudar a data?
        <ChevronIcon />
      </summary>
      <div className="qt-policy-in">
        {policies.map((p, i) => (
          <p key={i}>
            {!single && <b>{p.label}: </b>}
            {p.text}
          </p>
        ))}
        <p>Antes de fechar, seu consultor revisa as regras com você.</p>
      </div>
    </details>
  );
}
