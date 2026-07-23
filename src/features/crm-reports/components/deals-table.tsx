import type { DealsReport } from '../services/crm-reports.service';

const brl = (n: number | null) =>
  n == null
    ? '—'
    : new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        maximumFractionDigits: 0,
      }).format(n);
const dt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('pt-BR') : '—';
const STATUS_LABEL: Record<string, string> = {
  OPEN: 'Aberto',
  WON: 'Ganho',
  LOST: 'Perdido',
};

export function DealsTable({
  report,
  onPage,
}: {
  report: DealsReport;
  onPage: (page: number) => void;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-200 text-left text-[11px] uppercase text-zinc-400 dark:border-zinc-800">
            <tr>
              <th className="px-3 py-2">Cliente</th>
              <th className="px-3 py-2">Etapa</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Valor</th>
              <th className="px-3 py-2">Atendente</th>
              <th className="px-3 py-2">Criado</th>
              <th className="px-3 py-2">Fechado</th>
            </tr>
          </thead>
          <tbody>
            {report.rows.map((r) => (
              <tr
                key={r.id}
                className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/60"
              >
                <td className="px-3 py-2">{r.contactName ?? '—'}</td>
                <td className="px-3 py-2">{r.stageName}</td>
                <td className="px-3 py-2">{STATUS_LABEL[r.status] ?? r.status}</td>
                <td className="px-3 py-2">{brl(r.value)}</td>
                <td className="px-3 py-2">{r.assignedToName ?? '—'}</td>
                <td className="px-3 py-2">{dt(r.createdAt)}</td>
                <td className="px-3 py-2">{dt(r.closedAt)}</td>
              </tr>
            ))}
            {report.rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-zinc-400">
                  Nenhum deal no filtro.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {report.totalPages > 1 && (
        <div className="flex items-center justify-between px-3 py-2 text-xs text-zinc-500">
          <span>
            Página {report.page} de {report.totalPages} · {report.total} deals
          </span>
          <div className="flex gap-1">
            <button
              disabled={report.page <= 1}
              onClick={() => onPage(report.page - 1)}
              className="rounded px-2 py-1 hover:bg-zinc-100 disabled:opacity-40 dark:hover:bg-zinc-800"
            >
              Anterior
            </button>
            <button
              disabled={report.page >= report.totalPages}
              onClick={() => onPage(report.page + 1)}
              className="rounded px-2 py-1 hover:bg-zinc-100 disabled:opacity-40 dark:hover:bg-zinc-800"
            >
              Próxima
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
