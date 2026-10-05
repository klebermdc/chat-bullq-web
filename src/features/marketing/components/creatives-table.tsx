'use client';

import type { MarketingCreativeRow } from '../services/marketing.service';
import {
  EmptyRow, TableCard,
  tbodyCls, tdBaseCls, tdNumCls, thCls, thNumCls, theadCls, trCls,
} from '@/features/crm-reports/components/table-parts';
import { cn } from '@/lib/utils';

const fmtCurrency = (value: number): string =>
  'R$ ' + value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtCurrencyOrDash = (value: number | null): string => (value === null ? '—' : fmtCurrency(value));

const fmtNumber = (value: number): string => value.toLocaleString('pt-BR');

const fmtPercent = (value: number | null): string =>
  value === null ? '—' : value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';

const PODIUM_SIZE = 3;
const COLUMN_COUNT = 7;

const TH = thCls;
const TH_NUM = thNumCls;
const TD_NUM = tdNumCls;

interface CreativesTableProps {
  /** Já vem ordenado por CPL ascendente com CPL nulo por último — não reordenar aqui. */
  creatives: MarketingCreativeRow[];
}

function Rank({ position }: { position: number }) {
  const isPodium = position <= PODIUM_SIZE;
  return (
    <span
      className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums ${
        isPodium ? 'bg-primary/10 text-primary' : 'text-muted-foreground'
      }`}
    >
      {position}
    </span>
  );
}

export function CreativesTable({ creatives }: CreativesTableProps) {
  return (
    <TableCard label="Ranking de criativos" minWidth="min-w-[780px]">
          <thead className={theadCls}>
            <tr>
              <th scope="col" className={`${TH} text-center`}>
                <abbr title="Posição" className="no-underline">#</abbr>
              </th>
              <th scope="col" className={TH}>Criativo</th>
              <th scope="col" className={TH}>Campanha</th>
              <th scope="col" className={TH_NUM}>Gasto</th>
              <th scope="col" className={TH_NUM}>CTR</th>
              <th scope="col" className={TH_NUM}>Leads</th>
              <th scope="col" className={TH_NUM}>CPL</th>
            </tr>
          </thead>
          <tbody className={tbodyCls}>
            {creatives.map((c, i) => (
              <tr key={c.adId} className={trCls}>
                <td className={`${tdBaseCls} text-center`}><Rank position={i + 1} /></td>
                <td className={`${tdBaseCls} font-medium`}>{c.adName ?? c.adId}</td>
                <td className={cn(tdBaseCls, 'text-muted-foreground')}>{c.campaignName ?? '—'}</td>
                <td className={TD_NUM}>{fmtCurrencyOrDash(c.spend)}</td>
                <td className={TD_NUM}>{fmtPercent(c.ctr)}</td>
                <td className={TD_NUM}>{fmtNumber(c.leads)}</td>
                <td className={TD_NUM}>{fmtCurrencyOrDash(c.cpl)}</td>
              </tr>
            ))}
            {creatives.length === 0 && (
              <EmptyRow colSpan={COLUMN_COUNT}>Nenhum lead de anúncio identificado no período.</EmptyRow>
            )}
          </tbody>
    </TableCard>
  );
}
