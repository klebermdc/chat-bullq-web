'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Settings2 } from 'lucide-react';
import { pipelinesService } from '@/features/pipelines/services/pipelines.service';
import { PipelinesListView } from '@/features/pipelines/components/pipelines-list-view';
import { PipelineBoardView } from '@/features/pipelines/components/pipeline-board-view';

/** `?p=` que abre a gestão de pipelines (criar, apagar, definir padrão). */
const MANAGE_PARAM = 'gerenciar';

/**
 * CRM numa página só: o board de cada pipeline troca por pílulas, uma por
 * pipeline não arquivado.
 *
 * O pipeline escolhido vive na URL (`?p=`) pra sobreviver a reload e poder
 * ser linkado. Sem `?p=` (ou com um inexistente) abre o pipeline padrão — não
 * há mais a pílula "Todos". A lista de gestão fica atrás da engrenagem
 * (`?p=gerenciar`) e aparece sozinha quando ainda não existe pipeline.
 */
export default function CrmPage() {
  const searchParams = useSearchParams();
  const selectedId = searchParams.get('p');

  const { data: pipelines = [], isLoading } = useQuery({
    queryKey: ['pipelines'],
    queryFn: () => pipelinesService.list(),
    staleTime: 60_000,
  });

  const visible = pipelines.filter((p) => !p.archived);
  const isManaging = selectedId === MANAGE_PARAM;
  const fallback = visible.find((p) => p.isDefault) ?? visible[0] ?? null;
  const selected = isManaging
    ? null
    : (visible.find((p) => p.id === selectedId) ?? fallback);

  const pillClass = (isActive: boolean) =>
    `inline-flex h-9 shrink-0 items-center whitespace-nowrap rounded-full px-4 text-sm font-medium transition-colors ${
      isActive
        ? 'bg-primary text-primary-foreground'
        : 'bg-muted text-muted-foreground hover:text-foreground'
    }`;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Uma linha só: no celular as pílulas rolam para o lado em vez de
          quebrar e deixar uma órfã na segunda linha. */}
      <nav
        aria-label="Pipelines"
        className="scrollbar-none flex shrink-0 flex-nowrap items-center gap-2 overflow-x-auto px-4 pb-1 pt-4"
      >
        {visible.map((p) => (
          <Link
            key={p.id}
            href={`/pipelines?p=${p.id}`}
            aria-current={selected?.id === p.id ? 'page' : undefined}
            className={pillClass(selected?.id === p.id)}
          >
            {p.name}
          </Link>
        ))}
        <Link
          href={`/pipelines?p=${MANAGE_PARAM}`}
          aria-current={isManaging ? 'page' : undefined}
          aria-label="Gerenciar pipelines"
          title="Gerenciar pipelines"
          className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors ${
            isManaging
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <Settings2 aria-hidden="true" className="h-4 w-4" />
        </Link>
      </nav>

      <div className="min-h-0 flex-1">
        {selected ? (
          <PipelineBoardView key={selected.id} pipelineId={selected.id} />
        ) : isLoading && !isManaging ? null : (
          <PipelinesListView />
        )}
      </div>
    </div>
  );
}
