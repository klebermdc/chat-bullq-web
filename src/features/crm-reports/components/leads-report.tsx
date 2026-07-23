'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import {
  crmReportsService,
  type LeadsFilters,
} from '../services/crm-reports.service';
import { LeadsFilterBar } from './leads-filter-bar';
import { LeadsMetrics } from './leads-metrics';
import { LeadsTable } from './leads-table';

const startOfMonthISO = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
};

export function LeadsReport() {
  const [filters, setFilters] = useState<LeadsFilters>({
    from: startOfMonthISO(),
    page: 1,
    perPage: 25,
  });
  const { data, isFetching } = useQuery({
    queryKey: ['crm-report-leads', filters],
    queryFn: () => crmReportsService.getLeads(filters),
  });

  const handleExport = async () => {
    try {
      const blob = await crmReportsService.downloadLeadsCsv({
        ...filters,
        page: 1,
        perPage: 10000,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'relatorio-leads.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Falha ao exportar');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <LeadsFilterBar filters={filters} onChange={setFilters} />
        <button
          onClick={handleExport}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
        >
          <Download className="h-3.5 w-3.5" /> Exportar CSV
        </button>
      </div>
      {data ? (
        <>
          <LeadsMetrics m={data.metrics} />
          <LeadsTable
            report={data}
            onPage={(page) => setFilters((f) => ({ ...f, page }))}
          />
        </>
      ) : (
        <p className="text-sm text-zinc-400">
          {isFetching ? 'Carregando…' : 'Sem dados.'}
        </p>
      )}
    </div>
  );
}
