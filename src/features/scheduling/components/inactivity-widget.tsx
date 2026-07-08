'use client';

import Link from 'next/link';
import { Clock, ArrowUpRight } from 'lucide-react';
import { useInactivityReport, useInactivitySettings } from '../hooks/use-inactivity';

const BAND_COLORS = ['#10b981', '#f59e0b', '#f97316', '#ef4444', '#b91c1c', '#7f1d1d'];
function bandColor(i: number): string {
  return BAND_COLORS[Math.min(i, BAND_COLORS.length - 1)];
}
function bandLabel(bands: number[] | undefined, i: number): string {
  if (!bands || i < 0 || i >= bands.length) return `Faixa ${i}`;
  const from = bands[i];
  const to = bands[i + 1];
  return to != null ? `${from}–${to} dias` : `${from}+ dias`;
}

export function InactivityWidget() {
  const { data: settings } = useInactivitySettings();
  const { data, isLoading } = useInactivityReport();

  const bands = settings?.bandsDays;
  const byBandMap = new Map((data?.byBand ?? []).map((b) => [b.band, b.count]));
  const indexes = bands ? bands.map((_, i) => i) : (data?.byBand ?? []).map((b) => b.band);
  const total = (data?.byBand ?? []).reduce((sum, b) => sum + b.count, 0);
  const max = Math.max(1, ...(data?.byBand ?? []).map((b) => b.count));

  return (
    <Link
      href="/inactivity"
      className="group block rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition-colors hover:border-primary/40 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            <Clock className="h-4 w-4 text-zinc-400" />
            Inatividade de clientes
          </h3>
          <p className="text-[11px] text-zinc-400">Conversas paradas por faixa de dias</p>
        </div>
        <span className="flex items-center gap-1 text-xs font-medium text-zinc-400 group-hover:text-primary">
          {total} total <ArrowUpRight className="h-3.5 w-3.5" />
        </span>
      </div>

      <div className="mt-4 space-y-2.5">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-5 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
          ))
        ) : indexes.length === 0 || total === 0 ? (
          <p className="py-6 text-center text-xs text-zinc-400">Nenhuma conversa inativa 🎉</p>
        ) : (
          indexes.map((i) => {
            const count = byBandMap.get(i) ?? 0;
            const color = bandColor(i);
            return (
              <div key={i} className="flex items-center gap-3">
                <span className="flex w-24 shrink-0 items-center gap-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-300">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                  <span className="truncate">{bandLabel(bands, i)}</span>
                </span>
                <div className="relative h-5 flex-1 overflow-hidden rounded bg-zinc-100 dark:bg-zinc-800">
                  <div
                    className="h-full rounded transition-all"
                    style={{ width: `${(count / max) * 100}%`, backgroundColor: color, opacity: 0.85 }}
                  />
                </div>
                <span className="w-8 text-right text-xs font-semibold tabular-nums text-zinc-600 dark:text-zinc-300">
                  {count}
                </span>
              </div>
            );
          })
        )}
      </div>
    </Link>
  );
}
