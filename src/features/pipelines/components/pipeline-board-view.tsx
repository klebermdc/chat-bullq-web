'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { KanbanSquare, Settings } from 'lucide-react';
import { pipelinesService } from '@/features/pipelines/services/pipelines.service';
import { KanbanBoard } from '@/features/pipelines/components/kanban-board';
import { StagesDialog } from '@/features/pipelines/components/stages-dialog';

export function PipelineBoardView({ pipelineId }: { pipelineId: string }) {
  const [stagesOpen, setStagesOpen] = useState(false);

  const { data: board } = useQuery({
    queryKey: ['pipeline-board', pipelineId],
    queryFn: () => pipelinesService.getBoard(pipelineId),
    enabled: !!pipelineId,
  });

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <KanbanSquare className="h-5 w-5 text-primary" />
        <div className="flex-1">
          <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            {board?.pipeline?.name ?? 'Pipeline'}
          </h1>
          {board?.pipeline?.description && (
            <p className="text-xs text-zinc-500">
              {board.pipeline.description}
            </p>
          )}
        </div>
        <button
          onClick={() => setStagesOpen(true)}
          disabled={!board}
          className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          <Settings className="h-3.5 w-3.5" />
          Configurar stages
        </button>
      </div>
      <div className="flex-1 overflow-hidden pt-3">
        <KanbanBoard pipelineId={pipelineId} />
      </div>

      {board && (
        <StagesDialog
          open={stagesOpen}
          pipelineId={pipelineId}
          initialStages={board.stages}
          onClose={() => setStagesOpen(false)}
          onSaved={() => setStagesOpen(false)}
        />
      )}
    </div>
  );
}
