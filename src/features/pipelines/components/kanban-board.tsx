'use client';

import { useState, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { pipelinesService, type CardSummary } from '../services/pipelines.service';
import { KanbanColumn } from './kanban-column';
import { KanbanCard } from './kanban-card';
import { CardDialog } from './card-dialog';
import { ClientCardDialog } from './client-card-dialog';
import { AddConversationDialog } from './add-conversation-dialog';
import { ConversationDialog } from '@/features/inbox/components/conversation-dialog';
import { PipelineFilterBar } from './pipeline-filter-bar';
import {
  type PipelineFilter,
  EMPTY_FILTER,
  applyFilters,
  deriveVendors,
  deriveMonths,
} from '../lib/pipeline-filters';

interface Props {
  pipelineId: string;
}

export function KanbanBoard({ pipelineId }: Props) {
  const qc = useQueryClient();
  const [activeCard, setActiveCard] = useState<CardSummary | null>(null);
  // Edit dialog (existing card)
  const [editingCard, setEditingCard] = useState<CardSummary | null>(null);
  // Add-conversation dialog (new card from existing conversation)
  const [addStageId, setAddStageId] = useState<string | null>(null);
  // Client card popup (primary click) — panorama do lead.
  const [viewingCard, setViewingCard] = useState<CardSummary | null>(null);
  // Conversation popup (chat), aberto a partir do Card do Cliente.
  const [viewingConvId, setViewingConvId] = useState<string | null>(null);
  const [filter, setFilter] = useState<PipelineFilter>(EMPTY_FILTER);

  const { data: board, isLoading } = useQuery({
    queryKey: ['pipeline-board', pipelineId],
    queryFn: () => pipelinesService.getBoard(pipelineId),
  });

  const allCards = useMemo(
    () => (board ? Object.values(board.cards).flat() : []),
    [board],
  );

  // Card do Cliente aberto: re-derivado do board vivo por id, senão a origem
  // (e demais campos) ficam congelados no snapshot do clique e a correção
  // manual parece não ter efeito após o refetch.
  const liveViewingCard = viewingCard
    ? (allCards.find((c) => c.id === viewingCard.id) ?? viewingCard)
    : null;
  const vendors = useMemo(() => deriveVendors(allCards), [allCards]);
  const entryMonths = useMemo(() => deriveMonths(allCards, 'createdAt'), [allCards]);
  const travelMonths = useMemo(
    () => deriveMonths(allCards, 'travelStartDate'),
    [allCards],
  );
  const filteredByStage = useMemo(() => {
    const out: Record<string, typeof allCards> = {};
    if (board) {
      for (const s of board.stages) {
        out[s.id] = applyFilters(board.cards[s.id] ?? [], filter);
      }
    }
    return out;
  }, [board, filter]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  // Build a fast lookup: cardId → { stageId, index } for the move handler.
  const cardIndex = useMemo(() => {
    const idx = new Map<string, { stageId: string; index: number }>();
    if (board) {
      for (const stageId of Object.keys(board.cards)) {
        board.cards[stageId].forEach((c, i) =>
          idx.set(c.id, { stageId, index: i }),
        );
      }
    }
    return idx;
  }, [board]);

  const handleDragStart = (event: DragStartEvent) => {
    const cardId = event.active.id as string;
    const data = event.active.data.current as any;
    if (data?.type === 'card') setActiveCard(data.card as CardSummary);
    else {
      // fallback: search the board
      for (const stageId of Object.keys(board?.cards ?? {})) {
        const found = board!.cards[stageId].find((c) => c.id === cardId);
        if (found) {
          setActiveCard(found);
          break;
        }
      }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveCard(null);
    const { active, over } = event;
    if (!over || !board) return;

    const cardId = active.id as string;
    const targetStageId = over.id as string;
    const target = board.stages.find((s) => s.id === targetStageId);
    if (!target) return;

    const source = cardIndex.get(cardId);
    if (!source) return;

    // Drop appends to end of target column.
    const toIndex =
      source.stageId === targetStageId
        ? Math.max(0, board.cards[targetStageId].length - 1)
        : board.cards[targetStageId].length;

    if (source.stageId === targetStageId && source.index === toIndex) return;

    // Optimistic: rebuild the board locally.
    qc.setQueryData<typeof board>(['pipeline-board', pipelineId], (prev) => {
      if (!prev) return prev;
      const newCards = { ...prev.cards };
      const sourceList = [...newCards[source.stageId]];
      const [moved] = sourceList.splice(source.index, 1);
      newCards[source.stageId] = sourceList;
      const targetList = [...(newCards[targetStageId] ?? [])];
      targetList.splice(toIndex, 0, { ...moved, stageId: targetStageId });
      newCards[targetStageId] = targetList;
      return { ...prev, cards: newCards };
    });

    try {
      await pipelinesService.moveCard(cardId, targetStageId, toIndex);
      // Server emits card:moved via socket; refetch to sync orders precisely.
      qc.invalidateQueries({ queryKey: ['pipeline-board', pipelineId] });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao mover');
      qc.invalidateQueries({ queryKey: ['pipeline-board', pipelineId] });
    }
  };

  if (isLoading || !board) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-zinc-400">
        Carregando board…
      </div>
    );
  }

  return (
    <>
      <div className="flex h-full flex-col">
        <PipelineFilterBar
          filter={filter}
          onChange={setFilter}
          stages={board.stages}
          vendors={vendors}
          entryMonths={entryMonths}
          travelMonths={travelMonths}
        />
        <div className="min-h-0 flex-1">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="flex h-full gap-3 overflow-x-auto px-4 pb-4">
              {board.stages.map((stage) => (
                <KanbanColumn
                  key={stage.id}
                  stage={stage}
                  cards={filteredByStage[stage.id] ?? []}
                  onAddCard={() => setAddStageId(stage.id)}
                  onCardClick={(c) => {
                    setViewingCard(c);
                  }}
                />
              ))}
            </div>
            <DragOverlay>
              {activeCard ? <KanbanCard card={activeCard} /> : null}
            </DragOverlay>
          </DndContext>
        </div>
      </div>

      <CardDialog
        open={!!editingCard}
        pipelineId={pipelineId}
        card={editingCard}
        stageId={null}
        onClose={() => setEditingCard(null)}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ['pipeline-board', pipelineId] });
          setEditingCard(null);
        }}
      />

      <ClientCardDialog
        open={!!viewingCard}
        card={liveViewingCard}
        onClose={() => setViewingCard(null)}
        onOpenConversation={(convId) => {
          setViewingCard(null);
          setViewingConvId(convId);
        }}
        onEdit={(c) => {
          setViewingCard(null);
          setEditingCard(c);
        }}
      />

      <AddConversationDialog
        open={!!addStageId}
        pipelineId={pipelineId}
        stageId={addStageId}
        onClose={() => setAddStageId(null)}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ['pipeline-board', pipelineId] });
          setAddStageId(null);
        }}
      />

      <ConversationDialog
        open={!!viewingConvId}
        conversationId={viewingConvId}
        onClose={() => setViewingConvId(null)}
      />
    </>
  );
}
