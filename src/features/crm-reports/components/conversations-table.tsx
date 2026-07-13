import type { ConversationsReport } from '../services/crm-reports.service';
import { fmtDuration } from './conversations-metrics';

const dt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('pt-BR') : '—';

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendente',
  BOT: 'Bot',
  OPEN: 'Aberta',
  WAITING: 'Aguardando',
  CLOSED: 'Finalizada',
};

export function ConversationsTable({
  report,
  onPage,
}: {
  report: ConversationsReport;
  onPage: (page: number) => void;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-200 text-left text-[11px] uppercase text-zinc-400 dark:border-zinc-800">
            <tr>
              <th className="px-3 py-2">Contato</th>
              <th className="px-3 py-2">Canal</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Atendente</th>
              <th className="px-3 py-2">1ª resposta</th>
              <th className="px-3 py-2">Reab.</th>
              <th className="px-3 py-2">Criada</th>
              <th className="px-3 py-2">Fechada</th>
            </tr>
          </thead>
          <tbody>
            {report.rows.map((r) => (
              <tr
                key={r.id}
                className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/60"
              >
                <td className="px-3 py-2">{r.contactName ?? '—'}</td>
                <td className="px-3 py-2">{r.channelName ?? '—'}</td>
                <td className="px-3 py-2">
                  {STATUS_LABEL[r.status] ?? r.status}
                </td>
                <td className="px-3 py-2">{r.assignedToName ?? '—'}</td>
                <td className="px-3 py-2">
                  {fmtDuration(r.firstResponseSeconds)}
                </td>
                <td className="px-3 py-2">
                  {r.reopenedCount > 0 ? r.reopenedCount : '—'}
                </td>
                <td className="px-3 py-2">{dt(r.createdAt)}</td>
                <td className="px-3 py-2">{dt(r.closedAt)}</td>
              </tr>
            ))}
            {report.rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-zinc-400">
                  Nenhuma conversa no filtro.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {report.totalPages > 1 && (
        <div className="flex items-center justify-between px-3 py-2 text-xs text-zinc-500">
          <span>
            Página {report.page} de {report.totalPages} · {report.total}{' '}
            conversas
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
