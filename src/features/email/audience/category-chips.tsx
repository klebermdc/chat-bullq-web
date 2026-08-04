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
            className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
              active
                ? 'border-transparent bg-primary text-primary-foreground'
                : 'border-zinc-300 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
