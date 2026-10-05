'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Plus, KanbanSquare, Trash2, Star } from 'lucide-react';
import { toast } from 'sonner';
import {
  pipelinesService,
  type Pipeline,
} from '@/features/pipelines/services/pipelines.service';
import { getErrorMessage } from '@/lib/errors';
import { Button } from '@/components/ui/button';
import { controlCls } from '@/components/ui/control';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { EmptyState, LoadingState } from '@/components/ui/empty-state';

const CARD_ACTION_CLS =
  'flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

export function PipelinesListView() {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const { confirm, confirmDialog } = useConfirm();

  const { data: pipelines = [], isLoading } = useQuery({
    queryKey: ['pipelines'],
    queryFn: () => pipelinesService.list(),
  });

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const p = await pipelinesService.create({ name: name.trim() });
      toast.success(`Pipeline "${p.name}" criado com 5 etapas padrão`);
      qc.invalidateQueries({ queryKey: ['pipelines'] });
      setName('');
      setCreating(false);
    } catch (err: any) {
      toast.error(getErrorMessage(err, 'Erro ao criar'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (p: Pipeline) => {
    const cardCount = p._count?.cards ?? 0;
    const confirmed = await confirm({
      title: `Excluir o pipeline "${p.name}"?`,
      description:
        cardCount > 0
          ? `${plural(cardCount, 'card será excluído', 'cards serão excluídos')} junto com o pipeline. Não dá para desfazer.`
          : 'O pipeline e as etapas dele serão excluídos. Não dá para desfazer.',
      confirmLabel: 'Excluir',
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await pipelinesService.remove(p.id);
      toast.success('Pipeline removido');
      qc.invalidateQueries({ queryKey: ['pipelines'] });
    } catch (err: any) {
      toast.error(getErrorMessage(err, 'Erro ao excluir'));
    }
  };

  const handleSetDefault = async (p: Pipeline) => {
    try {
      await pipelinesService.update(p.id, { isDefault: true } as any);
      toast.success(`"${p.name}" agora é o pipeline padrão`);
      qc.invalidateQueries({ queryKey: ['pipelines'] });
    } catch (err: any) {
      toast.error(getErrorMessage(err, 'Erro'));
    }
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground">
            <KanbanSquare aria-hidden="true" className="h-5 w-5 shrink-0 text-primary" />
            Pipelines
          </h1>
          <p className="mt-0.5 max-w-2xl text-sm text-muted-foreground">
            Quadros de acompanhamento da sua operação. Cada pipeline tem etapas
            próprias e cards independentes, vinculados ou não a uma conversa.
          </p>
        </div>
        <Button onClick={() => setCreating(true)} className="shrink-0">
          <Plus aria-hidden="true" className="h-4 w-4" />
          Novo pipeline
        </Button>
      </div>

      {creating && (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3 shadow-soft">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome do pipeline (ex.: Vendas Mentoria)"
            aria-label="Nome do pipeline"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate();
              if (e.key === 'Escape') setCreating(false);
            }}
            className={`${controlCls} min-w-0 flex-1 basis-48`}
          />
          <Button variant="outline" onClick={() => setCreating(false)}>
            Cancelar
          </Button>
          <Button onClick={handleCreate} disabled={saving || !name.trim()}>
            {saving ? 'Criando…' : 'Criar'}
          </Button>
        </div>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading && <LoadingState className="col-span-full" />}
        {!isLoading && pipelines.length === 0 && (
          <EmptyState
            className="col-span-full rounded-xl border border-dashed border-border"
            icon={KanbanSquare}
            title="Nenhum pipeline criado ainda"
            description="Crie o primeiro pipeline para começar com 5 etapas padrão."
            action={
              <Button onClick={() => setCreating(true)}>
                <Plus aria-hidden="true" className="h-4 w-4" />
                Novo pipeline
              </Button>
            }
          />
        )}
        {pipelines.map((p) => (
          <div
            key={p.id}
            className="group relative flex flex-col rounded-xl border border-border bg-card p-4 shadow-soft transition hover:border-primary/40 hover:shadow-elevated"
          >
            <Link href={`/pipelines/${p.id}`} className="flex flex-1 flex-col">
              <div className="flex items-center gap-2 pr-16">
                <KanbanSquare aria-hidden="true" className="h-4 w-4 shrink-0 text-primary" />
                <h3 className="min-w-0 truncate text-sm font-semibold text-foreground">
                  {p.name}
                </h3>
                {p.isDefault && (
                  <span title="Pipeline padrão" className="shrink-0 text-warning-ink">
                    <Star aria-hidden="true" className="h-3.5 w-3.5" />
                    <span className="sr-only">Pipeline padrão</span>
                  </span>
                )}
              </div>
              {/* A linha da descrição fica reservada mesmo vazia, e o resumo
                  vai para o pé do card: cards vizinhos alinham entre si. */}
              <p className="mt-1 line-clamp-2 min-h-4 text-xs text-muted-foreground">
                {p.description}
              </p>
              <p className="mt-auto pt-3 text-[11px] tabular-nums text-muted-foreground">
                {plural(p.stages?.length ?? 0, 'etapa', 'etapas')} ·{' '}
                {plural(p._count?.cards ?? 0, 'card', 'cards')}
              </p>
            </Link>
            {/* No toque não existe hover: as ações ficam sempre visíveis no celular. */}
            <div className="absolute right-2 top-2 flex gap-0.5 transition-opacity focus-within:opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
              {!p.isDefault && (
                <button
                  type="button"
                  onClick={() => handleSetDefault(p)}
                  title="Marcar como padrão"
                  aria-label={`Marcar "${p.name}" como pipeline padrão`}
                  className={`${CARD_ACTION_CLS} hover:bg-warning-wash hover:text-warning-ink`}
                >
                  <Star aria-hidden="true" className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => handleDelete(p)}
                title="Excluir pipeline"
                aria-label={`Excluir o pipeline "${p.name}"`}
                className={`${CARD_ACTION_CLS} hover:bg-urgent-wash hover:text-urgent-ink`}
              >
                <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
      {confirmDialog}
    </div>
  );
}
