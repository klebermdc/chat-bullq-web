'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';

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
          className="h-8 flex-1 min-w-[140px] rounded-md border border-zinc-300 bg-white px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
        />
        <button
          type="button"
          onClick={add}
          disabled={disabled || !draft.trim()}
          className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md border border-zinc-300 px-2.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          <Plus className="h-3.5 w-3.5" />
          Adicionar
        </button>
      </div>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((supplier) => (
            <span
              key={supplier}
              className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
            >
              {supplier}
              <button
                type="button"
                onClick={() => remove(supplier)}
                disabled={disabled}
                aria-label={`Remover fornecedor ${supplier}`}
                className="text-zinc-400 hover:text-zinc-600 disabled:opacity-50 dark:hover:text-zinc-200"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
