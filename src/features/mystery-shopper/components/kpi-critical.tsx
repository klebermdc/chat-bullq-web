import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/features/crm-reports/components/table-parts';
import type { CriticalVisit } from '../api';
import { CRITICAL_REASON_LABEL } from '../kpis';
import { KpiSection } from './kpi-section';

export function KpiCritical({ visits, onOpenVisit }: { visits: CriticalVisit[]; onOpenVisit: (id: string) => void }) {
  return (
    <KpiSection id="kpi-erros-graves" title="Erros graves">
      {visits.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum erro grave neste mês.</p>
      ) : (
        <ul className="divide-y divide-border">
          {visits.map((v) => (
            <li key={v.visitId}>
              <button
                type="button"
                onClick={() => onOpenVisit(v.visitId)}
                aria-label={`Abrir visita de ${v.sellerName} em ${formatDate(v.evaluatedAt)}: ${CRITICAL_REASON_LABEL[v.reason]}`}
                className="flex w-full items-center justify-between gap-2 rounded-md px-1 py-2 text-left text-sm hover:bg-muted/50"
              >
                <span className="min-w-0 truncate">
                  {v.sellerName}
                  <span className="ml-2 text-xs text-muted-foreground">{formatDate(v.evaluatedAt)}</span>
                </span>
                <Badge variant="urgent">{CRITICAL_REASON_LABEL[v.reason]}</Badge>
              </button>
            </li>
          ))}
        </ul>
      )}
    </KpiSection>
  );
}
