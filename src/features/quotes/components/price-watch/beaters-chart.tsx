'use client';

import { PLATFORM_LABEL } from '../../lib/price-watch';
import type { PriceWatchBeater } from '../../types';

const MAX_ROWS = 10;
const percent = (v: number) => `${v.toFixed(1).replace('.', ',')}%`;

/**
 * Quem mais ficou abaixo de nós no período. Barras em lista (também é a
 * tabela de leitura): comprimento = quantas vezes; ao lado, quanto em média.
 */
export function BeatersChart({ beaters }: { beaters: PriceWatchBeater[] }) {
  const rows = beaters.slice(0, MAX_ROWS);
  const max = Math.max(1, ...rows.map((r) => r.times));
  return (
    <section className="space-y-2 rounded-md border border-border p-3">
      <h2 className="text-sm font-medium">Quem mais nos bate</h2>
      <p className="text-xs text-muted-foreground">
        Vezes (item × dia) em que a loja ficou abaixo da OFP, e quanto mais barata em média.
      </p>
      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">Ninguém ficou abaixo de nós no período.</p>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((r) => (
            <li key={r.storeId} className="grid grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-2 text-xs">
              <span className="truncate" title={`${r.storeName} (${PLATFORM_LABEL[r.platform]})`}>
                {r.storeName}
              </span>
              <span
                className="h-2.5 rounded-r bg-[var(--chart-seq)]"
                style={{ width: `${(r.times / max) * 100}%` }}
                aria-hidden
              />
              <span className="tabular-nums text-muted-foreground">
                {r.times} {r.times === 1 ? 'vez' : 'vezes'} · {percent(r.avgDiffPercent)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
