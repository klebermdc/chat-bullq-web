'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { controlCls } from '@/components/ui/control';
import { cn } from '@/lib/utils';

type SupplierChipsInputProps = {
  value: string[];
  onChange: (suppliers: string[]) => void;
  disabled?: boolean;
};

/**
 * Fornecedor não tem uma lista fechada conhecida (ao contrário de
 * categoria) — a API não expõe os valores distintos hoje em uso. Por isso
 * é texto livre em vez de chips fixos: o operador digita o nome do
 * fornecedor (ex.: "Just Travel") e adiciona.
 */
export function SupplierChipsInput({ value, onChange, disabled }: SupplierChipsInputProps) {
  const [draft, setDraft] = useState('');

  const add = () => {
    const trimmed = draft.trim();
    if (!trimmed || value.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      setDraft('');
      return;
    }
    onChange([...value, trimmed]);
    setDraft('');
  };

  const remove = (supplier: string) => onChange(value.filter((s) => s !== supplier));

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <label htmlFor="audience-supplier-input" className="sr-only">
          Nome do fornecedor
        </label>
        <input
          id="audience-supplier-input"
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          disabled={disabled}
          placeholder="Ex.: Just Travel"
          className={cn(controlCls, 'min-w-0 flex-1')}
        />
        <Button
          type="button"
          variant="outline"
          onClick={add}
          disabled={disabled || !draft.trim()}
          className="shrink-0"
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          Adicionar
        </Button>
      </div>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((supplier) => (
            <span
              key={supplier}
              className="inline-flex max-w-full items-center gap-1 rounded-full bg-muted py-0.5 pl-2.5 pr-0.5 text-xs font-medium text-foreground"
            >
              <span className="truncate">{supplier}</span>
              <button
                type="button"
                onClick={() => remove(supplier)}
                disabled={disabled}
                aria-label={`Remover fornecedor ${supplier}`}
                title={`Remover fornecedor ${supplier}`}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background hover:text-foreground disabled:opacity-50"
              >
                <X aria-hidden="true" className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
