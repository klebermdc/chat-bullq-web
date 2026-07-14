'use client';

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Phone, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { callsService } from '@/features/inbox/services/calls.service';

const inputCls =
  'w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">{label}</label>
      {children}
    </div>
  );
}

export default function SonaxSettingsPage() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useQuery({
    queryKey: ['sonax-settings'],
    queryFn: () => callsService.getSonaxSettings(),
  });

  const [enabled, setEnabled] = useState(false);
  const [idCliente, setIdCliente] = useState('');
  const [token, setToken] = useState('');
  const [click2callBaseUrl, setClick2callBaseUrl] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setEnabled(settings.enabled);
      setIdCliente(settings.idCliente ?? '');
      setClick2callBaseUrl(settings.click2callBaseUrl ?? '');
      setToken('');
    }
  }, [settings]);

  const save = async () => {
    setSaving(true);
    try {
      await callsService.saveSonaxSettings({
        enabled,
        idCliente: idCliente.trim(),
        click2callBaseUrl: click2callBaseUrl.trim() || undefined,
        ...(token.trim() ? { token: token.trim() } : {}),
      });
      toast.success('Config Sonax salva');
      setToken('');
      queryClient.invalidateQueries({ queryKey: ['sonax-settings'] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const copyWebhook = () => {
    if (settings?.webhookUrl) {
      navigator.clipboard.writeText(settings.webhookUrl);
      toast.success('URL copiada!');
    }
  };

  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Ligações (Sonax)</h2>
          <p className="mt-0.5 text-sm text-zinc-500">
            Configure a integração de click-to-call com a Sonax. Ao ligar, seu ramal toca primeiro; ao atender, a Sonax disca para o cliente.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-6 h-64 animate-pulse rounded-lg border bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900" />
      ) : (
        <div className="mt-6 space-y-4 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <label className="flex items-center gap-2.5 text-sm text-zinc-800 dark:text-zinc-200">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="h-4 w-4"
            />
            Ativar ligações via Sonax
          </label>

          <Field label="ID do Cliente">
            <input
              value={idCliente}
              onChange={(e) => setIdCliente(e.target.value)}
              className={inputCls}
              placeholder="ID da conta na Sonax"
            />
          </Field>

          <Field label="Token">
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className={inputCls}
              placeholder={
                settings?.tokenConfigured
                  ? '•••• configurado (deixe em branco p/ manter)'
                  : 'cole o token da Sonax'
              }
            />
          </Field>

          <Field label="URL base do Click2Call (opcional)">
            <input
              value={click2callBaseUrl}
              onChange={(e) => setClick2callBaseUrl(e.target.value)}
              className={inputCls}
              placeholder="https://..."
            />
          </Field>

          {settings?.webhookUrl && (
            <Field label="URL de desligamento (webhook)">
              <div className="flex items-center gap-2">
                <input readOnly value={settings.webhookUrl} className={`${inputCls} font-mono text-xs`} />
                <button
                  type="button"
                  onClick={copyWebhook}
                  title="Copiar"
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                >
                  <Copy className="h-3.5 w-3.5" /> Copiar
                </button>
              </div>
              <p className="mt-1.5 flex items-start gap-1.5 text-xs text-zinc-500">
                <Phone className="mt-0.5 h-3 w-3 shrink-0" />
                Cole esta URL no campo &quot;URL de desligamento&quot; do painel da Sonax para receber o status e a duração das chamadas.
              </p>
            </Field>
          )}

          <div className="flex justify-end pt-1">
            <button
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
