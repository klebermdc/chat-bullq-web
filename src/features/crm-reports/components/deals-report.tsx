'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { EmptyState, LoadingState } from '@/components/ui/empty-state';
import {
  crmReportsService,
  type DealsFilters,
} from '../services/crm-reports.service';
import { DealsFilterBar } from './deals-filter-bar';
import { DealsMetrics } from './deals-metrics';
import { DealsTable } from './deals-table';

const startOfMonthISO = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
};

export function DealsReport() {
  const [filters, setFilters] = useState<DealsFilters>({
    from: startOfMonthISO(),
    page: 1,
    perPage: 25,
  });
  const { data, isFetching } = useQuery({
    queryKey: ['crm-report-deals', filters],
    queryFn: () => crmReportsService.getDeals(filters),
  });

  const handleExport = async () => {
    try {
      const blob = await crmReportsService.downloadDealsCsv({
        ...filters,
        page: 1,
        perPage: 10000,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'relatorio-negocios.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Falha ao exportar');
    }
  };

  return (
    <div className="space-y-4">
      <DealsFilterBar
        filters={filters}
        onChange={setFilters}
        actions={
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download aria-hidden="true" className="h-3.5 w-3.5" /> Exportar CSV
          </Button>
        }
      />
      {data ? (
        <>
          <DealsMetrics m={data.metrics} />
          <DealsTable
            report={data}
            onPage={(page) => setFilters((f) => ({ ...f, page }))}
          />
        </>
      ) : isFetching ? (
        <LoadingState />
      ) : (
        <EmptyState
          size="sm"
          title="Sem dados para mostrar"
          description="Ajuste os filtros ou tente de novo em instantes."
        />
      )}
    </div>
  );
}
