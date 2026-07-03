'use client';

import { UserPlus, MessageCircleReply, Inbox } from 'lucide-react';
import type { LeadsReport } from '@/features/dashboard/services/dashboard.service';

function StatCard({ label, value, sub, icon: Icon, accent }: {
  label: string; value: string | number; sub?: string; icon: React.ElementType; accent: string;
}) {
  return (
    <div className="flex flex-col rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">{label}</span>
        <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: `${accent}1a`, color: accent }}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <span className="mt-3 text-3xl font-bold tabular-nums text-zinc-900 dark:text-zinc-100">{value}</span>
      {sub && <span className="mt-1 text-xs text-zinc-400">{sub}</span>}
    </div>
  );
}

export function LeadsSection({ report }: { report?: LeadsReport }) {
  if (!report) return null;
  const fila = report.bySeller.find((s) => s.seller === null);
  const vendedores = report.bySeller.filter((s) => s.seller !== null);

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Leads / Distribuição</h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Novos leads" value={report.newLeads} icon={UserPlus} accent="#10b981" />
        <StatCard
          label="Responderam a 1ª msg"
          value={report.respondedRate !== null ? `${report.respondedRate}%` : '—'}
          sub={`${report.respondedLeads}/${report.proactiveLeads} proativos · ${report.receptiveLeads} receptivos`}
          icon={MessageCircleReply}
          accent="#3b82f6"
        />
        <StatCard label="Na fila (não distribuídos)" value={fila?.received ?? 0} icon={Inbox} accent="#f59e0b" />
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wider text-zinc-500 dark:border-zinc-800">
              <th className="px-4 py-3">Vendedor</th>
              <th className="px-4 py-3 text-right">Recebidos</th>
              <th className="px-4 py-3 text-right">Respondidos</th>
              <th className="px-4 py-3 text-right">Em aberto</th>
              <th className="px-4 py-3 text-right">Fechados</th>
              <th className="px-4 py-3 text-right">TMR 1ª resp.</th>
            </tr>
          </thead>
          <tbody>
            {vendedores.map((s) => (
              <tr key={s.seller!.id} className="border-b border-zinc-100 dark:border-zinc-800">
                <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">{s.seller!.name}</td>
                <td className="px-4 py-3 text-right tabular-nums">{s.received}</td>
                <td className="px-4 py-3 text-right tabular-nums">{s.responded}</td>
                <td className="px-4 py-3 text-right tabular-nums">{s.open}</td>
                <td className="px-4 py-3 text-right tabular-nums">{s.closed}</td>
                <td className="px-4 py-3 text-right tabular-nums">{s.avgFirstResponseMin !== null ? `${s.avgFirstResponseMin} min` : '—'}</td>
              </tr>
            ))}
            {fila && fila.received > 0 && (
              <tr className="bg-amber-50/50 dark:bg-amber-950/20">
                <td className="px-4 py-3 font-medium text-amber-700 dark:text-amber-500">Na fila / não distribuídos</td>
                <td className="px-4 py-3 text-right tabular-nums">{fila.received}</td>
                <td className="px-4 py-3 text-right tabular-nums">{fila.responded}</td>
                <td className="px-4 py-3 text-right tabular-nums">{fila.open}</td>
                <td className="px-4 py-3 text-right tabular-nums">{fila.closed}</td>
                <td className="px-4 py-3 text-right text-zinc-400">—</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
