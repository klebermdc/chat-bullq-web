'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Webhook, Send, Power } from 'lucide-react';
import { toast } from 'sonner';
import { webhooksService, WEBHOOK_EVENTS, type WebhookSub } from '@/features/settings/services/webhooks.service';

export default function SettingsWebhooksPage() {
  const qc = useQueryClient();
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
      toast.error('Informe URL e ao menos um evento');
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
    if (!confirm(`Remover o webhook ${h.url}?`)) return;
    try {
      await webhooksService.remove(h.id);
      toast.success('Removido');
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro');
    }
  };

  const handlePing = async (h: WebhookSub) => {
    try {
      await webhooksService.ping(h.id);
      toast.success('Ping enviado');
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
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Webhooks</h2>
        <p className="mt-0.5 text-sm text-zinc-500">
          Receba eventos do chat na sua URL. O secret é mostrado uma única vez na criação.
        </p>
      </div>

      <div className="mt-6 space-y-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://seu-sistema.com/webhooks/bullq"
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
        />
        <div className="flex flex-wrap gap-2">
          {WEBHOOK_EVENTS.map((e) => (
            <button
              key={e}
              onClick={() => toggleEvent(e)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                events.includes(e)
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
              }`}
            >
              {e}
            </button>
          ))}
        </div>
        <button
          onClick={handleCreate}
          disabled={creating}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> {creating ? 'Criando...' : 'Criar webhook'}
        </button>
      </div>

      {createdSecret && (
        <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-900 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-200">
          <p className="text-xs font-medium">Secret (copie agora — não será exibido novamente):</p>
          <code className="mt-1 block break-all font-mono text-xs">{createdSecret}</code>
        </div>
      )}

      <div className="mt-6 space-y-2">
        {isLoading ? (
          <div className="h-16 animate-pulse rounded-lg border bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900" />
        ) : !hooks?.length ? (
          <div className="flex flex-col items-center py-12 text-center">
            <Webhook className="h-10 w-10 text-zinc-200 dark:text-zinc-700" />
            <p className="mt-3 text-sm text-zinc-500">Nenhum webhook criado</p>
          </div>
        ) : (
          hooks.map((h) => (
            <div
              key={h.id}
              className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-200">{h.url}</span>
                  {!h.isActive && (
                    <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-600 dark:bg-red-900/30">
                      DESATIVADO
                    </span>
                  )}
                </div>
                <div className="mt-1 text-xs text-zinc-500">{h.events.join(', ')}</div>
              </div>
              <div className="ml-3 flex items-center gap-1">
                <button
                  onClick={() => handlePing(h)}
                  className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  title="Enviar ping"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleToggle(h)}
                  className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  title="Ativar/desativar"
                >
                  <Power className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleRemove(h)}
                  className="rounded p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                  title="Remover"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
