'use client';

import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QUOTE_LIMITS, type QuoteDraftItem } from '../../lib/quote-draft';
import { TextAreaField, TextField } from './editor-field';

interface Props {
  item: QuoteDraftItem;
  index: number;
  disabled: boolean;
  canRemove: boolean;
  onChange: (key: string, patch: Partial<Omit<QuoteDraftItem, 'key'>>) => void;
  onRemove: (key: string) => void;
}

/** Os campos de um item da cotação, como lidos do print e editáveis. */
export function QuoteItemFields({ item, index, disabled, canRemove, onChange, onRemove }: Props) {
  const id = (field: string) => `quote-item-${item.key}-${field}`;
  const set = (field: keyof Omit<QuoteDraftItem, 'key'>) => (value: string) => onChange(item.key, { [field]: value });
  const label = `Item ${index + 1}`;
  return (
    <fieldset className="space-y-2.5 rounded-lg border border-border bg-card px-3 pb-3 pt-1">
      <div className="flex items-center justify-between gap-2">
        <legend className="float-left pt-2 text-sm font-semibold text-foreground">{label}</legend>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled || !canRemove}
          onClick={() => onRemove(item.key)}
          aria-label={`Remover ${label.toLowerCase()}`}
          className="mt-1 min-h-9"
        >
          <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
          Remover
        </Button>
      </div>
      <TextField id={id('provider')} label="Fornecedor" value={item.provider} disabled={disabled} onChange={set('provider')} maxLength={QUOTE_LIMITS.provider} placeholder="Ex.: Universal Orlando Resort" />
      <TextField id={id('title')} label="Produto" value={item.title} disabled={disabled} onChange={set('title')} maxLength={QUOTE_LIMITS.title} />
      <div className="grid grid-cols-2 gap-2">
        <TextField id={id('start')} type="date" label="Data inicial" value={item.startDate} disabled={disabled} onChange={set('startDate')} />
        <TextField id={id('end')} type="date" label="Data final" value={item.endDate} disabled={disabled} onChange={set('endDate')} />
        <TextField id={id('adults')} type="number" inputMode="numeric" label="Adultos" max={QUOTE_LIMITS.people} value={item.adults} disabled={disabled} onChange={set('adults')} />
        <TextField id={id('children')} type="number" inputMode="numeric" label="Crianças" max={QUOTE_LIMITS.people} value={item.children} disabled={disabled} onChange={set('children')} />
        <TextField id={id('price-adult')} inputMode="decimal" label="Preço por adulto" value={item.priceAdult} disabled={disabled} onChange={set('priceAdult')} placeholder="opcional" />
        <TextField id={id('price-child')} inputMode="decimal" label="Preço por criança" value={item.priceChild} disabled={disabled} onChange={set('priceChild')} placeholder="opcional" />
      </div>
      <TextField id={id('total')} inputMode="decimal" label="Total do item" value={item.total} disabled={disabled} onChange={set('total')} placeholder="Ex.: 9.289,31" />
      <TextAreaField id={id('description')} label="Descrição (o cliente lê na página)" value={item.description} disabled={disabled} onChange={set('description')} maxLength={QUOTE_LIMITS.description} />
      <TextAreaField id={id('cancel')} label="Regra de cancelamento" value={item.cancellationPolicy} disabled={disabled} onChange={set('cancellationPolicy')} maxLength={QUOTE_LIMITS.cancellationPolicy} />
    </fieldset>
  );
}
