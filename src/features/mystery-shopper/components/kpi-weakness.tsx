import { cn } from '@/lib/utils';
import type { CriterionAverage, KpiOverall } from '../api';
import { formatAverage, heatClass } from '../kpis';
import { KpiSection } from './kpi-section';

function CriterionRow({ item }: { item: CriterionAverage }) {
  return (
    <li className="flex items-center justify-between gap-2 text-sm">
      <span className="min-w-0 truncate" title={item.label}>
        {item.label}
      </span>
      <span className={cn('shrink-0 rounded-md px-2 py-0.5 font-mono tabular-nums', heatClass(item.average))}>
        {formatAverage(item.average)}
      </span>
    </li>
  );
}

export function KpiWeakness({ overall }: { overall: KpiOverall }) {
  const weakest = overall.weakestCriterion;
  return (
    <KpiSection id="kpi-ponto-fraco" title="Ponto fraco da equipe">
      {weakest ? (
        <p className="mb-3 text-sm">
          <span className="font-semibold">{weakest.label}</span>
          <span className="ml-2 text-muted-foreground">média {formatAverage(weakest.average)}/2</span>
        </p>
      ) : (
        <p className="mb-3 text-sm text-muted-foreground">Sem critério avaliado neste mês.</p>
      )}
      <p className="mb-2 text-xs text-muted-foreground">Média da equipe por critério (0 a 2)</p>
      <ul className="space-y-1.5">
        {overall.criteriaAverages.map((item) => (
          <CriterionRow key={item.criterion} item={item} />
        ))}
      </ul>
    </KpiSection>
  );
}
