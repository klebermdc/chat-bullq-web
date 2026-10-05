'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { KanbanSquare, Loader2 } from 'lucide-react';
import {
  pipelinesService,
  type Pipeline,
  type PipelineStage,
} from '@/features/pipelines/services/pipelines.service';
import { controlSmCls } from '@/components/ui/control';
import { Button } from '@/components/ui/button';

interface Props {
  count: number;
  disabled?: boolean;
  onConfirm: (pipelineId: string, stageId: string) => Promise<void>;
}

/**
 * Bulk action: drop selected conversations into a pipeline stage.
 *
 * Two-step picker (pipeline → stage filtered by pipeline) inside a popover.
 * Stages list comes embedded in /pipelines, so no second fetch — a single
 * cached query feeds the whole UI.
 */
/** Tipo da etapa como vem da API → rótulo. `NORMAL` não ganha sufixo. */
const STAGE_TYPE_LABEL: Record<string, string> = { WON: 'ganho', LOST: 'perdido' };

export function BulkPipelinePopover({ count, disabled, onConfirm }: Props) {
  const [open, setOpen] = useState(false);
  const [pipelineId, setPipelineId] = useState('');
  const [stageId, setStageId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const { data: pipelines = [] } = useQuery<Pipeline[]>({
    queryKey: ['pipelines'],
    queryFn: () => pipelinesService.list(),
    staleTime: 5 * 60 * 1000,
  });

  // Filter out archived pipelines + stages of the picked one. Sorting
  // stages by `order` matches the kanban view so the user picks "left to
  // right" without surprise.
  const visiblePipelines = useMemo(
    () => pipelines.filter((p) => !p.archived),
    [pipelines],
  );
  const stages = useMemo<PipelineStage[]>(() => {
    const p = pipelines.find((x) => x.id === pipelineId);
    return (p?.stages ?? []).slice().sort((a, b) => a.order - b.order);
  }, [pipelines, pipelineId]);

  // Click-outside to dismiss. Keeps the popover from feeling sticky after
  // the user moves on.
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  // Reset stage whenever pipeline changes — the previous stageId is
  // meaningless under a new pipeline.
  useEffect(() => {
    setStageId('');
  }, [pipelineId]);

  const handleConfirm = async () => {
    if (!pipelineId || !stageId) return;
    setSubmitting(true);
    try {
      await onConfirm(pipelineId, stageId);
      setOpen(false);
      // Don't reset selections — user might want to redo the same pick
      // on another batch. Will be cleared on next mount anyway.
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative" ref={popoverRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        title="Adicionar a um pipeline"
        aria-label="Adicionar conversas selecionadas a um pipeline"
        aria-expanded={open}
        className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary disabled:opacity-50"
      >
        <KanbanSquare className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-72 rounded-xl border border-border bg-popover p-3 shadow-elevated">
          <div className="mb-2 text-xs font-semibold text-foreground">
            Adicionar {count} {count === 1 ? 'conversa' : 'conversas'} a um
            pipeline
          </div>
          <label htmlFor="bulk-pipeline" className="mb-1 block text-xs font-medium text-muted-foreground">
            Pipeline
          </label>
          <select
            id="bulk-pipeline"
            value={pipelineId}
            onChange={(e) => setPipelineId(e.target.value)}
            className={`${controlSmCls} mb-2 w-full`}
          >
            <option value="">Selecione um pipeline…</option>
            {visiblePipelines.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {pipelineId && (
            <>
              <label htmlFor="bulk-stage" className="mb-1 block text-xs font-medium text-muted-foreground">
                Etapa
              </label>
              <select
                id="bulk-stage"
                value={stageId}
                onChange={(e) => setStageId(e.target.value)}
                className={`${controlSmCls} mb-3 w-full`}
              >
                <option value="">Selecione uma etapa…</option>
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                    {s.type !== 'NORMAL' ? ` (${STAGE_TYPE_LABEL[s.type] ?? s.type})` : ''}
                  </option>
                ))}
              </select>
            </>
          )}

          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirm}
              disabled={!pipelineId || !stageId}
              loading={submitting}
            >
              Adicionar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
