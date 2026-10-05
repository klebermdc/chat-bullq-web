'use client';

import { AUDIENCE_CATEGORY_OPTIONS } from './audience-categories';

type CategoryChipsProps = {
  selected: string[];
  onChange: (categories: string[]) => void;
  disabled?: boolean;
};

export function CategoryChips({ selected, onChange, disabled }: CategoryChipsProps) {
  const toggle = (value: string) => {
    if (disabled) return;
    onChange(selected.includes(value) ? selected.filter((c) => c !== value) : [...selected, value]);
  };

  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Categorias">
      {AUDIENCE_CATEGORY_OPTIONS.map((option) => {
        const active = selected.includes(option.value);
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => toggle(option.value)}
            disabled={disabled}
            className={`inline-flex min-h-8 items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
              active
                ? 'border-transparent bg-primary/10 text-primary ring-1 ring-primary/30'
                : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
