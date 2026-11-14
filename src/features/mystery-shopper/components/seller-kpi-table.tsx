'use client';

import { Fragment, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  TableCard,
  tbodyCls,
  tdCls,
  tdNumCls,
  theadCls,
  thCls,
  thNumCls,
  trCls,
} from '@/features/crm-reports/components/table-parts';
import type { KpiCriterion, SellerKpi } from '../api';
import { formatAverage, heatClass, trendView } from '../kpis';
import { SellerKpiSheet } from './seller-kpi-sheet';

const FIXED_COLUMNS = 3;

function ScoreCell({ seller }: { seller: SellerKpi }) {
  const trend = trendView(seller.trend);
  return (
    <td className={tdNumCls}>
      {Math.round(seller.averageScore)}
      {trend && (
        <span className={cn('ml-1 text-xs', trend.className)} title={trend.label}>
          <span aria-hidden="true">{trend.symbol}</span>
          <span className="sr-only">{trend.label}</span>
        </span>
      )}
    </td>
  );
}

function SellerRow({
  seller,
  criteria,
  isOpen,
  onToggle,
}: {
  seller: SellerKpi;
  criteria: KpiCriterion[];
  isOpen: boolean;
  onToggle: () => void;
}) {
  const sheetId = `ficha-${seller.sellerUserId}`;
  return (
    <Fragment>
      <tr className={cn(trCls, 'cursor-pointer', isOpen && 'bg-muted/40')} onClick={onToggle}>
        <td className={tdCls}>
          <button
            type="button"
            aria-expanded={isOpen}
            aria-controls={sheetId}
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            className="text-left font-medium hover:underline"
          >
            {seller.sellerName}
          </button>
        </td>
        <ScoreCell seller={seller} />
        <td className={tdNumCls}>
          {seller.visits}
          {seller.isSmallSample && <span className="ml-2 font-sans text-xs text-warning-ink">amostra pequena</span>}
        </td>
        {criteria.map((c) => {
          const value = seller.byCriterion[c.criterion] ?? null;
          return (
            <td key={c.criterion} className="px-2 py-1.5 text-center">
              <span className={cn('inline-block min-w-[2.5rem] rounded-md px-2 py-1 font-mono text-sm tabular-nums', heatClass(value))}>
                {formatAverage(value)}
              </span>
            </td>
          );
        })}
      </tr>
      {isOpen && (
        <tr id={sheetId} className="bg-muted/20">
          <td colSpan={FIXED_COLUMNS + criteria.length} className="px-4 py-3">
            <SellerKpiSheet seller={seller} />
          </td>
        </tr>
      )}
    </Fragment>
  );
}

export function SellerKpiTable({
  sellers,
  criteria,
  initialOpenId = null,
}: {
  sellers: SellerKpi[];
  criteria: KpiCriterion[];
  initialOpenId?: string | null;
}) {
  const [openId, setOpenId] = useState<string | null>(initialOpenId);
  return (
    <TableCard label="Indicadores por vendedor" minWidth="min-w-[720px]">
      <thead className={theadCls}>
        <tr>
          <th className={thCls}>Vendedor</th>
          <th className={thNumCls}>Nota</th>
          <th className={thNumCls}>Visitas</th>
          {criteria.map((c) => (
            <th key={c.criterion} className={cn(thCls, 'min-w-[6rem] whitespace-normal text-center')} title={c.label}>
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className={tbodyCls}>
        {sellers.map((seller) => (
          <SellerRow
            key={seller.sellerUserId}
            seller={seller}
            criteria={criteria}
            isOpen={openId === seller.sellerUserId}
            onToggle={() => setOpenId((cur) => (cur === seller.sellerUserId ? null : seller.sellerUserId))}
          />
        ))}
      </tbody>
    </TableCard>
  );
}
