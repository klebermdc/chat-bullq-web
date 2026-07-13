import type { LeadsReport } from '../services/crm-reports.service';

const dt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('pt-BR') : '—';
const TEMP: Record<number, string> = { 1: '🧊', 2: '🌤️', 3: '🔥' };

export function LeadsTable({
  report,
  onPage,
}: {
  report: LeadsReport;
  onPage: (page: number) => void;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-200 text-left text-[11px] uppercase text-zinc-400 dark:border-zinc-800">
            <tr>
              <th className="px-3 py-2">Nome</th>
              <th className="px-3 py-2">Telefone</th>
              <th className="px-3 py-2">Canal</th>
              <th className="px-3 py-2">Atendente</th>
              <th className="px-3 py-2">Tags</th>
              <th className="px-3 py-2">Prop.</th>
              <th className="px-3 py-2">Deal</th>
              <th className="px-3 py-2">Temp.</th>
              <th className="px-3 py-2">Criado</th>
            </tr>
          </thead>
          <tbody>
            {report.rows.map((r) => (
              <tr
                key={r.id}
                className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/60"
              >
                <td className="px-3 py-2">{r.name ?? '—'}</td>
                <td className="px-3 py-2">{r.phone ?? '—'}</td>
                <td className="px-3 py-2">{r.channelName ?? '—'}</td>
                <td className="px-3 py-2">{r.assignedToName ?? '—'}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    {r.tags.slice(0, 3).map((t) => (
                      <span
                        key={t}
                        className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                      >
                        {t}
                      </span>
                    ))}
                    {r.tags.length > 3 && (
                      <span className="text-[10px] text-zinc-400">
                        +{r.tags.length - 3}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2">{r.hasProposal ? '✓' : '—'}</td>
                <td className="px-3 py-2">{r.hasDeal ? '✓' : '—'}</td>
                <td className="px-3 py-2">
                  {r.temperature ? TEMP[r.temperature] ?? '' : '—'}
                </td>
                <td className="px-3 py-2">{dt(r.createdAt)}</td>
              </tr>
            ))}
            {report.rows.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-6 text-center text-zinc-400">
                  Nenhum lead no filtro.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {report.totalPages > 1 && (
        <div className="flex items-center justify-between px-3 py-2 text-xs text-zinc-500">
          <span>
            Página {report.page} de {report.totalPages} · {report.total} leads
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
