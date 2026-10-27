'use client';

import { Button } from '@/components/ui/button';
import { QUOTE_LIMITS, sumDraftItems, toMoneyInput, type QuoteDraft } from '../../lib/quote-draft';
import { formatQuoteMoney } from '../../lib/quote-format';
import { parseMoneyBR } from '@/lib/money';
import { TextAreaField, TextField } from './editor-field';

interface Props {
  draft: QuoteDraft;
  currency: string;
  disabled: boolean;
  onChange: (patch: Partial<QuoteDraft>) => void;
}

/** Total da reserva (com a soma dos itens como sugestão), Pix, parcelas e observação. */
export function QuoteTotalsFields({ draft, currency, disabled, onChange }: Props) {
  const sum = sumDraftItems(draft);
  const typed = parseMoneyBR(draft.total);
  const differs = sum > 0 && (typed === null || Math.round(typed * 100) !== Math.round(sum * 100));
  return (
    <div className="space-y-2.5">
      <div>
        <TextField id="quote-total" inputMode="decimal" label="Total da reserva" value={draft.total} disabled={disabled} onChange={(total) => onChange({ total })} />
        {differs && (
          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
            Soma dos itens: {formatQuoteMoney(sum, currency)}
            <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={() => onChange({ total: toMoneyInput(sum) })} className="min-h-9 text-primary">
              Usar a soma
            </Button>
          </p>
        )}
      </div>
      <TextField id="quote-pix" inputMode="decimal" label="À vista no Pix (opcional)" value={draft.pixTotal} disabled={disabled} onChange={(pixTotal) => onChange({ pixTotal })} />
      <div className="grid grid-cols-[5rem_1fr] gap-2">
        <TextField id="quote-installments-count" type="number" inputMode="numeric" label="Parcelas" value={draft.installmentsCount} disabled={disabled} onChange={(installmentsCount) => onChange({ installmentsCount })} />
        <TextField id="quote-installments-value" inputMode="decimal" label="Valor da parcela (opcional)" value={draft.installmentsValue} disabled={disabled} onChange={(installmentsValue) => onChange({ installmentsValue })} />
      </div>
      <TextAreaField id="quote-notes" label="Observação para o cliente (opcional)" value={draft.notes} disabled={disabled} onChange={(notes) => onChange({ notes })} maxLength={QUOTE_LIMITS.notes} rows={3} />
    </div>
  );
}
