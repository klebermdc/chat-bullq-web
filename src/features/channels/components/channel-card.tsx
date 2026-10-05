'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  MessageSquare,
  MoreVertical,
  PlugZap,
  Pencil,
  Trash2,
  Zap,
  Power,
  PowerOff,
  Loader2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Lock,
  Globe,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Channel } from '../services/channels.service';
import { channelsService } from '../services/channels.service';
import { useChannelSync } from '../hooks/use-channel-sync';
import { ZappfyIcon, MetaIcon, InstagramIcon, WasenderIcon } from '@/components/ui/icons';
import { EditChannelDialog } from './edit-channel-dialog';
import { channelUsageService, type UsageSummary } from '../services/channel-usage.service';
import { ChannelUsageDialog } from './channel-usage-dialog';
import { channelTypeLabel } from '@/lib/channel-labels';
import { useConfirm } from '@/components/ui/confirm-dialog';

const CHANNEL_ICONS: Record<string, React.ElementType> = {
  WHATSAPP_ZAPPFY: ZappfyIcon,
  WHATSAPP_WASENDER: WasenderIcon,
  WHATSAPP_OFFICIAL: MetaIcon,
  INSTAGRAM: InstagramIcon,
};

const CHIP_CLS = 'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium';
// Rodapé de ações: grade de três vagas fixas (testar · sincronizar · ativar).
// Canal sem sincronização deixa a vaga do meio vazia, então a mesma ação fica
// sempre no mesmo lugar em todos os cards.
const FOOTER_ACTION_CLS =
  'inline-flex h-9 min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';
const MENU_ITEM_CLS = 'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors';

interface ChannelCardProps {
  channel: Channel;
  onUpdate: () => void;
}

export function ChannelCard({ channel, onUpdate }: ChannelCardProps) {
  const [isTesting, setIsTesting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const Icon = CHANNEL_ICONS[channel.type] ?? MessageSquare;
  const { confirm, confirmDialog } = useConfirm();
  const sync = useChannelSync({ channelId: channel.id, channelType: channel.type });
  const isOfficial = channel.type === 'WHATSAPP_OFFICIAL';
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [showUsage, setShowUsage] = useState(false);

  const refreshUsage = useCallback(() => {
    if (!isOfficial) return;
    channelUsageService
      .summary()
      .then((rows) => setUsage(rows.find((r) => r.channelId === channel.id) ?? null))
      .catch(() => {});
  }, [isOfficial, channel.id]);

  useEffect(() => {
    refreshUsage();
  }, [refreshUsage]);

  // Esc fecha o menu de ações.
  useEffect(() => {
    if (!showMenu) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowMenu(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [showMenu]);

  const handleTest = async () => {
    setIsTesting(true);
    try {
      const result = await channelsService.testConnection(channel.id);
      if (result.success) {
        toast.success(`Conexão OK: ${typeof result.status === 'string' ? result.status : JSON.stringify(result.status)}`);
      } else {
        toast.error(`Falha: ${result.error}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao testar conexão');
    } finally {
      setIsTesting(false);
    }
  };

  const handleToggle = async () => {
    try {
      await channelsService.update(channel.id, { isActive: !channel.isActive });
      toast.success(channel.isActive ? 'Canal desativado' : 'Canal ativado');
      onUpdate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar canal');
    }
  };

  const handleToggleVisibility = async () => {
    const goingPrivate = channel.visibility !== 'PRIVATE';
    if (goingPrivate) {
      const ok = await confirm({
        title: 'Tornar este canal privado?',
        description:
          'Só você e quem receber permissão explícita vão ver este canal. Proprietários e administradores da organização não terão acesso automático. Você pode liberar o acesso para outros membros depois, nas configurações de membros.',
        confirmLabel: 'Tornar privado',
      });
      if (!ok) return;
    }
    try {
      await channelsService.update(channel.id, {
        visibility: goingPrivate ? 'PRIVATE' : 'ORG',
      });
      toast.success(goingPrivate ? 'Canal agora é privado' : 'Canal agora é visível para toda a organização');
      onUpdate();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Erro ao alterar visibilidade',
      );
    }
  };

  const handleDisconnect = async () => {
    // Confirmação por texto, igual à remoção: desconectar é irreversível sem
    // refazer o onboarding inteiro na Meta, e o custo de um clique errado é
    // o canal parar de receber sem ninguém entender por quê.
    const typed = prompt(
      `Desconectar "${channel.name}" da Meta?\n\n` +
        `O número sai da Cloud API e o canal para de receber e enviar. ` +
        `Reconectar exige refazer o onboarding.\n\n` +
        `As conversas e mensagens são preservadas.\n\n` +
        `Digite o nome exato para confirmar:`,
    );
    if (typed == null) return;
    if (typed.trim() !== channel.name) {
      toast.error('O nome não confere. Nada foi alterado.');
      return;
    }
    try {
      const res = await channelsService.disconnectWhatsApp(channel.id);
      toast.success(
        res.deregistered
          ? 'Canal desconectado da Meta.'
          : 'Canal desativado. A Meta recusou a desconexão do número; provavelmente o acesso já havia sido revogado.',
      );
      onUpdate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao desconectar');
    }
  };

  const handleDelete = async () => {
    const typed = prompt(
      `Para remover o canal, digite o nome exato:\n\n"${channel.name}"\n\nMensagens e conversas são preservadas no histórico, mas o canal ficará inativo.`,
    );
    if (typed == null) return;
    if (typed.trim() !== channel.name) {
      toast.error('O nome não confere. Nada foi alterado.');
      return;
    }
    try {
      await channelsService.remove(channel.id, typed.trim());
      toast.success('Canal removido');
      onUpdate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao remover canal');
    }
  };

  const handleSync = async () => {
    try {
      await sync.startSync();
      toast.success('Sincronização iniciada');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao iniciar sincronização');
    }
  };

  const handleCancelSync = async () => {
    try {
      await sync.cancelSync();
      toast.success('Sincronização cancelada');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao cancelar sincronização');
    }
  };

  const isSyncRunning = sync.job?.status === 'RUNNING' || sync.job?.status === 'PENDING';
  const isSyncCompleted = sync.job?.status === 'COMPLETED';
  const isSyncFailed = sync.job?.status === 'FAILED';
  const progressPct =
    sync.job && sync.job.conversationsTotal > 0
      ? Math.min(100, Math.round((sync.job.conversationsImported / sync.job.conversationsTotal) * 100))
      : 0;

  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-card shadow-soft transition-shadow hover:shadow-elevated">
      <div className="flex flex-1 items-start gap-3 p-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border bg-muted">
          <Icon className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 break-words text-sm font-semibold text-foreground" title={channel.name}>
            {channel.name}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{channelTypeLabel(channel.type)}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span
              className={`${CHIP_CLS} ${
                channel.isActive ? 'bg-success-wash text-success-ink' : 'bg-muted text-muted-foreground'
              }`}
            >
              {channel.isActive ? 'Ativo' : 'Inativo'}
            </span>
            {channel.visibility === 'PRIVATE' && (
              <span
                title="Canal privado: só membros com permissão explícita enxergam, mesmo proprietários e administradores"
                className={`${CHIP_CLS} bg-muted text-muted-foreground`}
              >
                <Lock aria-hidden="true" className="h-3 w-3" />
                Privado
              </span>
            )}
            {isOfficial && usage && (
              <button
                type="button"
                onClick={() => setShowUsage(true)}
                className={`${CHIP_CLS} bg-primary/10 text-primary transition-colors hover:bg-primary/15`}
                title="Janelas de 24h abertas neste mês (dados de cobrança da Meta). Clique para ver o detalhamento."
              >
                <span className="font-mono tabular-nums">
                  {usage.total} {usage.total === 1 ? 'janela' : 'janelas'} · ~
                  {usage.currency === 'BRL' ? 'R$' : usage.currency}{' '}
                  {usage.estimatedCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                no mês
              </button>
            )}
          </div>

          {sync.supported && sync.job && (
            <div className="mt-3">
              {isSyncRunning && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="inline-flex min-w-0 flex-wrap items-center gap-x-1.5 text-foreground">
                      <Loader2 aria-hidden="true" className="h-3 w-3 shrink-0 animate-spin" />
                      Sincronizando
                      {sync.job.conversationsTotal > 0 && (
                        <span className="tabular-nums text-muted-foreground">
                          {sync.job.conversationsImported}/{sync.job.conversationsTotal} conversas · {sync.job.messagesImported} mensagens
                        </span>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={handleCancelSync}
                      className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-urgent-wash hover:text-urgent-ink"
                    >
                      Cancelar
                    </button>
                  </div>
                  <div
                    className="h-1.5 overflow-hidden rounded-full bg-muted"
                    role="progressbar"
                    aria-label="Progresso da sincronização"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={progressPct}
                  >
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              )}
              {isSyncCompleted && (
                <p className="flex items-start gap-1.5 text-xs text-success-ink">
                  <CheckCircle2 aria-hidden="true" className="mt-0.5 h-3 w-3 shrink-0" />
                  <span>
                    {sync.job.conversationsImported} conversas e {sync.job.messagesImported} mensagens sincronizadas
                  </span>
                </p>
              )}
              {isSyncFailed && (
                <p className="flex items-start gap-1.5 text-xs text-urgent-ink">
                  <AlertCircle aria-hidden="true" className="mt-0.5 h-3 w-3 shrink-0" />
                  <span>A sincronização falhou: {sync.job.errorMessage || 'erro desconhecido'}</span>
                </p>
              )}
              {sync.job.status === 'CANCELLED' && (
                <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  <XCircle aria-hidden="true" className="mt-0.5 h-3 w-3 shrink-0" />
                  <span>Sincronização cancelada</span>
                </p>
              )}
            </div>
          )}
        </div>
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setShowMenu(!showMenu)}
            aria-label={`Mais ações do canal ${channel.name}`}
            title="Mais ações"
            aria-haspopup="menu"
            aria-expanded={showMenu}
            className="-mr-1 -mt-1 flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <MoreVertical aria-hidden="true" className="h-4 w-4" />
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div
                role="menu"
                className="absolute right-0 top-full z-20 mt-1 w-56 overflow-hidden rounded-xl border border-border bg-popover py-1 shadow-elevated"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => { setEditing(true); setShowMenu(false); }}
                  className={`${MENU_ITEM_CLS} text-foreground hover:bg-muted`}
                >
                  <Pencil aria-hidden="true" className="h-4 w-4 shrink-0" />
                  Editar credenciais
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => { handleToggleVisibility(); setShowMenu(false); }}
                  className={`${MENU_ITEM_CLS} text-foreground hover:bg-muted`}
                >
                  {channel.visibility === 'PRIVATE' ? (
                    <>
                      <Globe aria-hidden="true" className="h-4 w-4 shrink-0" />
                      Liberar para a organização
                    </>
                  ) : (
                    <>
                      <Lock aria-hidden="true" className="h-4 w-4 shrink-0" />
                      Tornar privado
                    </>
                  )}
                </button>
                {channel.type === 'WHATSAPP_OFFICIAL' && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => { handleDisconnect(); setShowMenu(false); }}
                    className={`${MENU_ITEM_CLS} text-warning-ink hover:bg-warning-wash`}
                  >
                    <PlugZap aria-hidden="true" className="h-4 w-4 shrink-0" />
                    Desconectar da Meta
                  </button>
                )}
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => { handleDelete(); setShowMenu(false); }}
                  className={`${MENU_ITEM_CLS} text-urgent-ink hover:bg-urgent-wash`}
                >
                  <Trash2 aria-hidden="true" className="h-4 w-4 shrink-0" />
                  Remover
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="grid h-12 shrink-0 grid-cols-3 items-center gap-1 border-t border-border px-2">
        <button
          type="button"
          onClick={handleTest}
          disabled={isTesting}
          title="Testar conexão"
          className={FOOTER_ACTION_CLS}
        >
          {isTesting ? (
            <Loader2 aria-hidden="true" className="h-3.5 w-3.5 shrink-0 animate-spin" />
          ) : (
            <Zap aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
          )}
          <span className="truncate">Testar conexão</span>
        </button>
        {sync.supported && (
          <button
            type="button"
            onClick={handleSync}
            disabled={isSyncRunning || sync.loading}
            title="Sincronizar conversas"
            className={FOOTER_ACTION_CLS}
          >
            {sync.loading || isSyncRunning ? (
              <Loader2 aria-hidden="true" className="h-3.5 w-3.5 shrink-0 animate-spin" />
            ) : (
              <RefreshCw aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
            )}
            <span className="truncate">Sincronizar</span>
          </button>
        )}
        <button
          type="button"
          onClick={handleToggle}
          title={channel.isActive ? 'Desativar canal' : 'Ativar canal'}
          className={`${FOOTER_ACTION_CLS} col-start-3`}
        >
          {channel.isActive ? (
            <PowerOff aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <Power aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
          )}
          <span className="truncate">{channel.isActive ? 'Desativar' : 'Ativar'}</span>
        </button>
      </div>

      <EditChannelDialog
        channel={editing ? channel : null}
        onClose={() => setEditing(false)}
        onSaved={onUpdate}
      />
      {isOfficial && (
        <ChannelUsageDialog
          channel={showUsage ? channel : null}
          onClose={() => setShowUsage(false)}
          onSaved={refreshUsage}
        />
      )}
      {confirmDialog}
    </div>
  );
}
