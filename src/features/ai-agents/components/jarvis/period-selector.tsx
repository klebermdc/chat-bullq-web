'use client';

import type { Period } from '../../services/ai-agents.service';

const OPTIONS: Array<{ value: Period; label: string }> = [
  { value: '24h', label: '24 h' },
  { value: '7d', label: '7 dias' },
  { value: '30d', label: '30 dias' },
];

interface Props {
  value: Period;
  onChange: (next: Period) => void;
}

export function PeriodSelector({ value, onChange }: Props) {
  return (
    <div role="group" aria-label="Período" className="inline-flex shrink-0 rounded-lg border border-border bg-card p-0.5">
      {OPTIONS.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(opt.value)}
            className={`min-h-8 rounded-md px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              active
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
