'use client';

import { Plus, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  MAX_QUOTE_ITEMS,
  QUOTE_LIMITS,
  addDraftItem,
  removeDraftItem,
  updateDraftItem,
  type QuoteDraft,
  type QuoteDraftItem,
} from '../../lib/quote-draft';
import type { QuoteValidityHours } from '../../types';
import { ChoiceGroup, TextField } from './editor-field';
import { QuoteItemFields } from './quote-item-fields';
import { QuoteTotalsFields } from './quote-totals-fields';

interface Props {
  draft: QuoteDraft;
  currency: string;
  disabled: boolean;
  onChange: (next: QuoteDraft) => void;
  nextKey: () => string;
}

const VALIDITY_OPTIONS: { value: QuoteValidityHours; label: string }[] = [
  { value: 24, label: '24 horas' },
  { value: 48, label: '48 horas' },
  { value: 168, label: '7 dias' },
];

/**
 * Conferência da cotação por link. A leitura dos prints é feita por IA e já
 * errou (datas, diárias, itens inventados): nada vai ao cliente antes de o
 * atendente comparar com a imagem. O que estiver aqui é o que a página mostra.
 */
export function QuoteEditor({ draft, currency, disabled, onChange, nextKey }: Props) {
  const changeItem = (key: string, patch: Partial<Omit<QuoteDraftItem, 'key'>>) =>
    onChange(updateDraftItem(draft, key, patch));
  const canAdd = draft.items.length < MAX_QUOTE_ITEMS;
  return (
    <section aria-labelledby="quote-editor-title" className="space-y-3 rounded-lg border border-border bg-warning-wash px-3 py-3">
      <div>
        <h3 id="quote-editor-title" className="flex items-center gap-1.5 text-sm font-semibold text-warning-ink">
          <TriangleAlert aria-hidden="true" className="h-4 w-4 shrink-0" />
          Confira antes de enviar
        </h3>
        <p className="mt-1 text-xs text-warning-ink">
          Foi isto que eu li dos prints. Compare com as imagens e corrija o que precisar: é isto que o cliente vê na
          página. Nada foi enviado ainda.
        </p>
      </div>

      <TextField
        id="quote-customer-name"
        label="Nome do cliente (como chamar na página)"
        value={draft.customerName}
        disabled={disabled}
        maxLength={QUOTE_LIMITS.customerName}
        onChange={(customerName) => onChange({ ...draft, customerName })}
      />

      {draft.items.map((item, index) => (
        <QuoteItemFields
          key={item.key}
          item={item}
          index={index}
          disabled={disabled}
          canRemove={draft.items.length > 1}
          onChange={changeItem}
          onRemove={(key) => onChange(removeDraftItem(draft, key))}
        />
      ))}

      <Button
        type="button"
        variant="outline"
        disabled={disabled || !canAdd}
        onClick={() => onChange(addDraftItem(draft, nextKey))}
        className="min-h-10 w-full"
      >
        <Plus aria-hidden="true" className="h-4 w-4" />
        {canAdd ? 'Adicionar item' : `Máximo de ${MAX_QUOTE_ITEMS} itens`}
      </Button>

      <QuoteTotalsFields draft={draft} currency={currency} disabled={disabled} onChange={(patch) => onChange({ ...draft, ...patch })} />

      <ChoiceGroup
        labelId="quote-validity-label"
        label="Validade do link"
        value={draft.validityHours}
        options={VALIDITY_OPTIONS}
        disabled={disabled}
        onChange={(validityHours) => onChange({ ...draft, validityHours })}
      />
    </section>
  );
}
