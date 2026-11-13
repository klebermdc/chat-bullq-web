'use client';

import { useRef } from 'react';
import { cn } from '@/lib/utils';

export type ShopperTab = 'visitas' | 'ranking' | 'numeros';

const TABS: Array<{ id: ShopperTab; label: string }> = [
  { id: 'visitas', label: 'Visitas' },
  { id: 'ranking', label: 'Ranking' },
  { id: 'numeros', label: 'Números' },
];

export function ShopperTabs({ value, onChange }: { value: ShopperTab; onChange: (tab: ShopperTab) => void }) {
  const buttons = useRef<Partial<Record<ShopperTab, HTMLButtonElement | null>>>({});

  const select = (index: number) => {
    const next = TABS[(index + TABS.length) % TABS.length].id;
    onChange(next);
    buttons.current[next]?.focus();
  };
  const move = (step: number) => select(TABS.findIndex((t) => t.id === value) + step);

  return (
    <div
      role="tablist"
      aria-label="Cliente oculto"
      className="flex w-fit gap-1 rounded-lg border border-border bg-card p-1"
      onKeyDown={(e) => {
        const handled = ['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key);
        if (!handled) return;
        e.preventDefault();
        if (e.key === 'ArrowRight') move(1);
        if (e.key === 'ArrowLeft') move(-1);
        if (e.key === 'Home') select(0);
        if (e.key === 'End') select(TABS.length - 1);
      }}
    >
      {TABS.map((tab) => (
        <button
          key={tab.id}
          ref={(el) => {
            buttons.current[tab.id] = el;
          }}
          id={`shopper-tab-${tab.id}`}
          type="button"
          role="tab"
          aria-selected={value === tab.id}
          aria-controls={`shopper-panel-${tab.id}`}
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
