'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Activity, Zap } from 'lucide-react';
import { toast } from 'sonner';
import {
  Automation,
  automationsService,
} from '@/features/automations/services/automations.service';
import {
  ACTION_LABELS,
  TRIGGER_LABELS,
} from '@/features/automations/utils/labels';
import { AutomationBuilder } from '@/features/automations/components/automation-builder';
import { AutomationRunsPanel } from '@/features/automations/components/automation-runs-panel';
import {
  BROADCAST_RISK_MESSAGE,
  isBroadcastRisk,
} from '@/features/automations/utils/broadcast-risk';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { EmptyState, LoadingState } from '@/components/ui/empty-state';
import { PageHeader, PageShell } from '@/components/layout/page-shell';

export default function AutomationsPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Automation | null>(null);
  const [creating, setCreating] = useState(false);
  const [viewingRuns, setViewingRuns] = useState<Automation | null>(null);
  const { confirm, confirmDialog } = useConfirm();

  const { data: meta } = useQuery({
    queryKey: ['automations-meta'],
    queryFn: automationsService.meta,
  });

  const { data: automations = [], isLoading } = useQuery({
    queryKey: ['automations'],
    queryFn: automationsService.list,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      automationsService.toggle(id, enabled),
    onSuccess: (_data, { enabled }) => {
      toast.success(enabled ? 'Automação ligada' : 'Automação desligada');
      qc.invalidateQueries({ queryKey: ['automations'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const removeMutation = useMutation({
    mutationFn: automationsService.remove,
    onSuccess: () => {
      toast.success('Automação removida');
      qc.invalidateQueries({ queryKey: ['automations'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleSaved = () => {
    setEditing(null);
    setCreating(false);
    qc.invalidateQueries({ queryKey: ['automations'] });
  };

  const handleToggle = async (a: Automation, enabled: boolean) => {
    if (enabled && isBroadcastRisk(a)) {
      toast.error(BROADCAST_RISK_MESSAGE);
      return;
    }
    // Ligar começa a agir em conversas reais: pede confirmação.
    if (enabled) {
      const isConfirmed = await confirm({
        title: `Ligar "${a.name}"?`,
        description: 'A automação começa a agir em conversas reais assim que for ligada.',
        confirmLabel: 'Ligar',
      });
      if (!isConfirmed) return;
    }
    toggleMutation.mutate({ id: a.id, enabled });
  };

  const handleRemove = async (a: Automation) => {
    const isConfirmed = await confirm({
      title: `Remover a automação "${a.name}"?`,
      description: 'Ela para de rodar. Esta ação não pode ser desfeita.',
      confirmLabel: 'Remover',
      destructive: true,
    });
    if (!isConfirmed) return;
    removeMutation.mutate(a.id);
  };

  return (
    <PageShell>
      <PageHeader
        title="Automações"
        description="Quando algo acontece → execute uma sequência de ações"
        actions={
          <Button onClick={() => setCreating(true)} disabled={!meta}>
            <Plus aria-hidden="true" className="h-4 w-4" /> Nova automação
          </Button>
        }
      />

      <div className="mt-6">
        {isLoading && <LoadingState />}
        {!isLoading && automations.length === 0 && (
          <EmptyState
            icon={Zap}
            title="Nenhuma automação ainda"
            description={
              <>
                Crie regras para reagir automaticamente a eventos. Ex.:{' '}
                <em>quando a tag VIP for adicionada → atribuir ao João + responder boas-vindas</em>.
              </>
            }
            action={
              <Button onClick={() => setCreating(true)} disabled={!meta}>
                <Plus aria-hidden="true" className="h-4 w-4" /> Criar primeira automação
              </Button>
            }
            className="rounded-xl border border-dashed border-border"
          />
        )}
        {!isLoading && automations.length > 0 && (
          <ul className="space-y-2">
            {automations.map((a) => (
              <AutomationRow
                key={a.id}
                automation={a}
                onEdit={() => setEditing(a)}
                onToggle={(enabled) => handleToggle(a, enabled)}
                onRemove={() => handleRemove(a)}
                onViewRuns={() => setViewingRuns(a)}
              />
            ))}
          </ul>
        )}
      </div>

      {(creating || editing) && meta && (
        <AutomationBuilder
          meta={meta}
          initial={editing ?? undefined}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
          onSaved={handleSaved}
        />
      )}

      {viewingRuns && (
        <AutomationRunsPanel
          automation={viewingRuns}
          onClose={() => setViewingRuns(null)}
        />
      )}

      {confirmDialog}
    </PageShell>
  );
}

function AutomationRow({
  automation,
  onEdit,
  onToggle,
  onRemove,
  onViewRuns,
}: {
  automation: Automation;
  onEdit: () => void;
  onToggle: (enabled: boolean) => void;
  onRemove: () => void;
  onViewRuns: () => void;
}) {
  const failureRate =
    automation.runCount > 0
      ? Math.round((automation.failureCount / automation.runCount) * 100)
      : 0;

  const isAutoPaused = !!automation.autoPausedAt;
  const actionsCount = Array.isArray(automation.actions)
    ? automation.actions.length
    : 0;

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-xl border border-border bg-card p-4 shadow-soft">
      <button
        type="button"
        role="switch"
        aria-checked={automation.enabled}
        aria-label={`${automation.name}: ${automation.enabled ? 'ligada' : 'desligada'}`}
        onClick={() => onToggle(!automation.enabled)}
        className="flex min-h-10 shrink-0 items-center gap-2 rounded-full py-1 pl-1 pr-2.5 text-xs font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${
            automation.enabled ? 'bg-primary' : 'bg-zinc-300 dark:bg-zinc-600'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 rounded-full bg-white shadow transition ${
              automation.enabled ? 'translate-x-[18px]' : 'translate-x-0.5'
            }`}
          />
        </span>
        <span
          className={`w-16 text-left ${
            automation.enabled ? 'text-foreground' : 'text-muted-foreground'
          }`}
        >
          {automation.enabled ? 'Ligada' : 'Desligada'}
        </span>
      </button>

      <div className="min-w-0 flex-1 basis-56">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-sm font-semibold text-foreground">{automation.name}</h3>
          {isAutoPaused && (
            <span className="shrink-0 rounded-full bg-urgent-wash px-2 py-0.5 text-[11px] font-medium text-urgent-ink">
              Pausada por falhas
            </span>
          )}
        </div>
        {/* Rótulos apagados, valores em tinta de texto: o título é o mais forte da linha. */}
        <p className="mt-0.5 truncate text-xs text-foreground">
          <span className="font-medium text-muted-foreground">Quando:</span>{' '}
          {TRIGGER_LABELS[automation.trigger]}
          <span className="text-muted-foreground">{' · '}</span>
          <span className="font-medium text-muted-foreground">Faz:</span>{' '}
          {actionsCount === 0
            ? 'nenhuma ação'
            : (Array.isArray(automation.actions) ? automation.actions : [])
                .map((a) => ACTION_LABELS[a.type])
                .join(' → ')}
        </p>
        {automation.runCount > 0 && (
          <p className="mt-1 text-[11px] tabular-nums text-muted-foreground">
            {automation.runCount} {automation.runCount === 1 ? 'execução' : 'execuções'} ·{' '}
            {automation.successCount} com sucesso · {automation.failureCount} {automation.failureCount === 1 ? 'falha' : 'falhas'}
            {failureRate > 0 && ` (${failureRate}%)`}
            {automation.lastRunAt &&
              ` · última: ${new Date(automation.lastRunAt).toLocaleString('pt-BR')}`}
          </p>
        )}
      </div>

      <div className="ml-auto flex items-center gap-1">
        <IconButton onClick={onViewRuns} label="Ver histórico de execuções">
          <Activity aria-hidden="true" className="h-4 w-4" />
        </IconButton>
        <IconButton onClick={onEdit} label="Editar automação">
          <Pencil aria-hidden="true" className="h-4 w-4" />
        </IconButton>
        <IconButton
          onClick={onRemove}
          label="Remover automação"
          className="hover:bg-urgent-wash hover:text-urgent-ink"
        >
          <Trash2 aria-hidden="true" className="h-4 w-4" />
        </IconButton>
      </div>
    </li>
  );
}

function IconButton({
  children,
  label,
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
