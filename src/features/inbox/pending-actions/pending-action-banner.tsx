'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Check,
  Clock,
  Info,
  Loader2,
  Search,
  UserPlus,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { controlCls } from '@/components/ui/control';
import { EmptyState, LoadingState } from '@/components/ui/empty-state';
import { getInitials } from '@/lib/initials';
import {
  useApprovePendingAction,
  useDistributePendingAction,
  useRejectPendingAction,
} from './use-pending-actions';
import {
  membersService,
  type Member,
} from '@/features/settings/services/members.service';
import type {
  PendingAction,
  PendingActionImpact,
} from './types';

interface Props {
  action: PendingAction;
  /** Stagger index for the entrance animation (50ms steps). */
  index?: number;
}

interface ImpactStyle {
  card: string;
  badge: string;
  iconWrap: string;
  Icon: React.ComponentType<{ className?: string }>;
}

// Estado, não marca: baixo = neutro, médio/alto = atenção, crítico = urgente.
const IMPACT_STYLES: Record<PendingActionImpact, ImpactStyle> = {
  low: {
    card: 'border-border bg-card',
    badge: 'bg-muted text-foreground',
    iconWrap: 'bg-muted text-muted-foreground',
    Icon: Info,
  },
  medium: {
    card: 'border-warning/30 bg-warning-wash',
    badge: 'bg-card text-warning-ink',
    iconWrap: 'bg-card text-warning-ink',
    Icon: Info,
  },
  high: {
    card: 'border-warning bg-warning-wash',
    badge: 'bg-card text-warning-ink',
    iconWrap: 'bg-card text-warning-ink',
    Icon: AlertTriangle,
  },
  critical: {
    card: 'border-urgent/50 bg-urgent-wash',
    badge: 'bg-card text-urgent-ink',
    iconWrap: 'bg-card text-urgent-ink',
    Icon: AlertTriangle,
  },
};

const IMPACT_LABELS: Record<PendingActionImpact, string> = {
  low: 'baixo',
  medium: 'médio',
  high: 'alto',
  critical: 'crítico',
};

const TOOL_LABELS: Record<string, string> = {
  grantAccess: 'Liberar acesso',
  resetPassword: 'Resetar senha',
  transferToHuman: 'Transferir para humano',
};

function formatCountdown(ms: number): string {
  if (ms <= 0) return 'Expirado';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remMinutes = minutes % 60;
    return `${hours}h ${String(remMinutes).padStart(2, '0')}m`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Live countdown to `expiresAt`. Re-renders every second via local
 * state. We rebase on the prop in case the action gets refreshed with a
 * new expiration (rare but cheap to support).
 */
function useCountdown(expiresAt: string): number {
  const target = useMemo(() => new Date(expiresAt).getTime(), [expiresAt]);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return Math.max(0, target - now);
}

export function PendingActionBanner({ action, index = 0 }: Props) {
  const style = IMPACT_STYLES[action.preview.impact] ?? IMPACT_STYLES.medium;
  const remainingMs = useCountdown(action.expiresAt);
  const expired = remainingMs <= 0;

  const approve = useApprovePendingAction();
  const reject = useRejectPendingAction();
  const distribute = useDistributePendingAction();

  const [rejectOpen, setRejectOpen] = useState(false);
  const [distributeOpen, setDistributeOpen] = useState(false);
  const [reason, setReason] = useState('');

  const isWorking =
    approve.isPending || reject.isPending || distribute.isPending;
  const isHandoff = action.toolName === 'transferToHuman';
  // No card de handoff mostramos SÓ o que o cliente quer (resumo da Aline),
  // sem ruído técnico (impacto/alvo/rollback). Fallback pro motivo interno e,
  // por último, pra descrição da ação — pra nunca ficar em branco.
  const clientWants =
    (action.args?.summary as string | undefined)?.trim() ||
    (action.args?.reason as string | undefined)?.trim() ||
    action.preview.action;
  // Já distribuído: o card fica como "norte" pro atendente até ele iniciar.
  const distributedToName = action.args?.distributedToName as string | undefined;
  const isDistributed = Boolean(action.args?.distributedTo);
  // Lock the buttons once the backend confirmed a terminal status.
  const isTerminal =
    action.status !== 'PENDING' || expired;

  const handleApprove = () => {
    if (isTerminal || isWorking) return;
    approve.mutate(
      { id: action.id, conversationId: action.conversationId },
      {
        onSuccess: () => toast.success('Ação aprovada'),
        onError: (err: unknown) => {
          const message =
            err instanceof Error ? err.message : 'Erro ao aprovar ação';
          toast.error(message);
        },
      },
    );
  };

  const submitReject = () => {
    const trimmed = reason.trim();
    if (!trimmed) {
      toast.error('Informe o motivo da rejeição');
      return;
    }
    reject.mutate(
      { id: action.id, reason: trimmed, conversationId: action.conversationId },
      {
        onSuccess: () => {
          toast.success('Ação rejeitada');
          setRejectOpen(false);
          setReason('');
        },
        onError: (err: unknown) => {
          const message =
            err instanceof Error ? err.message : 'Erro ao rejeitar ação';
          toast.error(message);
        },
      },
    );
  };

  const handleDistribute = (assignedToId: string, name: string) => {
    if (isTerminal || isWorking) return;
    distribute.mutate(
      { id: action.id, assignedToId, conversationId: action.conversationId },
      {
        onSuccess: () => {
          toast.success(`Lead distribuído para ${name}`);
          setDistributeOpen(false);
        },
        onError: (err: unknown) => {
          const message =
            err instanceof Error ? err.message : 'Erro ao distribuir lead';
          toast.error(message);
        },
      },
    );
  };

  const toolLabel = TOOL_LABELS[action.toolName] ?? action.toolName;
  const Icon = style.Icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2, delay: index * 0.05 }}
      className={`rounded-xl border p-4 shadow-soft ${style.card}`}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${style.iconWrap}`}
        >
          <Icon className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${style.badge}`}
            >
              {toolLabel}
            </span>
            {/* Handoff: sem selo de impacto nem contador — o card só mostra o
                que o cliente quer. As demais ações mantêm o contador regressivo. */}
            {!isHandoff && (
              <>
                <span
                  className="inline-flex items-center rounded-full bg-card/60 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground ring-1 ring-inset ring-border"
                >
                  Impacto: {IMPACT_LABELS[action.preview.impact] ?? action.preview.impact}
                </span>
                <span
                  className={`ml-auto inline-flex items-center gap-1 font-mono text-xs font-medium tabular-nums ${
                    expired ? 'text-urgent-ink' : 'text-muted-foreground'
                  }`}
                  title={`Expira em ${new Date(action.expiresAt).toLocaleString('pt-BR')}`}
                >
                  <Clock className="h-3.5 w-3.5" />
                  {formatCountdown(remainingMs)}
                </span>
              </>
            )}
          </div>

          {isHandoff ? (
            // Handoff: só o que o cliente quer (resumo da Aline). Nada de
            // Alvo (ID interno da conversa) nem Rollback técnico.
            <p className="mt-2 text-sm text-foreground">
              {clientWants}
            </p>
          ) : (
            <>
              <p className="mt-2 text-sm text-foreground">
                {action.preview.action}
              </p>

              {action.preview.affectedEntity && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Alvo:{' '}
                  <span className="font-medium">
                    {action.preview.affectedEntity.label ??
                      `${action.preview.affectedEntity.type}#${action.preview.affectedEntity.id}`}
                  </span>
                </p>
              )}

              {action.preview.rollback && (
                <p className="mt-1 text-xs text-muted-foreground">
                  <span className="font-semibold">Rollback:</span>{' '}
                  {action.preview.rollback}
                </p>
              )}
            </>
          )}

          {isDistributed && (
            <p className="mt-2 text-xs font-medium text-primary">
              Distribuído para {distributedToName ?? 'um atendente'} — aguardando
              ele iniciar o atendimento.
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {isHandoff && !isDistributed && (
              <Button
                type="button"
                size="sm"
                onClick={() => setDistributeOpen(true)}
                disabled={isTerminal || isWorking}
              >
                {distribute.isPending ? (
                  <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <UserPlus aria-hidden="true" className="h-3.5 w-3.5" />
                )}
                Distribuir
              </Button>
            )}
            {/* Uma ação principal por cartão: com "Distribuir" na tela, aprovar vira secundário. */}
            <Button
              type="button"
              size="sm"
              variant={isHandoff && !isDistributed ? 'outline' : 'primary'}
              onClick={handleApprove}
              disabled={isTerminal || isWorking}
            >
              {approve.isPending ? (
                <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check aria-hidden="true" className="h-3.5 w-3.5" />
              )}
              {isDistributed ? 'Iniciar atendimento' : 'Aprovar'}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setRejectOpen(true)}
              disabled={isTerminal || isWorking}
              className="text-urgent-ink hover:bg-urgent-wash"
            >
              <X aria-hidden="true" className="h-3.5 w-3.5" />
              Rejeitar
            </Button>
            {expired && action.status === 'PENDING' && (
              <span className="text-xs text-urgent-ink">
                Esta ação expirou e não pode mais ser aprovada.
              </span>
            )}
          </div>
        </div>
      </div>

      {rejectOpen && (
        <RejectReasonDialog
          working={reject.isPending}
          reason={reason}
          onChangeReason={setReason}
          onCancel={() => {
            if (reject.isPending) return;
            setRejectOpen(false);
            setReason('');
          }}
          onConfirm={submitReject}
        />
      )}

      {distributeOpen && (
        <DistributeDialog
          working={distribute.isPending}
          onCancel={() => {
            if (distribute.isPending) return;
            setDistributeOpen(false);
          }}
          onPick={handleDistribute}
        />
      )}
    </motion.div>
  );
}

/**
 * Modal com a lista de atendentes pra distribuir o lead. Ao escolher, a
 * conversa é atribuída ao atendente + movida pra aba "Esperando" dele.
 */
function DistributeDialog({
  working,
  onCancel,
  onPick,
}: {
  working: boolean;
  onCancel: () => void;
  onPick: (assignedToId: string, name: string) => void;
}) {
  const [search, setSearch] = useState('');
  const { data: members = [], isLoading } = useQuery<Member[]>({
    queryKey: ['org-members'],
    queryFn: () => membersService.list(),
  });

  const q = search.trim().toLowerCase();
  const filtered = members.filter(
    (m) =>
      m.user.isActive &&
      (!q || (m.user.name ?? '').toLowerCase().includes(q)),
  );

  // `onCancel` já ignora o fechamento enquanto a distribuição está em curso.
  return (
    <Dialog
      open
      onClose={onCancel}
      title="Distribuir para atendente"
      description="A conversa vai para a aba Esperando de quem você escolher."
      bodyClassName="p-0"
    >
      <div className="sticky top-0 z-10 border-b border-border bg-card px-5 py-2.5">
        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar atendente…"
            aria-label="Buscar atendente"
            autoFocus
            className={`${controlCls} w-full pl-9`}
          />
        </div>
      </div>

      <div className="p-2">
        {isLoading ? (
          <LoadingState label="Carregando atendentes…" />
        ) : filtered.length === 0 ? (
          <EmptyState icon={UserPlus} size="sm" title="Nenhum atendente encontrado" />
        ) : (
          filtered.map((m) => (
            <button
              key={m.user.id}
              type="button"
              disabled={working}
              onClick={() => onPick(m.user.id, m.user.name)}
              className="flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted disabled:opacity-50"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                {getInitials(m.user.name) || '?'}
              </span>
              <span className="truncate">{m.user.name}</span>
            </button>
          ))
        )}
      </div>
    </Dialog>
  );
}

/** Pede o motivo antes de rejeitar a ação — fica no histórico do agente. */
function RejectReasonDialog({
  working,
  reason,
  onChangeReason,
  onCancel,
  onConfirm,
}: {
  working: boolean;
  reason: string;
  onChangeReason: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  // `onCancel` já ignora o fechamento enquanto a rejeição está em curso.
  return (
    <Dialog
      open
      onClose={onCancel}
      title="Rejeitar ação"
      // Com motivo digitado, Esc/clique fora não fecham sem querer.
      dismissible={reason.trim().length === 0}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onCancel} disabled={working}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={reason.trim().length === 0}
            loading={working}
          >
            Confirmar rejeição
          </Button>
        </>
      }
    >
      <label htmlFor="reject-reason" className="block text-sm font-medium text-foreground">
        Motivo
      </label>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Fica registrado no histórico do agente. Ajuda a refinar prompts.
      </p>
      <textarea
        id="reject-reason"
        value={reason}
        onChange={(e) => onChangeReason(e.target.value)}
        disabled={working}
        rows={3}
        placeholder="Ex: cliente ainda não pagou, vou conferir o boleto antes."
        className={`${controlCls} mt-1.5 h-auto w-full resize-none py-2`}
        autoFocus
      />
    </Dialog>
  );
}
