'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { EmptyState, LoadingState } from '@/components/ui/empty-state';
import { getErrorMessage } from '@/lib/errors';
import { fetchKpis, kpisQueryKey, type MysteryShopperKpis } from '../api';
import { currentMonth } from '../kpis';
import { KpiCards } from './kpi-cards';
import { KpiCritical } from './kpi-critical';
import { KpiFunnel } from './kpi-funnel';
import { KpiMonthNav } from './kpi-month-nav';
import { KpiWeakness } from './kpi-weakness';
import { SellerKpiTable } from './seller-kpi-table';

type OpenVisit = (id: string) => void;

/** Conteúdo do mês já carregado — separado para testar sem rede. */
export function KpisContent({ data, onOpenVisit }: { data: MysteryShopperKpis; onOpenVisit: OpenVisit }) {
  const { overall } = data;
  if (overall.visits === 0 && overall.openVisits === 0) {
    return (
      <EmptyState
        title="Sem visitas avaliadas neste mês"
        description="Os indicadores aparecem quando houver visitas do cliente oculto no mês escolhido."
      />
    );
  }
  return (
    <div className="space-y-4">
      <KpiCards overall={overall} />
      <div className="grid gap-4 lg:grid-cols-3">
        <KpiFunnel steps={overall.funnel} />
        <KpiWeakness overall={overall} />
        <KpiCritical visits={overall.criticalVisits} onOpenVisit={onOpenVisit} />
      </div>
      {data.sellers.length > 0 && (
        <section aria-labelledby="kpi-por-vendedor" className="space-y-2">
          <h2 id="kpi-por-vendedor" className="text-sm font-semibold">
            Por vendedor
          </h2>
          <p className="text-xs text-muted-foreground">
            Nota de 0 a 100; critérios de 0 a 2. Clique no vendedor para ver a ficha.
          </p>
          <SellerKpiTable sellers={data.sellers} criteria={data.criteria} />
        </section>
      )}
    </div>
  );
}

export function KpisTab({ onOpenVisit }: { onOpenVisit: OpenVisit }) {
  const [month, setMonth] = useState(() => currentMonth());
  const { data, isLoading, isError, error } = useQuery({
    queryKey: kpisQueryKey(month),
    queryFn: () => fetchKpis(month),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <KpiMonthNav month={month} onChange={setMonth} />
        <p className="text-xs text-muted-foreground">Só o que o cliente oculto viu nas visitas de teste.</p>
      </div>
      {isLoading && <LoadingState label="Carregando indicadores…" />}
      {isError && (
        <p role="alert" className="text-sm text-urgent-ink">
          {getErrorMessage(error, 'Não foi possível carregar os indicadores.')}
        </p>
      )}
      {data && <KpisContent data={data} onOpenVisit={onOpenVisit} />}
    </div>
  );
}
