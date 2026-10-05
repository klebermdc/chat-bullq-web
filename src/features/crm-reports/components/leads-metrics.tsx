import { Briefcase, FileText, Users } from 'lucide-react';
import type { LeadsReport } from '../services/crm-reports.service';
import { StatCard } from '@/components/ui/stat-card';

const pctLabel = (p: number) => `${Math.round(p * 100)}%`;

export function LeadsMetrics({ m }: { m: LeadsReport['metrics'] }) {
  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="grid grid-cols-2 items-stretch gap-3 sm:grid-cols-3 sm:gap-4">
        {/* No mobile o total ocupa a linha inteira e os outros dois dividem a de baixo. */}
        <StatCard
          className="col-span-2 sm:col-span-1"
          label="Leads"
          value={m.count.toLocaleString('pt-BR')}
          icon={Users}
        />
        <StatCard
          label="Com proposta"
          value={m.withProposal.count.toLocaleString('pt-BR')}
          hint={pctLabel(m.withProposal.pct)}
          icon={FileText}
        />
        <StatCard
          label="Com negócio"
          value={m.withDeal.count.toLocaleString('pt-BR')}
          hint={pctLabel(m.withDeal.pct)}
          icon={Briefcase}
        />
      </div>
      {m.byTag.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4 shadow-soft sm:p-5">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Por origem / tag
          </p>
          <div className="flex flex-wrap gap-2">
            {m.byTag.map((t) => (
              <span
                key={t.name}
                className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground"
              >
                {t.name} · <span className="font-semibold tabular-nums text-foreground">{t.count.toLocaleString('pt-BR')}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
