'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { KanbanSquare, Settings } from 'lucide-react';
import { pipelinesService } from '@/features/pipelines/services/pipelines.service';
import { KanbanBoard } from '@/features/pipelines/components/kanban-board';
import { StagesDialog } from '@/features/pipelines/components/stages-dialog';
import { Button } from '@/components/ui/button';

export function PipelineBoardView({ pipelineId }: { pipelineId: string }) {
  const [stagesOpen, setStagesOpen] = useState(false);

  const { data: board } = useQuery({
    queryKey: ['pipeline-board', pipelineId],
    queryFn: () => pipelinesService.getBoard(pipelineId),
    enabled: !!pipelineId,
  });

  return (
    <div className="flex h-full flex-col">
      {/* Cabeçalho compacto: o quadro precisa da altura. */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <KanbanSquare aria-hidden="true" className="h-5 w-5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold text-foreground">
            {board?.pipeline?.name ?? 'Pipeline'}
          </h1>
          {board?.pipeline?.description && (
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {board.pipeline.description}
            </p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setStagesOpen(true)}
          disabled={!board}
          aria-label="Configurar etapas"
          title="Configurar etapas"
          className="shrink-0"
        >
          <Settings aria-hidden="true" className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Configurar etapas</span>
        </Button>
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
