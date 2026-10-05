'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Pencil,
  Send,
  Trash2,
  RefreshCw,
  FileText,
  Loader2,
  MessageSquareReply,
} from 'lucide-react';
import { toast } from 'sonner';
import { useOrgId } from '@/hooks/use-org-query-key';
import { channelsService } from '@/features/channels/services/channels.service';
import { templatesService, type Template } from '../services/templates.service';
import { StatusBadge } from './status-badge';
import { controlCls } from '@/components/ui/control';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';

/** Categoria do template como a Meta devolve → rótulo em português. */
const CATEGORY_LABEL: Record<string, string> = {
  MARKETING: 'Marketing',
  UTILITY: 'Utilidade',
  AUTHENTICATION: 'Autenticação',
};

export function TemplatesList() {
  const orgId = useOrgId();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedChannelId, setSelectedChannelId] = useState<string>('');

  const { data: channels } = useQuery({
    queryKey: ['channels', orgId],
    queryFn: () => channelsService.list(),
  });
  const waChannels = (channels ?? []).filter((c) => c.type === 'WHATSAPP_OFFICIAL');

  // Seleciona o primeiro canal WhatsApp Oficial ao carregar.
  useEffect(() => {
    if (!selectedChannelId && waChannels.length > 0) {
      setSelectedChannelId(waChannels[0].id);
    }
  }, [waChannels, selectedChannelId]);

  const { data: templates, isLoading } = useQuery({
    queryKey: ['templates', orgId, selectedChannelId],
    queryFn: () => templatesService.list(selectedChannelId!),
    enabled: !!selectedChannelId,
  });

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ['templates'] });

  const syncMutation = useMutation({
    mutationFn: () => templatesService.sync(selectedChannelId),
    onSuccess: () => {
      toast.success('Sincronizado');
      refresh();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Erro'),
  });

  const submitMutation = useMutation({
    mutationFn: (id: string) => templatesService.submit(id, selectedChannelId),
    onSuccess: () => {
      toast.success('Template enviado para aprovação');
      refresh();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Erro'),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => templatesService.remove(id, selectedChannelId),
    onSuccess: () => {
      toast.success('Template excluído');
      refresh();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Erro'),
  });

  const reengagementMutation = useMutation({
    mutationFn: (t: Template) =>
      t.isReengagement
        ? templatesService.clearReengagement(t.id, selectedChannelId)
        : templatesService.setReengagement(t.id, selectedChannelId),
    onSuccess: (_data, t) => {
      toast.success(
        t.isReengagement
          ? 'Template de retomada removido'
          : 'Template de retomada definido para este canal',
      );
      refresh();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Erro'),
  });

  const handleSubmit = (t: Template) => {
    submitMutation.mutate(t.id);
  };

  const { confirm, confirmDialog } = useConfirm();
  const handleRemove = async (t: Template) => {
    const ok = await confirm({
      title: `Excluir o template "${t.displayName || t.name}"?`,
      description:
        'Ele sai deste canal e deixa de aparecer para a equipe na hora de enviar. Esta ação não pode ser desfeita.',
      confirmLabel: 'Excluir',
      destructive: true,
    });
    if (!ok) return;
    removeMutation.mutate(t.id);
  };

  // Sem canais WhatsApp Oficial: bloqueia a tela.
  if (waChannels.length === 0) {
    return (
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          Templates
        </h2>
        <EmptyState
          icon={FileText}
          title="Nenhum canal WhatsApp Oficial"
          description="Templates só existem em canais WhatsApp Oficial (Meta Cloud API). Conecte um canal para começar a criar e gerenciar templates."
          action={
            <Link
              href="/settings/channels"
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-soft transition-colors hover:bg-primary/90"
            >
              <Plus aria-hidden="true" className="h-4 w-4" />
              Configurar canais
            </Link>
          }
          className="mt-6 rounded-xl border border-dashed border-border"
        />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-foreground">
            Templates
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Modelos de mensagem aprovados pela Meta para iniciar conversas
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => syncMutation.mutate()}
            loading={syncMutation.isPending}
          >
            {!syncMutation.isPending && <RefreshCw aria-hidden="true" className="h-4 w-4" />}
            Sincronizar
          </Button>
          <Button
            type="button"
            onClick={() =>
              router.push('/settings/templates/new?channel=' + selectedChannelId)
            }
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
            Novo template
          </Button>
        </div>
      </div>

      <div className="mt-6 max-w-xs">
        <select
          aria-label="Canal WhatsApp Oficial"
          className={`${controlCls} w-full`}
          value={selectedChannelId}
          onChange={(e) => setSelectedChannelId(e.target.value)}
        >
          {waChannels.map((ch) => (
            <option key={ch.id} value={ch.id}>
              {ch.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-6 space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-xl border border-border bg-muted/50"
            />
          ))
        ) : templates && templates.length > 0 ? (
          templates.map((t) => {
            const canSubmit = t.status === 'DRAFT' || t.status === 'REJECTED';
            return (
              <div
                key={t.id}
                className="rounded-xl border border-border bg-card p-4 shadow-soft"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate font-mono text-sm font-medium text-foreground">
                        {t.displayName || t.name}
                      </h3>
                      <StatusBadge status={t.status} reason={t.rejectionReason} />
                      {t.isReengagement && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                          <MessageSquareReply className="h-3 w-3" />
                          Retomada
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {CATEGORY_LABEL[t.category] ?? t.category} · {t.language}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {(t.status === 'APPROVED' || t.isReengagement) && (
                      <button
                        onClick={() => reengagementMutation.mutate(t)}
                        disabled={reengagementMutation.isPending}
                        type="button"
                        className={`flex h-9 w-9 items-center justify-center rounded-lg hover:bg-primary/10 hover:text-primary disabled:opacity-50 ${
                          t.isReengagement ? 'text-primary' : 'text-muted-foreground'
                        }`}
                        title={
                          t.isReengagement
                            ? 'Deixar de usar para retomar contato'
                            : 'Usar para retomar contato (ícone do chat)'
                        }
                        aria-label={
                          t.isReengagement
                            ? 'Deixar de usar para retomar contato'
                            : 'Usar para retomar contato'
                        }
                        aria-pressed={!!t.isReengagement}
                      >
                        {reengagementMutation.isPending &&
                        reengagementMutation.variables?.id === t.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <MessageSquareReply className="h-4 w-4" />
                        )}
                      </button>
                    )}
                    <button
                      onClick={() =>
                        router.push(
                          '/settings/templates/' + t.id + '?channel=' + selectedChannelId,
                        )
                      }
                      type="button"
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label={`Editar ${t.displayName || t.name}`}
                      title="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    {canSubmit && (
                      <button
                        onClick={() => handleSubmit(t)}
                        disabled={submitMutation.isPending}
                        type="button"
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary disabled:opacity-50"
                        aria-label={`Enviar ${t.displayName || t.name} para aprovação`}
                        title="Enviar para aprovação"
                      >
                        {submitMutation.isPending &&
                        submitMutation.variables === t.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => handleRemove(t)}
                      disabled={removeMutation.isPending}
                      type="button"
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-urgent-wash hover:text-urgent-ink disabled:opacity-50"
                      aria-label={`Excluir ${t.displayName || t.name}`}
                      title="Excluir"
                    >
                      {removeMutation.isPending &&
                      removeMutation.variables === t.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <EmptyState
            icon={FileText}
            title="Nenhum template neste canal"
            description="Crie um template para iniciar conversas com clientes ou sincronize os que já existem na Meta."
            action={
              <Button
                type="button"
                onClick={() =>
                  router.push('/settings/templates/new?channel=' + selectedChannelId)
                }
              >
                <Plus aria-hidden="true" className="h-4 w-4" />
                Novo template
              </Button>
            }
            className="rounded-xl border border-dashed border-border"
          />
        )}
      </div>
      {confirmDialog}
    </div>
  );
}
