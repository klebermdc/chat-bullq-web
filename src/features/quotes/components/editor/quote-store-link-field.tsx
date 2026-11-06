'use client';

import { QUOTE_LIMITS } from '../../lib/quote-draft';
import { INPUT_CLS, LABEL_CLS } from './editor-field';

const FIELD_ID = 'quote-store-url';
const HINT_ID = 'quote-store-url-hint';

interface Props {
  value: string;
  disabled: boolean;
  onChange: (storeUrl: string) => void;
}

/**
 * Link da loja online, só para o atendente consultar depois. Não é
 * obrigatório e nunca aparece para o cliente (página, PDF ou WhatsApp).
 */
export function QuoteStoreLinkField({ value, disabled, onChange }: Props) {
  return (
    <div className="border-t border-border/60 pt-3">
      <label htmlFor={FIELD_ID} className={LABEL_CLS}>
        Link da loja online (opcional)
      </label>
      <input
        id={FIELD_ID}
        type="url"
        inputMode="url"
        autoComplete="off"
        spellCheck={false}
        value={value}
        disabled={disabled}
        maxLength={QUOTE_LIMITS.storeUrl}
        placeholder="https://"
        aria-describedby={HINT_ID}
        onChange={(e) => onChange(e.target.value)}
        className={INPUT_CLS}
      />
      <p id={HINT_ID} className="mt-1 text-xs text-muted-foreground">
        Caso você tenha um link da loja para esta cotação, coloque aqui. Fica só para a equipe consultar: o cliente não vê este link.
      </p>
    </div>
  );
}
