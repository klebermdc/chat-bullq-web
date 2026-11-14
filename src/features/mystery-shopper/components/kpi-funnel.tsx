import type { FunnelStep } from '../api';
import { formatPct } from '../kpis';
import { KpiSection } from './kpi-section';

const MAX_PCT = 100;

export function KpiFunnel({ steps }: { steps: FunnelStep[] }) {
  return (
    <KpiSection id="kpi-funil" title="Onde o cliente se perde">
      <ol className="space-y-2.5">
        {steps.map((step) => (
          <li key={step.key} className="text-sm">
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <span>{step.label}</span>
              <span className="tabular-nums text-muted-foreground">
                <span className="font-medium text-foreground">{formatPct(step.pct)}</span> · {step.reached}/{step.total}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
              <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(step.pct ?? 0, MAX_PCT)}%` }} />
            </div>
          </li>
        ))}
      </ol>
    </KpiSection>
  );
}
