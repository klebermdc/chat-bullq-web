import { CheckCircle2, Clock, MessageCircle, MessagesSquare, RotateCcw } from 'lucide-react';
import type { ConversationsReport } from '../services/crm-reports.service';
import { StatCard } from '@/components/ui/stat-card';

const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3600;

export const fmtDuration = (s: number | null) => {
  if (s == null) return '—';
  if (s < SECONDS_PER_MINUTE) return `${Math.round(s)}s`;
  if (s < SECONDS_PER_HOUR) return `${Math.round(s / SECONDS_PER_MINUTE)}min`;
  const hours = (s / SECONDS_PER_HOUR).toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  return `${hours}h`;
};

export function ConversationsMetrics({
  m,
}: {
  m: ConversationsReport['metrics'];
}) {
  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Cinco cartões: até `xl` o total ocupa a linha inteira e os outros
          quatro formam 2 × 2; a partir daí cabem os cinco lado a lado. */}
      <div className="grid grid-cols-2 items-stretch gap-3 sm:gap-4 xl:grid-cols-5">
        <StatCard
          className="col-span-2 xl:col-span-1"
          label="Conversas"
          value={m.count.toLocaleString('pt-BR')}
          icon={MessagesSquare}
        />
        <StatCard label="Abertas" value={m.open.toLocaleString('pt-BR')} icon={MessageCircle} />
        <StatCard label="Finalizadas" value={m.closed.toLocaleString('pt-BR')} icon={CheckCircle2} />
        <StatCard
          label="1ª resposta (média)"
          value={fmtDuration(m.avgFirstResponseSeconds)}
          hint={`${m.answeredCount.toLocaleString('pt-BR')} respondidas`}
          icon={Clock}
        />
        <StatCard label="Reaberturas" value={m.reopened.toLocaleString('pt-BR')} icon={RotateCcw} />
      </div>
      {m.byChannel.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4 shadow-soft sm:p-5">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Por canal
          </p>
          <div className="flex flex-wrap gap-2">
            {m.byChannel.map((c) => (
              <span
                key={c.name}
                className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground"
              >
                {c.name} · <span className="font-semibold tabular-nums text-foreground">{c.count.toLocaleString('pt-BR')}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
