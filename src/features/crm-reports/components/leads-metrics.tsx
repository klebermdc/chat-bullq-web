import type { LeadsReport } from '../services/crm-reports.service';

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-[11px] uppercase tracking-wide text-zinc-400">{label}</p>
      <p className="mt-0.5 text-lg font-bold text-zinc-900 dark:text-zinc-100">
        {value}
      </p>
      {hint && <p className="text-[11px] text-zinc-400">{hint}</p>}
    </div>
  );
}

const pctLabel = (p: number) => `${Math.round(p * 100)}%`;

export function LeadsMetrics({ m }: { m: LeadsReport['metrics'] }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Stat label="Leads" value={String(m.count)} />
        <Stat
          label="Com proposta"
          value={String(m.withProposal.count)}
          hint={pctLabel(m.withProposal.pct)}
        />
        <Stat
          label="Com deal"
          value={String(m.withDeal.count)}
          hint={pctLabel(m.withDeal.pct)}
        />
      </div>
      {m.byTag.length > 0 && (
        <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="mb-2 text-[11px] uppercase tracking-wide text-zinc-400">
            Por origem / tag
          </p>
          <div className="flex flex-wrap gap-2">
            {m.byTag.map((t) => (
              <span
                key={t.name}
                className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
              >
                {t.name} · <span className="font-semibold">{t.count}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
