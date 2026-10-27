import type { QuoteTerms } from '../../types';
import { ChevronIcon } from './quote-icons';

interface Props {
  cancellation: QuoteTerms['cancellation'];
}

/** "Posso cancelar ou mudar a data?" — a política geral da Orlando Fast Pass, igual para toda cotação. */
export function QuotePolicies({ cancellation }: Props) {
  return (
    <details className="qt-policy">
      <summary>
        Posso cancelar ou mudar a data?
        <ChevronIcon />
      </summary>
      <div className="qt-policy-in">
        <p>
          <b>{cancellation.title}</b> · última revisão em {cancellation.revisedAt}
        </p>
        {cancellation.blocks.map((block, i) =>
          block.kind === 'p' ? (
            <p key={i}>{block.text}</p>
          ) : (
            <ul key={i}>
              {block.items.map((text, j) => (
                <li key={j}>{text}</li>
              ))}
            </ul>
          ),
        )}
      </div>
    </details>
  );
}
