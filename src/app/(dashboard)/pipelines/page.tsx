'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { pipelinesService } from '@/features/pipelines/services/pipelines.service';
import { PipelinesListView } from '@/features/pipelines/components/pipelines-list-view';
import { PipelineBoardView } from '@/features/pipelines/components/pipeline-board-view';

/**
 * CRM numa página só: a lista e o board de cada pipeline dividem a mesma
 * rota e trocam por pílulas, em vez de virarem sub-linhas da sidebar.
 *
 * Diferente do Email, as pílulas são dinâmicas — uma por pipeline não
 * arquivado, vindas da mesma query que a árvore usava.
 *
 * O pipeline escolhido vive na URL (`?p=`) e não em estado local, pra
 * sobreviver a reload e poder ser linkado. Um `?p=` de pipeline
 * inexistente cai na lista, em vez de renderizar um board vazio.
 */
export default function CrmPage() {
  const searchParams = useSearchParams();
  const selectedId = searchParams.get('p');

  const { data: pipelines = [] } = useQuery({
    queryKey: ['pipelines'],
    queryFn: () => pipelinesService.list(),
    staleTime: 60_000,
  });

  const visible = pipelines.filter((p) => !p.archived);
  const selected = selectedId ? visible.find((p) => p.id === selectedId) : null;

  const pillClass = (isActive: boolean) =>
    `rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
      isActive
        ? 'bg-primary text-primary-foreground'
        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
    }`;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap gap-2 px-4 pt-4">
        <Link
          href="/pipelines"
          aria-current={!selected ? 'page' : undefined}
          className={pillClass(!selected)}
        >
          Todos
        </Link>
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
      </div>

      <div className="min-h-0 flex-1">
        {selected ? (
          <PipelineBoardView key={selected.id} pipelineId={selected.id} />
        ) : (
          <PipelinesListView />
        )}
      </div>
    </div>
  );
}
