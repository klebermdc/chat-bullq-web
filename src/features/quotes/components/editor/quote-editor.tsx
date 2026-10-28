'use client';

import { useRef } from 'react';
import { ImagePlus, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PRINT_ACCEPT_ATTR } from '@/features/proposals/lib/print-intake';
import {
  MAX_QUOTE_ITEMS,
  QUOTE_LIMITS,
  removeDraftItem,
  updateDraftItem,
  type QuoteDraft,
  type QuoteDraftItem,
} from '../../lib/quote-draft';
import { QUOTE_VALIDITY_HOURS } from '../../types';
import { TextField } from './editor-field';
import { QuoteItemFields } from './quote-item-fields';
import { QuoteTotalsFields } from './quote-totals-fields';

interface Props {
  draft: QuoteDraft;
  currency: string;
  disabled: boolean;
  onChange: (next: QuoteDraft) => void;
  /** Lê mais prints e junta os itens deles a esta cotação. Sem ele, o botão some. */
  onAddByPrint?: (files: File[]) => void;
  /** Ainda cabe print na proposta (o limite é de prints, não só de itens). */
  canAddPrints?: boolean;
  /** review = cotação lida agora dos prints; update = cotação já enviada ao cliente. */
  mode?: 'review' | 'update';
}

const INTRO = {
  review: {
    title: 'Confira antes de enviar',
    text:
      'Foi isto que eu li dos prints. Compare com as imagens e corrija o que precisar: é isto que o cliente vê na ' +
      'página. Nada foi enviado ainda.',
  },
  update: {
    title: 'Mude só o que mudou',
    text:
      'Esta é a cotação que o cliente já recebeu. Ao salvar, o link continua o mesmo, a página passa a mostrar os ' +
      'valores novos e a validade recomeça a contar a partir de agora.',
  },
} as const;

/**
 * Conferência da cotação por link. A leitura dos prints é feita por IA e já
 * errou (datas, diárias, itens inventados): nada vai ao cliente antes de o
 * atendente comparar com a imagem. O que estiver aqui é o que a página mostra.
 */
export function QuoteEditor({ draft, currency, disabled, onChange, onAddByPrint, canAddPrints = false, mode = 'review' }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const changeItem = (key: string, patch: Partial<Omit<QuoteDraftItem, 'key'>>) =>
    onChange(updateDraftItem(draft, key, patch));
  const canAdd = draft.items.length < MAX_QUOTE_ITEMS && canAddPrints;
  const intro = INTRO[mode];
  return (
    <section aria-labelledby="quote-editor-title" className="space-y-3 rounded-lg border border-border bg-warning-wash px-3 py-3">
      <div>
        <h3 id="quote-editor-title" className="flex items-center gap-1.5 text-sm font-semibold text-warning-ink">
          <TriangleAlert aria-hidden="true" className="h-4 w-4 shrink-0" />
          {intro.title}
        </h3>
        <p className="mt-1 text-xs text-warning-ink">{intro.text}</p>
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

      {onAddByPrint && (
        <>
          <input
            ref={fileRef}
            type="file"
            accept={PRINT_ACCEPT_ATTR}
            multiple
            hidden
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              e.target.value = '';
              if (files.length > 0) onAddByPrint(files);
            }}
          />
          <Button
            type="button"
            variant="outline"
            disabled={disabled || !canAdd}
            onClick={() => fileRef.current?.click()}
            className="min-h-10 w-full"
          >
            <ImagePlus aria-hidden="true" className="h-4 w-4" />
            {canAdd ? 'Adicionar item por print' : 'Limite de itens ou de prints atingido'}
          </Button>
          <p className="-mt-1 text-xs text-muted-foreground">
            Escolha, cole (Ctrl+V) ou arraste o print de outro produto: eu leio e junto os itens aqui, e o total vira a soma.
          </p>
        </>
      )}

      <QuoteTotalsFields draft={draft} currency={currency} disabled={disabled} onChange={(patch) => onChange({ ...draft, ...patch })} />

      <p className="text-xs text-muted-foreground">
        A cotação vale {QUOTE_VALIDITY_HOURS} horas. A página avisa o cliente que o câmbio do dólar pode mudar os
        valores e mostra a política de cancelamento da Orlando Fast Pass.
      </p>
    </section>
  );
}
