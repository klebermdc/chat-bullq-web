'use client';

import { Check, Scale } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatQuoteMoney } from '../../lib/quote-format';
import { installmentValue } from '../../lib/quote-draft';
import {
  SUPPLIER_LABEL,
  compareSuppliers,
  offerInstallmentsCount,
  type Supplier,
  type SupplierCompareState,
  type SupplierPick,
} from '../../lib/supplier-compare';
import type { StoreOffer } from '../../types';
import { TextField } from './editor-field';

type PickKey = 'pixPick' | 'installmentsPick';

interface OptionProps {
  label: string;
  supplier: Supplier;
  pick: SupplierPick;
  currency: string;
  disabled: boolean;
  onPick: (supplier: Supplier) => void;
}

/** Um valor de um fornecedor: clicar faz dele o que vai ao cliente. */
function ValueOption({ label, supplier, pick, currency, disabled, onPick }: OptionProps) {
  const value = supplier === 'JUST_TRAVEL' ? pick.justTravel : pick.azul;
  const formatted = formatQuoteMoney(value, currency);
  const isChosen = pick.chosen === supplier;
  return (
    <button
      type="button"
      aria-pressed={isChosen}
      aria-label={`Usar o ${label} da ${SUPPLIER_LABEL[supplier]}${formatted ? ` (${formatted})` : ''}`}
      disabled={disabled || value === null}
      onClick={() => onPick(supplier)}
      className={cn(
        'flex min-h-10 w-full items-center justify-between gap-2 rounded-md border px-2.5 text-left text-xs transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50',
        isChosen ? 'border-success-ink/40 bg-success-wash text-success-ink' : 'border-border bg-background hover:bg-muted',
      )}
    >
      <span className="font-medium">{label}</span>
      <span className="inline-flex items-center gap-1 tabular-nums">
        {formatted ?? '—'}
        {isChosen && <Check aria-hidden="true" className="h-3.5 w-3.5" />}
      </span>
    </button>
  );
}

interface Props {
  offer: StoreOffer;
  value: SupplierCompareState;
  currency: string;
  disabled: boolean;
  onChange: (next: SupplierCompareState) => void;
}

/**
 * "Comparar fornecedores" — só o atendente vê. Just Travel (carrinho da loja)
 * contra Azul (o atendente digita o 10x do print): o menor Pix e o menor 10x
 * vão para os totais abaixo. O nome do fornecedor nunca vai ao cliente.
 */
export function QuoteSupplierCompare({ offer, value, currency, disabled, onChange }: Props) {
  const comparison = compareSuppliers(offer, value);
  const count = offerInstallmentsCount(offer);
  const countLabel = `${count}x`;
  const choose = (key: PickKey) => (supplier: Supplier) => onChange({ ...value, [key]: supplier });
  const option = (label: string, supplier: Supplier, key: PickKey, pick: SupplierPick) => (
    <ValueOption label={label} supplier={supplier} pick={pick} currency={currency} disabled={disabled} onPick={choose(key)} />
  );
  const { pix, installments } = comparison;
  const perInstallment = installments.value !== null ? formatQuoteMoney(installmentValue(installments.value, count), currency) : null;
  return (
    <section aria-labelledby="quote-supplier-compare-title" className="space-y-2.5 rounded-lg border border-border bg-card px-3 py-3">
      <div>
        <h4 id="quote-supplier-compare-title" className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <Scale aria-hidden="true" className="h-4 w-4 shrink-0" />
          Comparar fornecedores
        </h4>
        <p className="mt-0.5 text-xs text-muted-foreground">
          O menor Pix e o menor {countLabel} vão para os totais. Clique num valor para trocar. O cliente não vê o nome do fornecedor.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-foreground">Just Travel</p>
          {option('Pix', 'JUST_TRAVEL', 'pixPick', pix)}
          {option(countLabel, 'JUST_TRAVEL', 'installmentsPick', installments)}
        </div>
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-foreground">Azul</p>
          <TextField
            id="quote-azul-installments"
            inputMode="decimal"
            label={`Total em ${countLabel} na Azul`}
            value={value.azulInstallmentsTotal}
            disabled={disabled}
            onChange={(azulInstallmentsTotal) => onChange({ ...value, azulInstallmentsTotal })}
          />
          <TextField
            id="quote-azul-pix"
            inputMode="decimal"
            label="Pix na Azul (opcional)"
            value={value.azulPixTotal}
            disabled={disabled}
            onChange={(azulPixTotal) => onChange({ ...value, azulPixTotal })}
          />
          {option('Pix', 'AZUL', 'pixPick', pix)}
          {option(countLabel, 'AZUL', 'installmentsPick', installments)}
        </div>
      </div>

      <div aria-live="polite" className="space-y-0.5 rounded-md bg-success-wash px-2.5 py-2 text-xs text-success-ink">
        {pix.chosen && (
          <p>
            ✓ Pix: {formatQuoteMoney(pix.value, currency)} · {SUPPLIER_LABEL[pix.chosen]}
          </p>
        )}
        {installments.chosen && (
          <p>
            ✓ {countLabel}: {formatQuoteMoney(installments.value, currency)} · {SUPPLIER_LABEL[installments.chosen]}
            {perInstallment && ` (${countLabel} de ${perInstallment})`}
          </p>
        )}
        {!pix.chosen && !installments.chosen && <p>Sem preço para comparar ainda.</p>}
      </div>
    </section>
  );
}
