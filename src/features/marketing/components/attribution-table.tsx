'use client';

import { AlertTriangle, Info } from 'lucide-react';
import type { MarketingAttribution } from '../services/marketing.service';
import {
  EmptyRow, TableCard,
  tbodyCls, tdBaseCls, tdMutedCls, tdNumCls, thCls, thNumCls, theadCls, trCls,
} from '@/features/crm-reports/components/table-parts';

const fmtCurrency = (value: number): string =>
  'R$ ' + value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtCurrencyOrDash = (value: number | null): string => (value === null ? '—' : fmtCurrency(value));

const fmtNumber = (value: number): string => value.toLocaleString('pt-BR');

const fmtRoas = (value: number | null): string =>
  value === null ? '—' : value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + 'x';

const TH = thCls;
const TH_NUM = thNumCls;
const TD_NUM_MUTED = `${tdMutedCls} text-right font-mono tabular-nums`;
const COLUMN_COUNT = 7;

function CoverageBanner({ coverage }: { coverage: MarketingAttribution['coverage'] }) {
  const isLow = coverage.pct < 70;
  const pctLabel = coverage.pct.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  return (
    <div
      className={
        isLow
          ? 'flex items-start gap-2 rounded-xl bg-warning-wash p-4 text-sm text-warning-ink'
          : 'flex items-start gap-2 rounded-xl border border-border bg-muted p-4 text-sm text-muted-foreground'
      }
    >
      {isLow ? (
        <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
      ) : (
        <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
      )}
      <div>
        <p>
          <strong>{pctLabel}%</strong> dos leads do período têm anúncio identificado ({fmtNumber(coverage.leadsWithAdId)}{' '}
          de {fmtNumber(coverage.leadsTotal)}). Os demais aparecem como <strong>Não atribuído</strong>.
        </p>
        <p className="mt-1 text-xs opacity-90">
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

      <TableCard label="Atribuição por anúncio" minWidth="min-w-[820px]">
            <thead className={theadCls}>
              <tr>
                <th scope="col" className={TH}>Campanha / Anúncio</th>
                <th scope="col" className={TH_NUM}>Leads</th>
                <th scope="col" className={TH_NUM}>Gasto</th>
                <th scope="col" className={TH_NUM}>Vendas</th>
                <th scope="col" className={TH_NUM}>Receita</th>
                <th scope="col" className={TH_NUM}>CPL</th>
                <th scope="col" className={TH_NUM}>ROAS</th>
              </tr>
            </thead>
            <tbody className={tbodyCls}>
              {rows.map((r) => (
                <tr key={r.adId} className={trCls}>
                  <td className={tdBaseCls}>
                    <div className="font-medium text-foreground">{r.adName ?? r.adId}</div>
                    {r.campaignName && <div className="text-xs text-muted-foreground">{r.campaignName}</div>}
                  </td>
                  <td className={tdNumCls}>{fmtNumber(r.leads)}</td>
                  <td className={tdNumCls}>{fmtCurrencyOrDash(r.spend)}</td>
                  <td className={tdNumCls}>{fmtNumber(r.deals)}</td>
                  <td className={tdNumCls}>{fmtCurrency(r.revenue)}</td>
                  <td className={tdNumCls}>{fmtCurrencyOrDash(r.cpl)}</td>
                  <td className={tdNumCls}>{fmtRoas(r.roas)}</td>
                </tr>
              ))}

              {!isEmpty && (
                // Linha de resumo, não zebra: o que sobrou sem anúncio identificado.
                <tr className="bg-muted/50">
                  <td className={`${tdMutedCls} font-medium`}>Não atribuído</td>
                  <td className={TD_NUM_MUTED}>{fmtNumber(unattributed.leads)}</td>
                  <td className={TD_NUM_MUTED}>—</td>
                  <td className={TD_NUM_MUTED}>{fmtNumber(unattributed.deals)}</td>
                  <td className={TD_NUM_MUTED}>{fmtCurrency(unattributed.revenue)}</td>
                  <td className={TD_NUM_MUTED}>—</td>
                  <td className={TD_NUM_MUTED}>—</td>
                </tr>
              )}

              {isEmpty && (
                <EmptyRow colSpan={COLUMN_COUNT}>Nenhum lead de anúncio identificado no período.</EmptyRow>
              )}
            </tbody>
      </TableCard>
    </div>
  );
}
