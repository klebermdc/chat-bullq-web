'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Plus, Bot, Trash2, Power, PowerOff } from 'lucide-react';
import { toast } from 'sonner';
import { chatbotService, type ChatbotFlow } from '@/features/chatbot/services/chatbot.service';
import { useOrgId } from '@/hooks/use-org-query-key';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { controlCls } from '@/components/ui/control';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader, PageShell } from '@/components/layout/page-shell';

/** Rótulo em pt-BR do gatilho do fluxo; valor desconhecido vira texto legível. */
const TRIGGER_TYPE_LABELS: Record<string, string> = {
  NEW_CONVERSATION: 'Nova conversa',
  FIRST_MESSAGE: 'Primeira mensagem',
  ALL_MESSAGES: 'Toda mensagem',
  MESSAGE_RECEIVED: 'Mensagem recebida',
  KEYWORD: 'Palavra-chave',
  MANUAL: 'Manual',
  OUT_OF_HOURS: 'Fora do horário',
  WEBHOOK: 'Webhook',
};

function triggerTypeLabel(value: string | null | undefined): string {
  if (!value) return 'Sem gatilho';
  const known = TRIGGER_TYPE_LABELS[value.toUpperCase()];
  if (known) return known;
  const humanised = value.replace(/[_-]+/g, ' ').trim().toLowerCase();
  return humanised.charAt(0).toUpperCase() + humanised.slice(1);
}

export default function ChatbotPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const { confirm, confirmDialog } = useConfirm();

  const orgId = useOrgId();
  const { data: flows, isLoading } = useQuery({
    queryKey: ['chatbot-flows', orgId],
    queryFn: () => chatbotService.list(),
  });

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const flow = await chatbotService.create({ name: newName.trim() });
      queryClient.invalidateQueries({ queryKey: ['chatbot-flows'] });
      setShowCreate(false);
      setNewName('');
      router.push(`/chatbot/${flow.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar fluxo');
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (flow: ChatbotFlow) => {
    try {
      await chatbotService.update(flow.id, { isActive: !flow.isActive });
      queryClient.invalidateQueries({ queryKey: ['chatbot-flows'] });
      toast.success(flow.isActive ? 'Fluxo desativado' : 'Fluxo ativado');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro');
    }
  };

  const handleDelete = async (flow: ChatbotFlow) => {
    const isConfirmed = await confirm({
      title: `Remover o fluxo "${flow.name}"?`,
      description: flow.isActive
        ? 'O fluxo está ativo e para de responder na hora. Esta ação não pode ser desfeita.'
        : 'Esta ação não pode ser desfeita.',
      confirmLabel: 'Remover',
      destructive: true,
    });
    if (!isConfirmed) return;
    try {
      await chatbotService.remove(flow.id);
      queryClient.invalidateQueries({ queryKey: ['chatbot-flows'] });
      toast.success('Fluxo removido');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro');
    }
  };

  return (
    <PageShell>
      <PageHeader
        title="Chatbot"
        description="Crie e gerencie fluxos de atendimento automático"
        actions={
          <Button onClick={() => setShowCreate(true)}>
            <Plus aria-hidden="true" className="h-4 w-4" /> Novo fluxo
          </Button>
        }
      />

      {showCreate && (
        <div className="mt-6 rounded-xl border border-border bg-card p-4 shadow-soft">
          <label htmlFor="chatbot-new-flow-name" className="text-sm font-medium text-foreground">
            Nome do fluxo
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            <input
              id="chatbot-new-flow-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="Ex.: Atendimento inicial"
              className={`${controlCls} min-w-0 flex-1 basis-48`}
              autoFocus
            />
            <Button variant="ghost" onClick={() => { setShowCreate(false); setNewName(''); }}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              Criar
            </Button>
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-36 animate-pulse rounded-xl border border-border bg-muted" />
          ))
        ) : flows && flows.length > 0 ? (
          flows.map((flow) => {
            const nodeCount = flow._count?.nodes || flow.nodes?.length || 0;
            return (
              <div
                key={flow.id}
                className="rounded-xl border border-border bg-card p-5 shadow-soft transition-shadow hover:shadow-elevated"
              >
                <div className="flex items-start justify-between gap-3">
                  <button
                    onClick={() => router.push(`/chatbot/${flow.id}`)}
                    className="flex min-w-0 items-start gap-3 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <Bot aria-hidden="true" className="h-5 w-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-foreground">{flow.name}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        <span className="tabular-nums">{nodeCount}</span> {nodeCount === 1 ? 'nó' : 'nós'} ·{' '}
                        {triggerTypeLabel(flow.triggerType)}
                      </span>
                      {flow.channels?.length > 0 && (
                        <span className="mt-1.5 flex flex-wrap gap-1">
                          {flow.channels.map((c) => (
                            <Badge key={c.channelId} variant="neutral" className="font-medium">
                              {c.channel.name}
                            </Badge>
                          ))}
                        </span>
                      )}
                    </span>
                  </button>
                  <Badge variant={flow.isActive ? 'success' : 'neutral'} className="shrink-0">
                    {flow.isActive ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
                <div className="mt-3 flex gap-2 border-t border-border pt-3">
                  <Button variant="ghost" size="sm" onClick={() => handleToggle(flow)}>
                    {flow.isActive ? (
                      <PowerOff aria-hidden="true" className="h-3.5 w-3.5" />
                    ) : (
                      <Power aria-hidden="true" className="h-3.5 w-3.5" />
                    )}
                    {flow.isActive ? 'Desativar' : 'Ativar'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(flow)}
                    className="text-muted-foreground hover:bg-urgent-wash hover:text-urgent-ink"
                  >
                    <Trash2 aria-hidden="true" className="h-3.5 w-3.5" /> Remover
                  </Button>
                </div>
              </div>
            );
          })
        ) : (
          <EmptyState
            icon={Bot}
            title="Nenhum fluxo criado"
            description="Crie seu primeiro chatbot para automatizar o atendimento."
            action={
              <Button onClick={() => setShowCreate(true)}>
                <Plus aria-hidden="true" className="h-4 w-4" /> Novo fluxo
              </Button>
            }
            className="col-span-full rounded-xl border border-dashed border-border"
          />
        )}
      </div>

      {confirmDialog}
    </PageShell>
  );
}
