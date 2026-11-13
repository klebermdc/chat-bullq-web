'use client';

import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState, LoadingState } from '@/components/ui/empty-state';
import {
  formatDate,
  TableCard,
  tbodyCls,
  tdCls,
  tdMutedCls,
  tdNumCls,
  tdTruncateCls,
  theadCls,
  thCls,
  thNumCls,
  trCls,
} from '@/features/crm-reports/components/table-parts';
import { fetchVisits, VISITS_QUERY_KEY } from '../api';
import { closesInLabel, STATUS_BADGE, STATUS_LABEL } from '../format';

const REFRESH_MS = 60_000;

export function VisitsTab({ onOpen }: { onOpen: (id: string) => void }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: VISITS_QUERY_KEY,
    queryFn: fetchVisits,
    refetchInterval: REFRESH_MS,
  });

  if (isLoading) return <LoadingState label="Carregando visitas…" />;
  if (isError) {
    return (
      <p role="alert" className="text-sm text-urgent-ink">
        Não foi possível carregar as visitas. Atualize a página.
      </p>
    );
  }
  if (!data || data.length === 0) {
    return (
      <EmptyState
        title="Nenhuma visita ainda"
        description="Cadastre um número na aba Números e mande uma mensagem para a OFP por ele. A visita aparece aqui em até 15 minutos."
      />
    );
  }

  return (
    <TableCard label="Visitas" minWidth="min-w-[760px]">
      <thead className={theadCls}>
        <tr>
          <th className={thCls}>Data</th>
          <th className={thCls}>Vendedor</th>
          <th className={thCls}>Cenário</th>
          <th className={thCls}>Status</th>
          <th className={thNumCls}>Nota</th>
          <th className={thCls}>
            <span className="sr-only">Ações</span>
          </th>
        </tr>
      </thead>
      <tbody className={tbodyCls}>
        {data.map((visit) => (
          <tr key={visit.id} className={trCls}>
            <td className={tdMutedCls}>{formatDate(visit.createdAt)}</td>
            <td className={tdCls}>{visit.sellerName ?? 'Sem vendedor'}</td>
            <td className={tdTruncateCls}>{visit.scenario ?? '—'}</td>
            <td className={tdCls}>
              <Badge variant={STATUS_BADGE[visit.status]}>{STATUS_LABEL[visit.status]}</Badge>
              {visit.status === 'OPEN' && (
                <span className="ml-2 text-xs text-muted-foreground">{closesInLabel(visit.closesAt)}</span>
              )}
            </td>
            <td className={tdNumCls}>{visit.totalScore ?? '—'}</td>
            <td className={tdCls}>
              <Button size="sm" variant="ghost" onClick={() => onOpen(visit.id)}>
                Abrir
              </Button>
            </td>
          </tr>
        ))}
      </tbody>
    </TableCard>
  );
}
