'use client';

import type { MarketingCreativeRow } from '../services/marketing.service';

const fmtCurrency = (value: number): string =>
  'R$ ' + value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtCurrencyOrDash = (value: number | null): string => (value === null ? '—' : fmtCurrency(value));

const fmtNumber = (value: number): string => value.toLocaleString('pt-BR');

const fmtPercent = (value: number | null): string =>
  value === null ? '—' : value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';

const MEDALS = ['🥇', '🥈', '🥉'];

interface CreativesTableProps {
  /** Já vem ordenado por CPL ascendente com CPL nulo por último — não reordenar aqui. */
  creatives: MarketingCreativeRow[];
}

export function CreativesTable({ creatives }: CreativesTableProps) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-200 text-left text-[11px] uppercase text-zinc-400 dark:border-zinc-800">
            <tr>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Criativo</th>
              <th className="px-3 py-2">Campanha</th>
              <th className="px-3 py-2">Gasto</th>
              <th className="px-3 py-2">CTR</th>
              <th className="px-3 py-2">Leads</th>
              <th className="px-3 py-2">CPL</th>
            </tr>
          </thead>
          <tbody>
            {creatives.map((c, i) => (
              <tr key={c.adId} className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/60">
                <td className="px-3 py-2 text-zinc-400">{MEDALS[i] ?? i + 1}</td>
                <td className="px-3 py-2 font-medium text-zinc-900 dark:text-zinc-100">{c.adName ?? c.adId}</td>
                <td className="px-3 py-2 text-zinc-500 dark:text-zinc-400">{c.campaignName ?? '—'}</td>
                <td className="px-3 py-2">{fmtCurrencyOrDash(c.spend)}</td>
                <td className="px-3 py-2">{fmtPercent(c.ctr)}</td>
                <td className="px-3 py-2">{fmtNumber(c.leads)}</td>
                <td className="px-3 py-2">{fmtCurrencyOrDash(c.cpl)}</td>
              </tr>
            ))}
            {creatives.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-zinc-400">
                  Nenhum lead de anúncio identificado no período.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
