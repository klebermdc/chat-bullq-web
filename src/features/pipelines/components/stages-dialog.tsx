'use client';

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type Announcements,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  GripVertical,
  Trophy,
  XCircle,
  Circle,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  pipelinesService,
  type StageType,
  type PipelineStage,
} from '../services/pipelines.service';
import { getErrorMessage } from '@/lib/errors';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { controlCls } from '@/components/ui/control';
import { cn } from '@/lib/utils';

interface DraftStage {
  // Frontend-only id for dnd; if existing, also has serverId
  key: string;
  serverId?: string;
  name: string;
  color: string;
  type: StageType;
}

interface Props {
  open: boolean;
  pipelineId: string;
  initialStages: PipelineStage[];
  onClose: () => void;
  onSaved: () => void;
}

// Cores de etapa são dado escolhido pelo usuário (não são tokens de estado).
const COLORS: Array<{ name: string; label: string; cls: string }> = [
  { name: 'zinc', label: 'Cinza', cls: 'bg-zinc-400' },
  { name: 'blue', label: 'Azul', cls: 'bg-blue-500' },
  { name: 'amber', label: 'Âmbar', cls: 'bg-amber-500' },
  { name: 'green', label: 'Verde', cls: 'bg-green-500' },
  { name: 'red', label: 'Vermelho', cls: 'bg-red-500' },
  { name: 'violet', label: 'Violeta', cls: 'bg-violet-500' },
  { name: 'pink', label: 'Rosa', cls: 'bg-pink-500' },
];

const TYPE_OPTIONS: Array<{
  value: StageType;
  label: string;
  Icon: any;
  cls: string;
}> = [
  { value: 'NORMAL', label: 'Normal', Icon: Circle, cls: 'text-muted-foreground' },
  { value: 'WON', label: 'Ganho', Icon: Trophy, cls: 'text-success-ink' },
  { value: 'LOST', label: 'Perdido', Icon: XCircle, cls: 'text-urgent-ink' },
];

const ROW_ICON_BTN_CLS =
  'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
// `aria-disabled` (e não `disabled`) nas setas: na ponta da lista o botão
// continua com o foco, senão quem reordena pelo teclado se perde.
const MOVE_BTN_CLS = `${ROW_ICON_BTN_CLS} hover:bg-muted hover:text-foreground aria-disabled:cursor-not-allowed aria-disabled:opacity-40 aria-disabled:hover:bg-transparent aria-disabled:hover:text-muted-foreground`;

const nameInputId = (key: string) => `stage-name-${key}`;
const stageLabel = (name: string) => name.trim() || 'sem nome';

function makeKey() {
  return `s_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function SortableRow({
  stage,
  position,
  total,
  nameInvalid,
  onChange,
  onDelete,
  onMove,
}: {
  stage: DraftStage;
  /** Posição na lista, começando em 1. */
  position: number;
  total: number;
  /** Tentou salvar com o nome vazio. */
  nameInvalid: boolean;
  onChange: (patch: Partial<DraftStage>) => void;
  onDelete: () => void;
  onMove: (direction: -1 | 1) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stage.key });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const label = stageLabel(stage.name);
  const isFirst = position === 1;
  const isLast = position === total;
  const errorId = `${nameInputId(stage.key)}-error`;

  return (
    <div
      ref={setNodeRef}
      style={style}
      role="group"
      aria-label={`Etapa ${position}: ${label}`}
      className="space-y-2 rounded-xl border border-border bg-card p-3"
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="flex h-9 w-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
          aria-label={`Reordenar a etapa ${label}`}
          title="Arrastar para reordenar"
        >
          <GripVertical aria-hidden="true" className="h-4 w-4" />
        </button>

        <div className="min-w-0 flex-1">
          <input
            id={nameInputId(stage.key)}
            value={stage.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="Nome da etapa"
            aria-label={`Nome da etapa ${position}`}
            aria-invalid={nameInvalid || undefined}
            aria-describedby={nameInvalid ? errorId : undefined}
            className={cn(controlCls, 'w-full', nameInvalid && 'border-urgent')}
          />
          {nameInvalid && (
            <p id={errorId} className="mt-1 text-xs text-urgent-ink">
              Dê um nome para esta etapa.
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 sm:pl-10">
        {/* Mesmo desenho das cores de tag (Configurações › Tags): quadrado
            arredondado, anel e "check" na escolhida. */}
        <div role="group" aria-label="Cor da etapa" className="flex flex-wrap gap-2">
          {COLORS.map((c) => {
            const selected = stage.color === c.name;
            return (
              <button
                key={c.name}
                type="button"
                aria-pressed={selected}
                aria-label={c.label}
                title={c.label}
                onClick={() => onChange({ color: c.name })}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-lg transition-transform',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card',
                  c.cls,
                  selected ? 'ring-2 ring-foreground ring-offset-2 ring-offset-card' : 'hover:scale-105',
                )}
              >
                {selected && <Check aria-hidden="true" className="h-4 w-4 text-white" strokeWidth={3} />}
              </button>
            );
          })}
        </div>

        {/* Controle segmentado discreto: o único botão cheio do diálogo é o Salvar. */}
        <div
          role="group"
          aria-label="Tipo da etapa"
          className="inline-flex rounded-lg bg-muted p-0.5"
        >
          {TYPE_OPTIONS.map((t) => {
            const active = stage.type === t.value;
            return (
              <button
                key={t.value}
                type="button"
                aria-pressed={active}
                onClick={() => onChange({ type: t.value })}
                className={cn(
                  'inline-flex h-7 items-center gap-1 rounded-md px-2.5 text-xs font-medium transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  active
                    ? 'bg-background text-foreground shadow-soft'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <t.Icon aria-hidden="true" className={`h-3 w-3 ${t.cls}`} />
                {t.label}
              </button>
            );
          })}
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={() => !isFirst && onMove(-1)}
            aria-disabled={isFirst}
            aria-label={`Mover a etapa ${label} para cima`}
            title="Mover para cima"
            className={MOVE_BTN_CLS}
          >
            <ChevronUp aria-hidden="true" className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => !isLast && onMove(1)}
            aria-disabled={isLast}
            aria-label={`Mover a etapa ${label} para baixo`}
            title="Mover para baixo"
            className={MOVE_BTN_CLS}
          >
            <ChevronDown aria-hidden="true" className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className={`${ROW_ICON_BTN_CLS} hover:bg-urgent-wash hover:text-urgent-ink`}
            title="Excluir etapa"
            aria-label={`Excluir a etapa ${label}`}
          >
            <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function StagesDialog({
  open,
  pipelineId,
  initialStages,
  onClose,
  onSaved,
}: Props) {
  const qc = useQueryClient();
  const [stages, setStages] = useState<DraftStage[]>([]);
  const [saving, setSaving] = useState(false);
  // Só acusa nome vazio depois da primeira tentativa de salvar.
  const [showNameErrors, setShowNameErrors] = useState(false);
  // Lido pelo leitor de tela quando a ordem muda pelas setas.
  const [moveStatus, setMoveStatus] = useState('');

  useEffect(() => {
    if (open) {
      setShowNameErrors(false);
      setMoveStatus('');
      setStages(
        initialStages.map((s) => ({
          key: s.id,
          serverId: s.id,
          name: s.name,
          color: s.color ?? 'zinc',
          type: s.type,
        })),
      );
    }
  }, [open, initialStages]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    // Espaço pega a etapa, setas movem, Espaço solta, Esc cancela.
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  if (!open) return null;

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setStages((prev) => {
      const oldIdx = prev.findIndex((s) => s.key === active.id);
      const newIdx = prev.findIndex((s) => s.key === over.id);
      if (oldIdx < 0 || newIdx < 0) return prev;
      return arrayMove(prev, oldIdx, newIdx);
    });
  };

  const handleMove = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= stages.length) return;
    setStages((prev) => arrayMove(prev, index, target));
    setMoveStatus(
      `Etapa ${stageLabel(stages[index].name)} movida para a posição ${target + 1} de ${stages.length}.`,
    );
  };

  const positionOf = (id: string | number) =>
    stages.findIndex((s) => s.key === id) + 1;
  const nameOf = (id: string | number) =>
    stageLabel(stages.find((s) => s.key === id)?.name ?? '');

  // Avisos do arraste pelo teclado em português (o padrão do dnd-kit é inglês).
  const announcements: Announcements = {
    onDragStart: ({ active }) =>
      `Etapa ${nameOf(active.id)} selecionada, na posição ${positionOf(active.id)} de ${stages.length}.`,
    onDragOver: ({ active, over }) =>
      over
        ? `Etapa ${nameOf(active.id)} na posição ${positionOf(over.id)} de ${stages.length}.`
        : undefined,
    onDragEnd: ({ active, over }) =>
      over
        ? `Etapa ${nameOf(active.id)} solta na posição ${positionOf(over.id)} de ${stages.length}.`
        : `Etapa ${nameOf(active.id)} solta.`,
    onDragCancel: ({ active }) =>
      `Reordenação cancelada. A etapa ${nameOf(active.id)} voltou para a posição original.`,
  };

  const handleAdd = () => {
    setStages((prev) => [
      ...prev,
      { key: makeKey(), name: '', color: 'zinc', type: 'NORMAL' },
    ]);
  };

  const handleSave = async () => {
    const firstUnnamed = stages.find((s) => !s.name.trim());
    if (firstUnnamed) {
      setShowNameErrors(true);
      toast.error('Toda etapa precisa de um nome');
      document.getElementById(nameInputId(firstUnnamed.key))?.focus();
      return;
    }
    setSaving(true);
    try {
      await pipelinesService.upsertStages(
        pipelineId,
        stages.map((s, idx) => ({
          ...(s.serverId ? { id: s.serverId } : {}),
          name: s.name.trim(),
          color: s.color,
          type: s.type,
          order: idx,
        })),
      );
      toast.success('Etapas atualizadas');
      qc.invalidateQueries({ queryKey: ['pipeline-board', pipelineId] });
      qc.invalidateQueries({ queryKey: ['pipelines'] });
      onSaved();
    } catch (err: any) {
      toast.error(
        getErrorMessage(err, 'Erro ao salvar as etapas'),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      dismissible={false}
      size="xl"
      title="Configurar etapas"
      description="Adicione, renomeie, reordene (arrastando ou pelas setas) ou troque o tipo. Etapa com cards não pode ser excluída."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || stages.length === 0}>
            {saving ? 'Salvando…' : 'Salvar etapas'}
          </Button>
        </>
      }
    >
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        accessibility={{
          announcements,
          screenReaderInstructions: {
            draggable:
              'Para reordenar, pressione Espaço para pegar a etapa, use as setas para cima e para baixo para mover e Espaço de novo para soltar. Esc cancela.',
          },
        }}
      >
        <SortableContext
          items={stages.map((s) => s.key)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {stages.map((s, idx) => (
              <SortableRow
                key={s.key}
                stage={s}
                position={idx + 1}
                total={stages.length}
                nameInvalid={showNameErrors && !s.name.trim()}
                onMove={(direction) => handleMove(idx, direction)}
                onChange={(patch) =>
                  setStages((prev) =>
                    prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)),
                  )
                }
                onDelete={() =>
                  setStages((prev) => prev.filter((_, i) => i !== idx))
                }
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <p aria-live="polite" className="sr-only">
        {moveStatus}
      </p>

      <button
        type="button"
        onClick={handleAdd}
        className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-input px-3 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
      >
        <Plus aria-hidden="true" className="h-3.5 w-3.5" />
        Adicionar etapa
      </button>

      <p className="mt-4 text-xs text-muted-foreground">
        <strong className="text-foreground">Normal</strong>: etapa
        intermediária. <strong className="text-foreground">Ganho</strong>: o
        card arrastado para cá é marcado como ganho e fechado na hora.{' '}
        <strong className="text-foreground">Perdido</strong>: o mesmo, marcando
        como perdido.
      </p>
    </Dialog>
  );
}
