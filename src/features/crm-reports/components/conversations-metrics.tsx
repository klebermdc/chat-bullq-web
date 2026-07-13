import type { ConversationsReport } from '../services/crm-reports.service';

export const fmtDuration = (s: number | null) => {
  if (s == null) return '—';
  if (s < 60) return `${Math.round(s)}s`;
  if (s < 3600) return `${Math.round(s / 60)}min`;
  return `${(s / 3600).toFixed(1)}h`;
};

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

export function ConversationsMetrics({
  m,
}: {
  m: ConversationsReport['metrics'];
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        <Stat label="Conversas" value={String(m.count)} />
        <Stat label="Abertas" value={String(m.open)} />
        <Stat label="Finalizadas" value={String(m.closed)} />
        <Stat
          label="1ª resposta (média)"
          value={fmtDuration(m.avgFirstResponseSeconds)}
          hint={`${m.answeredCount} respondidas`}
        />
        <Stat label="Reaberturas" value={String(m.reopened)} />
      </div>
      {m.byChannel.length > 0 && (
        <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="mb-2 text-[11px] uppercase tracking-wide text-zinc-400">
            Por canal
          </p>
          <div className="flex flex-wrap gap-2">
            {m.byChannel.map((c) => (
              <span
                key={c.name}
                className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
              >
                {c.name} · <span className="font-semibold">{c.count}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
