'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Send, Trash2, RefreshCw, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useOrgId } from '@/hooks/use-org-query-key';
import { channelsService } from '@/features/channels/services/channels.service';
import { templatesService, type Template } from '../services/templates.service';
import { StatusBadge } from './status-badge';

const inputCls =
  'flex h-10 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100';

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

  const handleSubmit = (t: Template) => {
    submitMutation.mutate(t.id);
  };

  const handleRemove = (t: Template) => {
    if (!confirm('Excluir este template?')) return;
    removeMutation.mutate(t.id);
  };

  // Sem canais WhatsApp Oficial: bloqueia a tela.
  if (waChannels.length === 0) {
    return (
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Templates
        </h2>
        <div className="mt-6 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-200 py-16 dark:border-zinc-800">
          <FileText className="h-10 w-10 text-zinc-300 dark:text-zinc-600" />
          <p className="mt-3 text-sm font-medium text-zinc-600 dark:text-zinc-400">
            Nenhum canal WhatsApp Oficial
          </p>
          <p className="mt-1 max-w-sm text-center text-xs text-zinc-400 dark:text-zinc-500">
            Templates só existem em canais WhatsApp Oficial (Meta Cloud API).
            Conecte um canal para começar a criar e gerenciar templates.
          </p>
          <Link
            href="/settings/channels"
            className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-3.5 w-3.5" />
            Configurar canais
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Templates
          </h2>
          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
            Modelos de mensagem aprovados pela Meta para iniciar conversas
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            {syncMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Sincronizar
          </button>
          <button
            onClick={() =>
              router.push('/settings/templates/new?channel=' + selectedChannelId)
            }
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Novo template
          </button>
        </div>
      </div>

      <div className="mt-6 max-w-xs">
        <select
          className={inputCls}
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
              className="h-20 animate-pulse rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900"
            />
          ))
        ) : templates && templates.length > 0 ? (
          templates.map((t) => {
            const canSubmit = t.status === 'DRAFT' || t.status === 'REJECTED';
            return (
              <div
                key={t.id}
                className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate font-mono text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {t.displayName || t.name}
                      </h3>
                      <StatusBadge status={t.status} reason={t.rejectionReason} />
                    </div>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      {t.category} · {t.language}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() =>
                        router.push(
                          '/settings/templates/' + t.id + '?channel=' + selectedChannelId,
                        )
                      }
                      className="rounded-md p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800"
                      title="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    {canSubmit && (
                      <button
                        onClick={() => handleSubmit(t)}
                        disabled={submitMutation.isPending}
                        className="rounded-md p-2 text-zinc-400 hover:bg-primary/10 hover:text-primary disabled:opacity-50"
                        title="Submeter"
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
                      className="rounded-md p-2 text-zinc-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-950/30"
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
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-200 py-16 dark:border-zinc-800">
            <FileText className="h-10 w-10 text-zinc-300 dark:text-zinc-600" />
            <p className="mt-3 text-sm font-medium text-zinc-600 dark:text-zinc-400">
              Nenhum template neste canal
            </p>
            <p className="mt-1 max-w-sm text-center text-xs text-zinc-400 dark:text-zinc-500">
              Crie um template para iniciar conversas com clientes ou sincronize
              os já existentes na Meta.
            </p>
            <button
              onClick={() =>
                router.push('/settings/templates/new?channel=' + selectedChannelId)
              }
              className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Plus className="h-3.5 w-3.5" />
              Novo template
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
