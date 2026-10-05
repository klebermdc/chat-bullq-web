'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Users, Star, Pencil, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useOrgId } from '@/hooks/use-org-query-key';
import { segmentsService, type Segment } from '../services/segments.service';
import { SegmentFormDialog } from './segment-form-dialog';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { SettingsPageHeader } from '@/features/settings/components/settings-page-header';

const ICON_BTN_CLS =
  'flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50';

export function SegmentsList() {
  const orgId = useOrgId();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Segment | null>(null);
  const { confirm, confirmDialog } = useConfirm();

  const { data: segments, isLoading } = useQuery({
    queryKey: ['segments', orgId],
    queryFn: () => segmentsService.list(),
  });

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ['segments'] });

  const removeMutation = useMutation({
    mutationFn: (id: string) => segmentsService.remove(id),
    onSuccess: () => {
      toast.success('Segmento removido');
      refresh();
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : 'Erro ao remover'),
  });

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (segment: Segment) => {
    setEditing(segment);
    setDialogOpen(true);
  };

  const handleRemove = async (segment: Segment) => {
    const confirmed = await confirm({
      title: `Remover o segmento "${segment.name}"?`,
      description:
        'Os grupos voltam a ser tratados por canal, individualmente.',
      confirmLabel: 'Remover',
      destructive: true,
    });
    if (!confirmed) return;
    removeMutation.mutate(segment.id);
  };

  return (
    <div>
      <SettingsPageHeader
        title="Segmentos"
        description="Vários números que compartilham os mesmos grupos e histórico."
        action={
          <Button onClick={openCreate}>
            <Plus aria-hidden="true" className="h-4 w-4" />
            Novo segmento
          </Button>
        }
      />

      <div className="mt-6 space-y-3">
        {isLoading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-xl border border-border bg-muted"
            />
          ))
        ) : segments && segments.length > 0 ? (
          segments.map((seg) => (
            <div
              key={seg.id}
              className="rounded-xl border border-border bg-card p-4 shadow-soft"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="min-w-0 break-words text-sm font-semibold text-foreground">
                      {seg.name}
                    </h3>
                    {!seg.isActive && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                        Inativo
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {seg.members.map((m) => {
                      const isPrimary = m.channelId === seg.primaryChannelId;
                      return (
                        <span
                          key={m.id}
                          title={isPrimary ? 'Canal principal' : undefined}
                          className={`inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
                            isPrimary
                              ? 'bg-primary/10 font-medium text-primary'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {isPrimary && (
                            <Star aria-hidden="true" className="h-3 w-3 shrink-0 fill-current" />
                          )}
                          <span className="truncate">{m.channel?.name ?? m.channelId}</span>
                          {isPrimary && <span className="sr-only">(canal principal)</span>}
                        </span>
                      );
                    })}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => openEdit(seg)}
                    className={`${ICON_BTN_CLS} hover:bg-muted hover:text-foreground`}
                    title="Editar"
                    aria-label={`Editar o segmento ${seg.name}`}
                  >
                    <Pencil aria-hidden="true" className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(seg)}
                    disabled={removeMutation.isPending}
                    className={`${ICON_BTN_CLS} hover:bg-urgent-wash hover:text-urgent-ink`}
                    title="Remover"
                    aria-label={`Remover o segmento ${seg.name}`}
                  >
                    {removeMutation.isPending &&
                    removeMutation.variables === seg.id ? (
                      <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 aria-hidden="true" className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <EmptyState
            className="rounded-xl border border-dashed border-border"
            icon={Users}
            title="Nenhum segmento criado"
            description="Agrupe vários números que estão nos mesmos grupos para unificar conversas e histórico."
            action={
              <Button onClick={openCreate}>
                <Plus aria-hidden="true" className="h-4 w-4" />
                Criar segmento
              </Button>
            }
          />
        )}
      </div>

      <SegmentFormDialog
        open={dialogOpen}
        segment={editing}
        onClose={() => setDialogOpen(false)}
        onSaved={refresh}
      />
      {confirmDialog}
    </div>
  );
}
