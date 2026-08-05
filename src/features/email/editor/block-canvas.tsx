'use client';

import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import type { EditorBlock } from './editor-state';
import { BlockItem } from './block-item';

interface Props {
  blocks: EditorBlock[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onMove: (from: number, to: number) => void;
  onRemove: (id: string) => void;
  /** Conteúdo do acordeão do bloco selecionado (inspector). Opcional: o
   * canvas não depende do inspector para funcionar, ele só reserva o slot. */
  renderInspector?: (block: EditorBlock) => React.ReactNode;
}

export function BlockCanvas({ blocks, selectedId, onSelect, onMove, onRemove, renderInspector }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const from = blocks.findIndex((b) => b.id === active.id);
    const to = blocks.findIndex((b) => b.id === over.id);
    if (from === -1 || to === -1) return;

    onMove(from, to);
  };

  if (blocks.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        Nenhum bloco ainda. Adicione um pela paleta acima.
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {blocks.map((block, index) => (
            <BlockItem
              key={block.id}
              block={block}
              selected={block.id === selectedId}
              onSelect={() => onSelect(block.id)}
              onMove={(delta) => onMove(index, index + delta)}
              onRemove={() => onRemove(block.id)}
            >
              {renderInspector?.(block)}
            </BlockItem>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
