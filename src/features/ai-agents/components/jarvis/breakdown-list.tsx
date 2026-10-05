'use client';
import { EmptyState } from '@/components/ui/empty-state';

interface BreakdownItem {
  label: string;
  value: number;
  /** Optional secondary value (e.g. cost) shown in muted color. */
  secondaryLabel?: string;
}

interface Props {
  title: string;
  items: BreakdownItem[];
  unit?: string;
  empty?: string;
}

export function BreakdownList({ title, items, unit, empty }: Props) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {title}
      </p>
      {items.length === 0 ? (
        <EmptyState size="sm" title={empty ?? 'Sem dados no período'} className="py-6" />
      ) : (
        <div className="mt-3 space-y-2">
          {items.map((item) => {
            const pct = (item.value / max) * 100;
            return (
              <div key={item.label}>
                <div className="flex items-baseline justify-between text-xs">
                  <span className="min-w-0 truncate font-medium text-foreground">
                    {item.label}
                  </span>
                  <span className="ml-2 shrink-0 tabular-nums text-muted-foreground">
                    {item.value.toLocaleString('pt-BR')}
                    {unit ? ` ${unit}` : ''}
                    {item.secondaryLabel ? (
                      <span className="ml-2 text-muted-foreground">
                        {item.secondaryLabel}
                      </span>
                    ) : null}
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
