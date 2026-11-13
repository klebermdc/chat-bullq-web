'use client';

import { useQuery } from '@tanstack/react-query';
import { EmptyState, LoadingState } from '@/components/ui/empty-state';
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
import { fetchRanking, RANKING_QUERY_KEY, type RankingRow } from '../api';

export function RankingTable({ rows }: { rows: RankingRow[] }) {
  const criteria = [...new Set(rows.flatMap((r) => Object.keys(r.byCriterion)))];
  return (
    <TableCard label="Ranking (últimos 90 dias)" minWidth="min-w-[640px]">
      <thead className={theadCls}>
        <tr>
          <th className={thCls}>Vendedor</th>
          <th className={thNumCls}>Média</th>
          <th className={thNumCls}>Visitas</th>
          {criteria.map((c) => (
            <th key={c} className={thNumCls}>
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className={tbodyCls}>
        {rows.map((row) => (
          <tr key={row.sellerUserId} className={trCls}>
            <td className={tdCls}>
              {row.sellerName}
              {row.isSmallSample && <span className="ml-2 text-xs text-warning-ink">amostra pequena</span>}
            </td>
            <td className={tdNumCls}>{row.average}</td>
            <td className={tdNumCls}>{row.visits}</td>
            {criteria.map((c) => (
              <td key={c} className={tdNumCls}>
                {row.byCriterion[c] ?? '—'}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </TableCard>
  );
}

export function RankingTab() {
  const { data, isLoading, isError } = useQuery({ queryKey: RANKING_QUERY_KEY, queryFn: fetchRanking });
  if (isLoading) return <LoadingState label="Carregando ranking…" />;
  if (isError) {
    return (
      <p role="alert" className="text-sm text-urgent-ink">
        Não foi possível carregar o ranking.
      </p>
    );
  }
  if (!data || data.length === 0) {
    return <EmptyState title="Sem visitas avaliadas" description="O ranking aparece quando houver visitas avaliadas nos últimos 90 dias." />;
  }
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Critérios de 0 a 2; média geral de 0 a 100.</p>
      <RankingTable rows={data} />
    </div>
  );
}
