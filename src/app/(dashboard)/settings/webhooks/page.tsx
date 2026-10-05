'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Plus, Trash2, Webhook, Send, Power } from 'lucide-react';
import { toast } from 'sonner';
import { webhooksService, WEBHOOK_EVENTS, type WebhookSub } from '@/features/settings/services/webhooks.service';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { controlCls } from '@/components/ui/control';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';
import {
  SettingsPageHeader,
  settingsCardCls,
  settingsCardTitleCls,
} from '@/features/settings/components/settings-page-header';

const iconBtnCls =
  'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export default function SettingsWebhooksPage() {
  const qc = useQueryClient();
  const { confirm, confirmDialog } = useConfirm();
  const [url, setUrl] = useState('');
  const [events, setEvents] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);

  const { data: hooks, isLoading } = useQuery({ queryKey: ['webhooks'], queryFn: () => webhooksService.list() });
  const refresh = () => qc.invalidateQueries({ queryKey: ['webhooks'] });

  const toggleEvent = (e: string) =>
    setEvents((prev) => (prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]));

  const handleCreate = async () => {
    if (!url.trim() || events.length === 0) {
      toast.error('Informe a URL e ao menos um evento');
      return;
    }
    setCreating(true);
    try {
      const created = await webhooksService.create({ url: url.trim(), events });
      setCreatedSecret(created.secret);
      setUrl('');
      setEvents([]);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar webhook');
    } finally {
      setCreating(false);
    }
  };

  const handleRemove = async (h: WebhookSub) => {
    const confirmed = await confirm({
      title: 'Excluir este webhook?',
      description: (
        <>
          <span className="break-all font-mono text-xs text-foreground">{h.url}</span> deixa de receber os eventos do
          chat na hora. A chave secreta dele é perdida: para voltar, será preciso criar outro webhook.
        </>
      ),
      confirmLabel: 'Excluir',
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await webhooksService.remove(h.id);
      toast.success('Webhook excluído');
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro');
    }
  };

  const handlePing = async (h: WebhookSub) => {
    try {
      await webhooksService.ping(h.id);
      toast.success('Teste enviado');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro');
    }
  };

  const handleToggle = async (h: WebhookSub) => {
    try {
      await webhooksService.update(h.id, { isActive: !h.isActive });
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro');
    }
  };

  return (
    <div>
      <SettingsPageHeader
        title="Webhooks"
        description="Receba eventos do chat na sua URL. A chave secreta é mostrada uma única vez, na criação."
      />

      <section className={`mt-6 ${settingsCardCls}`}>
        <h3 className={settingsCardTitleCls}>Novo webhook</h3>
        <div className="mt-3 space-y-4">
          <div>
            <label htmlFor="webhook-url" className="mb-1 block text-sm font-medium text-foreground">
              URL de destino
            </label>
            <input
              id="webhook-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://seu-sistema.com/webhooks/bullq"
              className={`${controlCls} w-full`}
            />
          </div>
          <div>
            <p id="webhook-events" className="mb-1.5 text-xs font-medium text-muted-foreground">
              Eventos que serão enviados
            </p>
            <div role="group" aria-labelledby="webhook-events" className="flex flex-wrap gap-2">
              {WEBHOOK_EVENTS.map((e) => {
                const selected = events.includes(e);
                return (
                  <button
                    key={e}
                    type="button"
                    onClick={() => toggleEvent(e)}
                    aria-pressed={selected}
                    className={cn(
                      'inline-flex h-8 items-center gap-1.5 rounded-full border px-3 font-mono text-xs transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      selected
                        ? 'border-primary/30 bg-primary/10 font-medium text-primary'
                        : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                  >
                    {selected && <Check aria-hidden="true" className="h-3 w-3" />}
                    {e}
                  </button>
                );
              })}
            </div>
          </div>
          <Button onClick={handleCreate} disabled={creating} className="w-full sm:w-auto">
            <Plus aria-hidden="true" className="h-4 w-4" /> {creating ? 'Criando…' : 'Criar webhook'}
          </Button>
        </div>

        {createdSecret && (
          <div className="mt-4 rounded-lg bg-warning-wash p-3 text-warning-ink">
            <p className="text-xs font-medium">Chave secreta (copie agora — não será exibida novamente):</p>
            <code className="mt-1 block break-all font-mono text-xs">{createdSecret}</code>
          </div>
        )}
      </section>

      <div className="mt-4 rounded-xl border border-border bg-card shadow-soft">
        {isLoading ? (
          <div className="px-5 py-4">
            <div className="h-4 w-64 max-w-full animate-pulse rounded bg-muted" />
            <div className="mt-2 h-3 w-40 animate-pulse rounded bg-muted" />
          </div>
        ) : !hooks?.length ? (
          <EmptyState
            size="sm"
            icon={Webhook}
            title="Nenhum webhook criado"
            description="Informe a URL e escolha os eventos acima para começar a receber."
          />
        ) : (
          <ul className="divide-y divide-border">
            {hooks.map((h) => (
              <li key={h.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-foreground" title={h.url}>
                      {h.url}
                    </span>
                    {!h.isActive && (
                      <span className="shrink-0 rounded-md bg-urgent-wash px-2 py-0.5 text-[11px] font-semibold leading-none text-urgent-ink">
                        Desativado
                      </span>
                    )}
                  </div>
                  <div className="mt-1 font-mono text-xs text-muted-foreground">{h.events.join(', ')}</div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handlePing(h)}
                    className={`${iconBtnCls} hover:bg-muted hover:text-foreground`}
                    title="Enviar teste"
                    aria-label={`Enviar teste para ${h.url}`}
                  >
                    <Send aria-hidden="true" className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggle(h)}
                    aria-pressed={h.isActive}
                    className={`${iconBtnCls} hover:bg-muted hover:text-foreground`}
                    title={h.isActive ? 'Desativar' : 'Ativar'}
                    aria-label={`${h.isActive ? 'Desativar' : 'Ativar'} o webhook ${h.url}`}
                  >
                    <Power aria-hidden="true" className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(h)}
                    className={`${iconBtnCls} hover:bg-urgent-wash hover:text-urgent-ink`}
                    title="Excluir"
                    aria-label={`Excluir o webhook ${h.url}`}
                  >
                    <Trash2 aria-hidden="true" className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {confirmDialog}
    </div>
  );
}
