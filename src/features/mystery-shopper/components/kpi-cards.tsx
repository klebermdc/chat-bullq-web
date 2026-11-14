import { StatCard } from '@/components/ui/stat-card';
import type { KpiOverall } from '../api';
import { APPROVED_MIN_SCORE, formatMinutes, formatPct, formatScore, scoreDelta } from '../kpis';

export function KpiCards({ overall }: { overall: KpiOverall }) {
  const openHint = overall.openVisits > 0 ? `${overall.openVisits} em andamento` : undefined;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <StatCard size="sm" label="Visitas avaliadas" value={String(overall.visits)} hint={openHint} />
      <StatCard
        size="sm"
        label="Nota média"
        value={formatScore(overall.averageScore)}
        hint={scoreDelta(overall.averageScore, overall.previousAverageScore) ?? undefined}
      />
      <StatCard
        size="sm"
        label="Aprovadas"
        value={formatPct(overall.approvedPct)}
        hint={`nota ${APPROVED_MIN_SCORE} ou mais`}
      />
      <StatCard
        size="sm"
        label="1ª resposta"
        value={formatMinutes(overall.medianFirstReplyMinutes)}
        hint="mediana"
      />
      <StatCard size="sm" label="Respondidas em até 15 min" value={formatPct(overall.within15MinPct)} />
    </div>
  );
}
