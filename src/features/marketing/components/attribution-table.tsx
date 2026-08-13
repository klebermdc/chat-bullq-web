'use client';

import { AlertTriangle, Info } from 'lucide-react';
import type { MarketingAttribution } from '../services/marketing.service';

const fmtCurrency = (value: number): string =>
  'R$ ' + value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtCurrencyOrDash = (value: number | null): string => (value === null ? '—' : fmtCurrency(value));

const fmtNumber = (value: number): string => value.toLocaleString('pt-BR');

const fmtRoas = (value: number | null): string =>
  value === null ? '—' : value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + 'x';

function CoverageBanner({ coverage }: { coverage: MarketingAttribution['coverage'] }) {
  const isLow = coverage.pct < 70;
  const pctLabel = coverage.pct.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  return (
    <div
      className={
        isLow
          ? 'flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-300'
          : 'flex items-start gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300'
      }
    >
      {isLow ? (
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      ) : (
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
      )}
      <div>
        <p>
          <strong>{pctLabel}%</strong> dos leads do período têm anúncio identificado ({fmtNumber(coverage.leadsWithAdId)}{' '}
          de {fmtNumber(coverage.leadsTotal)}). Os demais aparecem como <strong>Não atribuído</strong>.
        </p>
        <p className="mt-1 text-xs opacity-80">
          A Meta parou de enviar o identificador do anúncio (referral) em parte dos leads recebidos via WhatsApp — isso
          é um limite da origem dos dados, não um defeito deste painel. Um ROAS calculado aqui só representa a fatia
          coberta acima, nunca o total investido.
        </p>
      </div>
    </div>
  );
}

export function AttributionTable({ attribution }: { attribution: MarketingAttribution }) {
  const { rows, unattributed, coverage } = attribution;
  const isEmpty = rows.length === 0 && unattributed.leads === 0 && unattributed.deals === 0;

  return (
    <div className="space-y-3">
      <CoverageBanner coverage={coverage} />

      <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-200 text-left text-[11px] uppercase text-zinc-400 dark:border-zinc-800">
              <tr>
                <th className="px-3 py-2">Campanha / Anúncio</th>
                <th className="px-3 py-2">Leads</th>
                <th className="px-3 py-2">Gasto</th>
                <th className="px-3 py-2">Vendas</th>
                <th className="px-3 py-2">Receita</th>
                <th className="px-3 py-2">CPL</th>
                <th className="px-3 py-2">ROAS</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.adId} className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/60">
                  <td className="px-3 py-2">
                    <div className="font-medium text-zinc-900 dark:text-zinc-100">{r.adName ?? r.adId}</div>
                    {r.campaignName && <div className="text-xs text-zinc-400">{r.campaignName}</div>}
                  </td>
                  <td className="px-3 py-2">{fmtNumber(r.leads)}</td>
                  <td className="px-3 py-2">{fmtCurrencyOrDash(r.spend)}</td>
                  <td className="px-3 py-2">{fmtNumber(r.deals)}</td>
                  <td className="px-3 py-2">{fmtCurrency(r.revenue)}</td>
                  <td className="px-3 py-2">{fmtCurrencyOrDash(r.cpl)}</td>
                  <td className="px-3 py-2">{fmtRoas(r.roas)}</td>
                </tr>
              ))}

              {!isEmpty && (
                <tr className="bg-zinc-50 dark:bg-zinc-800/40">
                  <td className="px-3 py-2 font-medium text-zinc-500 dark:text-zinc-400">Não atribuído</td>
                  <td className="px-3 py-2 text-zinc-500 dark:text-zinc-400">{fmtNumber(unattributed.leads)}</td>
                  <td className="px-3 py-2 text-zinc-500 dark:text-zinc-400">—</td>
                  <td className="px-3 py-2 text-zinc-500 dark:text-zinc-400">{fmtNumber(unattributed.deals)}</td>
                  <td className="px-3 py-2 text-zinc-500 dark:text-zinc-400">{fmtCurrency(unattributed.revenue)}</td>
                  <td className="px-3 py-2 text-zinc-500 dark:text-zinc-400">—</td>
                  <td className="px-3 py-2 text-zinc-500 dark:text-zinc-400">—</td>
                </tr>
              )}

              {isEmpty && (
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
    </div>
  );
}
