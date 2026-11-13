'use client';

import { cn } from '@/lib/utils';

export type ShopperTab = 'visitas' | 'ranking' | 'numeros';

const TABS: Array<{ id: ShopperTab; label: string }> = [
  { id: 'visitas', label: 'Visitas' },
  { id: 'ranking', label: 'Ranking' },
  { id: 'numeros', label: 'Números' },
];

export function ShopperTabs({ value, onChange }: { value: ShopperTab; onChange: (tab: ShopperTab) => void }) {
  const move = (step: number) => {
    const index = TABS.findIndex((t) => t.id === value);
    onChange(TABS[(index + step + TABS.length) % TABS.length].id);
  };
  return (
    <div
      role="tablist"
      aria-label="Cliente oculto"
      className="flex w-fit gap-1 rounded-lg border border-border bg-card p-1"
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') move(1);
        if (e.key === 'ArrowLeft') move(-1);
      }}
    >
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={value === tab.id}
          tabIndex={value === tab.id ? 0 : -1}
          onClick={() => onChange(tab.id)}
          className={cn(
            'rounded-md px-3 py-1.5 text-sm transition-colors',
            value === tab.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted',
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
