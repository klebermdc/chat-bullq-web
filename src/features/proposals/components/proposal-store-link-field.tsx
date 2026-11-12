'use client';

import { Link2 } from 'lucide-react';
import { LABEL_CLS, TEXTAREA_CLS } from '@/features/quotes/components/editor/editor-field';
import { extractStoreLink, storeLinkIssue } from '../lib/store-link';

const FIELD_ID = 'proposal-store-link';
const HINT_ID = 'proposal-store-link-hint';
const ERROR_ID = 'proposal-store-link-error';
/** O texto copiado da loja vem com a lista de produtos: cabe folgado. */
const MAX_PASTE = 4000;

interface Props {
  value: string;
  disabled: boolean;
  /** Já tem print anexado: um caminho de cada vez. */
  isBlockedByPrints: boolean;
  onChange: (value: string) => void;
}

/**
 * Link do carrinho da Just Travel. O atendente cola o texto inteiro da loja;
 * só o link de checkout é usado e a API lê os itens dele, sem IA.
 */
export function ProposalStoreLinkField({ value, disabled, isBlockedByPrints, onChange }: Props) {
  const issue = storeLinkIssue(value);
  const link = extractStoreLink(value);
  const showFound = link !== null && link !== value.trim();
  return (
    <div>
      <label htmlFor={FIELD_ID} className={LABEL_CLS}>
        Link da Just Travel (carrinho da loja)
      </label>
      <textarea
        id={FIELD_ID}
        rows={2}
        value={value}
        disabled={disabled || isBlockedByPrints}
        maxLength={MAX_PASTE}
        spellCheck={false}
        autoComplete="off"
        placeholder="https://reservas.orlandofastpass.com.br/pt/checkout/…"
        aria-invalid={issue ? true : undefined}
        aria-describedby={issue ? `${HINT_ID} ${ERROR_ID}` : HINT_ID}
        onChange={(e) => onChange(e.target.value)}
        className={TEXTAREA_CLS}
      />
      <p id={HINT_ID} className="mt-1 text-xs text-muted-foreground">
        {isBlockedByPrints
          ? 'Para usar o link da loja, tire os prints anexados abaixo.'
          : 'Pode colar o texto todo copiado da loja: eu pego só o link e leio os itens dele. Com o link, os prints ficam de fora.'}
      </p>
      {showFound && (
        <p className="mt-1 flex min-w-0 items-center gap-1 text-xs text-success-ink">
          <Link2 aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">Link encontrado: {link}</span>
        </p>
      )}
      {issue && (
        <p id={ERROR_ID} className="mt-1 text-xs font-medium text-urgent-ink">
          {issue}
        </p>
      )}
    </div>
  );
}
