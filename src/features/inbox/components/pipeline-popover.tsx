'use client';

import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import {
  ChevronDown,
  KanbanSquare,
  Loader2,
  Plus,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  pipelinesService,
  type ConversationCard,
  type Pipeline,
  type PipelineStage,
} from '@/features/pipelines/services/pipelines.service';
import { type Conversation } from '../services/inbox.service';
import { getErrorMessage } from '@/lib/errors';
import { controlSmCls } from '@/components/ui/control';

interface Props {
  conversation: Conversation;
  onChanged?: () => void;
}

/**
 * Popover do header da conversa pra gerenciar a presença em pipelines.
 *
 * - Lista os pipelines em que a conversa já está (1 linha cada com select
 *   de stage + botão lixeira pra remover).
 * - Permite adicionar a um pipeline novo (escolhe pipeline + stage).
 *
 * Reutiliza os endpoints existentes:
 *   GET  /pipelines/cards/by-conversation/:id  → lista atual
 *   POST /pipelines/:pid/cards                  → adiciona
 *   POST /pipelines/cards/:cid/move             → troca de stage
 *   DEL  /pipelines/cards/:cid                  → remove
 */
/** Tipo da etapa como vem da API → rótulo. `NORMAL` não ganha sufixo. */
const STAGE_TYPE_LABEL: Record<string, string> = { WON: 'ganho', LOST: 'perdido' };

export function PipelinePopover({ conversation, onChanged }: Props) {
  const qc = useQueryClient();
  const [busyCardId, setBusyCardId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [pickPipeline, setPickPipeline] = useState('');
  const [pickStage, setPickStage] = useState('');

  const { data: pipelines = [] } = useQuery<Pipeline[]>({
    queryKey: ['pipelines'],
    queryFn: () => pipelinesService.list(),
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: cards = [],
    isLoading,
    refetch,
  } = useQuery<ConversationCard[]>({
    queryKey: ['conversation-pipelines', conversation.id],
    queryFn: () => pipelinesService.listByConversation(conversation.id),
    staleTime: 30_000,
  });

  // Pipelines em que a conversa AINDA não está — pra oferecer no "Adicionar".
  const availablePipelines = useMemo(() => {
    const inUse = new Set(cards.map((c) => c.pipelineId));
    return pipelines.filter((p) => !p.archived && !inUse.has(p.id));
  }, [pipelines, cards]);

  const stagesOf = (pipelineId: string): PipelineStage[] => {
    const p = pipelines.find((x) => x.id === pipelineId);
    return (p?.stages ?? []).slice().sort((a, b) => a.order - b.order);
  };

  const invalidate = () => {
    qc.invalidateQueries({
      queryKey: ['conversation-pipelines', conversation.id],
    });
    qc.invalidateQueries({ queryKey: ['pipeline-board'] });
    refetch();
    onChanged?.();
  };

  const handleStageChange = async (card: ConversationCard, stageId: string) => {
    if (stageId === card.stageId) return;
    setBusyCardId(card.id);
    try {
      // toIndex: 0 — manda pro topo da nova coluna; o backend ajusta os
      // outros cards. Não dá pra "manter a posição" porque a posição é por
      // stage, e a stage mudou. Topo é a convenção mais previsível.
      await pipelinesService.moveCard(card.id, stageId, 0);
      toast.success('Estágio atualizado');
      invalidate();
    } catch (err: any) {
      toast.error(getErrorMessage(err, 'Erro ao trocar estágio'));
    } finally {
      setBusyCardId(null);
    }
  };

  /**
   * Trocar de pipeline = remove o card atual + cria um novo no pipeline
   * destino (com a 1ª stage NORMAL ou a 1ª disponível). O backend não tem
   * "moveCard cross-pipeline" porque um card pertence a 1 pipeline + 1
   * stage daquele pipeline; remove+create preserva a referência da
   * conversa e o histórico do pipeline antigo (deletion cascade só limpa
   * o card daquele kanban).
   */
  const handlePipelineChange = async (
    card: ConversationCard,
    newPipelineId: string,
  ) => {
    if (newPipelineId === card.pipelineId) return;
    const target = pipelines.find((p) => p.id === newPipelineId);
    if (!target) return;
    const targetStages = stagesOf(newPipelineId);
    const firstStage =
      targetStages.find((s) => s.type === 'NORMAL') ?? targetStages[0];
    if (!firstStage) {
      toast.error(`"${target.name}" não tem estágios configurados`);
      return;
    }
    setBusyCardId(card.id);
    try {
      await pipelinesService.removeCard(card.id);
      await pipelinesService.createCard(newPipelineId, {
        conversationId: conversation.id,
        stageId: firstStage.id,
      });
      toast.success(`Movida pra "${target.name}"`);
      invalidate();
    } catch (err: any) {
      toast.error(getErrorMessage(err, 'Erro ao trocar pipeline'));
      // Reload pra refletir o estado real (caso o remove tenha passado e o
      // create tenha falhado, o user precisa ver a conversa fora do
      // pipeline original).
      invalidate();
    } finally {
      setBusyCardId(null);
    }
  };

  const handleRemove = async (card: ConversationCard) => {
    setBusyCardId(card.id);
    try {
      await pipelinesService.removeCard(card.id);
      toast.success(`Removida de "${card.pipeline.name}"`);
      invalidate();
    } catch (err: any) {
      toast.error(getErrorMessage(err, 'Erro ao remover'));
    } finally {
      setBusyCardId(null);
    }
  };

  const handleAdd = async () => {
    if (!pickPipeline || !pickStage) return;
    setAdding(true);
    try {
      await pipelinesService.createCard(pickPipeline, {
        conversationId: conversation.id,
        stageId: pickStage,
      });
      toast.success('Adicionada ao pipeline');
      setPickPipeline('');
      setPickStage('');
      invalidate();
    } catch (err: any) {
      toast.error(
        getErrorMessage(err, 'Erro ao adicionar ao pipeline'),
      );
    } finally {
      setAdding(false);
    }
  };

  const buttonLabel = () => {
    if (cards.length === 0) return 'Pipeline';
    if (cards.length === 1) return cards[0].pipeline.name;
    return `${cards.length} pipelines`;
  };

  return (
    <Popover className="relative">
      <PopoverButton
        title={`Funil: ${buttonLabel()}`}
        aria-label="Gerenciar funil da conversa"
        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-2 text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[open]:bg-muted"
      >
        <KanbanSquare className="h-3.5 w-3.5" />
        <span className="hidden max-w-[120px] truncate @[64rem]/header:inline">{buttonLabel()}</span>
        <ChevronDown className="h-3 w-3 text-muted-foreground" />
      </PopoverButton>

      <PopoverPanel
        anchor="bottom end"
        transition
        className="z-50 mt-1.5 w-80 rounded-lg border border-border bg-card p-3 shadow-elevated outline-none transition duration-100 ease-out data-[closed]:scale-95 data-[closed]:opacity-0 [--anchor-gap:0.25rem]"
      >
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Pipelines desta conversa
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-4 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : cards.length === 0 ? (
          <p className="rounded-md border border-dashed border-border px-3 py-3 text-center text-[11px] text-muted-foreground">
            Não está em nenhum pipeline
          </p>
        ) : (
          <div className="space-y-1.5">
            {cards.map((card) => {
              const stages = stagesOf(card.pipelineId);
              const busy = busyCardId === card.id;
              // Pipelines disponíveis pra trocar este card pra outro: todos
              // os não-arquivados que (a) sejam o atual ou (b) ainda não
              // tenham a conversa. Isso impede colidir com o "já está no
              // pipeline" do backend.
              const otherPipelineIds = new Set(
                cards.filter((c) => c.id !== card.id).map((c) => c.pipelineId),
              );
              const swapOptions = pipelines.filter(
                (p) =>
                  !p.archived &&
                  (p.id === card.pipelineId || !otherPipelineIds.has(p.id)),
              );
              return (
                <div
                  key={card.id}
                  className="flex items-center gap-1.5 rounded-md border border-border bg-muted/50 px-2 py-1.5"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <select
                      value={card.pipelineId}
                      onChange={(e) =>
                        handlePipelineChange(card, e.target.value)
                      }
                      disabled={busy}
                      title="Trocar de pipeline"
                      aria-label="Pipeline"
                      className={`${controlSmCls} w-full font-medium`}
                    >
                      {swapOptions.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                      {/* Se o pipeline atual está arquivado, ele não aparece
                          em swapOptions (filtro !archived), então força
                          uma option pra não perder o select. */}
                      {card.pipeline.archived &&
                        !swapOptions.some((p) => p.id === card.pipelineId) && (
                          <option value={card.pipelineId}>
                            {card.pipeline.name} (arquivado)
                          </option>
                        )}
                    </select>
                    <select
                      value={card.stageId}
                      onChange={(e) => handleStageChange(card, e.target.value)}
                      disabled={busy || stages.length === 0}
                      title="Trocar de etapa"
                      aria-label="Etapa"
                      className={`${controlSmCls} w-full`}
                    >
                      {stages.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                          {s.type !== 'NORMAL' ? ` (${STAGE_TYPE_LABEL[s.type] ?? s.type})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemove(card)}
                    disabled={busy}
                    title={`Remover de ${card.pipeline.name}`}
                    aria-label={`Remover de ${card.pipeline.name}`}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-urgent-wash hover:text-urgent-ink disabled:opacity-50"
                  >
                    {busy ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div className="my-3 border-t border-border" />

        <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Adicionar a outro pipeline
        </div>

        {availablePipelines.length === 0 ? (
          <p className="px-1 py-2 text-[11px] text-muted-foreground">
            A conversa já está em todos os pipelines disponíveis.
          </p>
        ) : (
          <>
            <select
              value={pickPipeline}
              onChange={(e) => {
                setPickPipeline(e.target.value);
                setPickStage('');
              }}
              aria-label="Pipeline para adicionar"
              className={`${controlSmCls} mb-2 w-full`}
            >
              <option value="">Selecione um pipeline…</option>
              {availablePipelines.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            {pickPipeline && (
              <select
                value={pickStage}
                onChange={(e) => setPickStage(e.target.value)}
                aria-label="Etapa para adicionar"
                className={`${controlSmCls} mb-2 w-full`}
              >
                <option value="">Selecione uma etapa…</option>
                {stagesOf(pickPipeline).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                    {s.type !== 'NORMAL' ? ` (${STAGE_TYPE_LABEL[s.type] ?? s.type})` : ''}
                  </option>
                ))}
              </select>
            )}

            <button
              type="button"
              onClick={handleAdd}
              disabled={!pickPipeline || !pickStage || adding}
              className="flex h-8 w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {adding ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              Adicionar
            </button>
          </>
        )}
      </PopoverPanel>
    </Popover>
  );
}
