'use client';

import { Button } from '@/components/ui/button';
import {
  MAX_QUOTE_INSTALLMENTS,
  QUOTE_LIMITS,
  installmentValue,
  sumDraftItems,
  toMoneyInput,
  type QuoteDraft,
} from '../../lib/quote-draft';
import { formatQuoteMoney } from '../../lib/quote-format';
import { parseMoneyBR } from '@/lib/money';
import { INPUT_CLS, LABEL_CLS, TextAreaField, TextField } from './editor-field';

const COUNTS = Array.from({ length: MAX_QUOTE_INSTALLMENTS }, (_, i) => MAX_QUOTE_INSTALLMENTS - i);

interface InstallmentsProps {
  total: number | null;
  currency: string;
  value: string;
  disabled: boolean;
  onChange: (installmentsCount: string) => void;
}

/** Parcelas no cartão: só o número; o valor sai do total da reserva. */
function InstallmentsSelect({ total, currency, value, disabled, onChange }: InstallmentsProps) {
  const label = (count: number) =>
    total !== null && total > 0 ? `${count}x de ${formatQuoteMoney(installmentValue(total, count), currency)}` : `${count}x`;
  return (
    <div>
      <label htmlFor="quote-installments" className={LABEL_CLS}>
        Parcelamento no cartão
      </label>
      <select id="quote-installments" value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} className={INPUT_CLS}>
        {COUNTS.map((count) => (
          <option key={count} value={String(count)}>
            {label(count)}
          </option>
        ))}
        <option value="">Não parcelar</option>
      </select>
    </div>
  );
}

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
      <InstallmentsSelect
        total={typed}
        currency={currency}
        value={draft.installmentsCount}
        disabled={disabled}
        onChange={(installmentsCount) => onChange({ installmentsCount })}
      />
      <TextAreaField id="quote-notes" label="Observação para o cliente (opcional)" value={draft.notes} disabled={disabled} onChange={(notes) => onChange({ notes })} maxLength={QUOTE_LIMITS.notes} rows={3} />
    </div>
  );
}
