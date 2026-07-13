import type { DealsReport } from '../services/crm-reports.service';

const brl = (n: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(n);

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

export function DealsMetrics({ m }: { m: DealsReport['metrics'] }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
      <Stat label="Deals" value={String(m.count)} />
      <Stat label="Valor total" value={brl(m.totalValue)} />
      <Stat label="Ganhos" value={String(m.won.count)} hint={brl(m.won.value)} />
      <Stat label="Perdidos" value={String(m.lost.count)} hint={brl(m.lost.value)} />
      <Stat label="Conversão" value={`${Math.round(m.conversionRate * 100)}%`} />
      <Stat label="Ticket médio" value={brl(m.avgWonTicket)} />
    </div>
  );
}
