'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Search, ExternalLink, FolderKanban } from 'lucide-react';
import { useOrgId } from '@/hooks/use-org-query-key';
import { membersService } from '@/features/settings/services/members.service';
import { projectsService } from '../services/projects.service';
import { PROJECT_STATUSES, hoppeTaskUrl } from '../project-fields';
import { controlCls } from '@/components/ui/control';
import { EmptyState } from '@/components/ui/empty-state';

const TH_CLS = 'px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground';
const EMPTY_CELL = <span className="text-muted-foreground">—</span>;

export function ProjectsTable() {
  const orgId = useOrgId();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [responsibleUserId, setResponsibleUserId] = useState('');

  const { data: members = [] } = useQuery({
    queryKey: ['org-members'],
    queryFn: () => membersService.list(),
    staleTime: 60_000,
  });

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['projects', orgId, { status, responsibleUserId }],
    queryFn: () =>
      projectsService.list({
        status: status || undefined,
        responsibleUserId: responsibleUserId || undefined,
      }),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.hoppeId ?? '').toLowerCase().includes(q),
    );
  }, [rows, search]);

  const openProject = (conversationId: string) => {
    router.push(`/inbox?conversationId=${conversationId}`);
  };

  return (
    <div className="mx-auto w-full max-w-6xl p-4 sm:p-6">
      <div className="flex items-center gap-2">
        <FolderKanban aria-hidden="true" className="h-6 w-6 shrink-0 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Projetos
        </h1>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Cada grupo de WhatsApp é um projeto. Clique para abrir no atendimento.
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64">
          <Search aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className={`${controlCls} w-full pl-8`}
            placeholder="Buscar por nome ou ID do Hoppe…"
            aria-label="Buscar projeto por nome ou ID do Hoppe"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className={`${controlCls} min-w-0 flex-1 sm:flex-none`}
          aria-label="Filtrar por status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">Todos os status</option>
          {PROJECT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          className={`${controlCls} min-w-0 flex-1 sm:flex-none`}
          aria-label="Filtrar por responsável"
          value={responsibleUserId}
          onChange={(e) => setResponsibleUserId(e.target.value)}
        >
          <option value="">Todos os responsáveis</option>
          {members
            .filter((m) => m.user.isActive)
            .map((m) => (
              <option key={m.user.id} value={m.user.id}>
                {m.user.name}
              </option>
            ))}
        </select>
      </div>

      <div className="mt-5 overflow-x-auto rounded-xl border border-border bg-card shadow-soft">
        <table aria-label="Projetos" className="w-full min-w-[560px] text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th scope="col" className={TH_CLS}>Projeto</th>
              <th scope="col" className={TH_CLS}>Status</th>
              <th scope="col" className={TH_CLS}>Responsável</th>
              <th scope="col" className={TH_CLS}>Hoppe</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={4} className="px-4 py-3">
                    <div className="h-5 animate-pulse rounded bg-muted" />
                  </td>
                </tr>
              ))
            ) : filtered.length > 0 ? (
              filtered.map((r) => (
                <tr
                  key={r.groupJid}
                  tabIndex={0}
                  onClick={() => openProject(r.representativeConversationId)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.target === e.currentTarget) {
                      openProject(r.representativeConversationId);
                    }
                  }}
                  className="cursor-pointer transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none"
                >
                  <th scope="row" className="px-4 py-3 text-left font-medium text-foreground">
                    {r.name}
                  </th>
                  <td className="px-4 py-3">
                    {r.status ? (
                      <span className="whitespace-nowrap rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        {r.status}
                      </span>
                    ) : (
                      EMPTY_CELL
                    )}
                  </td>
                  <td className="px-4 py-3 text-foreground">
                    {r.responsible?.name ?? EMPTY_CELL}
                  </td>
                  <td className="px-4 py-3">
                    {r.hoppeId ? (
                      <a
                        href={hoppeTaskUrl(r.hoppeId)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 font-mono tabular-nums text-primary hover:underline"
                      >
                        {r.hoppeId}
                        <ExternalLink aria-hidden="true" className="h-3 w-3" />
                      </a>
                    ) : (
                      EMPTY_CELL
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4}>
                  <EmptyState
                    size="sm"
                    icon={FolderKanban}
                    title="Nenhum projeto encontrado"
                    description={
                      search || status || responsibleUserId
                        ? 'Ajuste a busca ou os filtros para ver outros projetos.'
                        : 'Cada grupo de WhatsApp vira um projeto aqui.'
                    }
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
