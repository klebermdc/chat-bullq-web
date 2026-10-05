'use client';

import { EmptyState } from '@/components/ui/empty-state';
import { formatNumber } from '@/features/dashboard/lib/format';

const DOW = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

// No desktop as células são mais altas: o mapa ocupa a mesma altura do
// gráfico vizinho (h-64) em vez de deixar meio cartão vazio.
const CELL_HEIGHT = 'h-5 lg:h-7';
const LABEL_LEADING = 'leading-5 lg:leading-7';

export function Heatmap({ matrix, max, accent = 'var(--chart-seq)' }: {
  matrix: number[][];
  max: number;
  accent?: string;
}) {
  if (max === 0) {
    return <EmptyState size="sm" title="Sem dados no período" />;
  }

  return (
    <div>
      <div className="grid grid-cols-[32px_repeat(24,minmax(0,1fr))] gap-0.5">
        <div />
        {HOURS.map((h) => (
          <div key={h} className="text-center text-[11px] tabular-nums text-muted-foreground">
            {h % 3 === 0 ? `${h}h` : ''}
          </div>
        ))}

        {DOW.map((label, dow) => (
          <Row key={dow} label={label} dow={dow} matrix={matrix} max={max} accent={accent} />
        ))}
      </div>

      <div className="mt-3 flex items-center justify-end gap-1.5 text-[11px] text-muted-foreground">
        <span>menos</span>
        {[0.1, 0.3, 0.5, 0.75, 1].map((o, i) => (
          <div
            key={i}
            className="h-2.5 w-3 rounded-sm"
            style={{ backgroundColor: accent, opacity: o }}
          />
        ))}
        <span>mais</span>
      </div>
    </div>
  );
}

function Row({
  label, dow, matrix, max, accent,
}: { label: string; dow: number; matrix: number[][]; max: number; accent: string }) {
  return (
    <>
      <div className={`pr-1 text-right text-[11px] font-medium text-muted-foreground ${LABEL_LEADING}`}>{label}</div>
      {HOURS.map((h) => {
        const v = matrix[dow][h];
        const opacity = v === 0 ? 0.04 : 0.15 + (v / max) * 0.85;
        return (
          <div
            key={h}
            className={`rounded-[3px] transition-opacity hover:opacity-100 ${CELL_HEIGHT}`}
            style={{ backgroundColor: accent, opacity }}
            title={`${label} ${h}h: ${formatNumber(v)} conversa${v === 1 ? '' : 's'}`}
          />
        );
      })}
    </>
  );
}
