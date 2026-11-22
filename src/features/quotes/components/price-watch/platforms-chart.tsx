'use client';

import { PLATFORM_LABEL } from '../../lib/price-watch';
import type { PriceWatchPlatform } from '../../types';

const percent = (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(1).replace('.', ',')}%`;

/**
 * Plataforma × plataforma: diferença média para o nosso preço. Barra a partir
 * do zero (centro): para a esquerda = mais barata que nós, à direita = mais cara.
 */
export function PlatformsChart({ platforms }: { platforms: PriceWatchPlatform[] }) {
  if (platforms.length === 0) return null;
  const max = Math.max(1, ...platforms.map((p) => Math.abs(p.avgDiffPercent)));
  return (
    <section className="space-y-2 rounded-md border border-border p-3">
      <h2 className="text-sm font-medium">Plataforma × plataforma</h2>
      <p className="text-xs text-muted-foreground">
        Diferença média do preço das lojas para o da OFP. Negativo = mais barata que nós.
      </p>
      <ul className="space-y-1.5">
        {platforms.map((p) => {
          const width = (Math.abs(p.avgDiffPercent) / max) * 50;
          const isCheaper = p.avgDiffPercent < 0;
          return (
            <li key={p.platform} className="grid grid-cols-[6rem_1fr_auto] items-center gap-2 text-xs">
              <span>{PLATFORM_LABEL[p.platform]}</span>
              <span className="relative h-2.5 rounded bg-muted" aria-hidden>
                <span className="absolute inset-y-0 left-1/2 w-px bg-border" />
                <span
                  className="absolute inset-y-0 rounded bg-[var(--chart-seq)]"
                  style={isCheaper ? { right: '50%', width: `${width}%` } : { left: '50%', width: `${width}%` }}
                />
              </span>
              <span className="tabular-nums text-muted-foreground">
                {percent(p.avgDiffPercent)} · {p.storeCount} lojas
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
