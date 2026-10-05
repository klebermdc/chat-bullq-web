'use client';

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Phone, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { callsService } from '@/features/inbox/services/calls.service';
import { Button } from '@/components/ui/button';
import { controlCls } from '@/components/ui/control';
import { SettingsPageHeader } from '@/features/settings/components/settings-page-header';
import { Toggle } from '@/features/settings/components/toggle';

/** `<label>` envolvendo o controle: o nome fica ligado ao campo sem precisar de id. */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-foreground">{label}</span>
      {children}
    </label>
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
      toast.success('Configuração da Sonax salva');
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
      <SettingsPageHeader
        title="Ligações (Sonax)"
        description="Configure a integração de ligação em um clique com a Sonax. Ao ligar, seu ramal toca primeiro; ao atender, a Sonax disca para o cliente."
      />

      {isLoading ? (
        <div className="mt-6 h-64 animate-pulse rounded-xl bg-muted" />
      ) : (
        <div className="mt-6 space-y-4 rounded-xl border border-border bg-card p-5 shadow-soft">
          <label className="flex cursor-pointer items-center justify-between gap-4 border-b border-border pb-4">
            <span className="text-sm font-medium text-foreground">Ativar ligações via Sonax</span>
            <Toggle checked={enabled} onChange={setEnabled} label="Ativar ligações via Sonax" />
          </label>

          <Field label="ID do cliente">
            <input
              value={idCliente}
              onChange={(e) => setIdCliente(e.target.value)}
              className={`${controlCls} w-full`}
              placeholder="ID da conta na Sonax"
            />
          </Field>

          <Field label="Token">
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className={`${controlCls} w-full`}
              placeholder={
                settings?.tokenConfigured
                  ? '•••• configurado (deixe em branco para manter)'
                  : 'Cole o token da Sonax'
              }
            />
          </Field>

          <Field label="URL base do Click2Call (opcional)">
            <input
              value={click2callBaseUrl}
              onChange={(e) => setClick2callBaseUrl(e.target.value)}
              className={`${controlCls} w-full`}
              placeholder="https://..."
            />
          </Field>

          {settings?.webhookUrl && (
            <div>
              <label htmlFor="sonax-webhook-url" className="mb-1 block text-sm font-medium text-foreground">
                URL de desligamento (webhook)
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="sonax-webhook-url"
                  readOnly
                  value={settings.webhookUrl}
                  className={`${controlCls} w-full min-w-0 font-mono text-xs`}
                />
                <Button type="button" variant="outline" onClick={copyWebhook} className="shrink-0">
                  <Copy aria-hidden="true" className="h-3.5 w-3.5" /> Copiar
                </Button>
              </div>
              <p className="mt-1.5 flex items-start gap-1.5 text-xs text-muted-foreground">
                <Phone aria-hidden="true" className="mt-0.5 h-3 w-3 shrink-0" />
                Cole esta URL no campo &quot;URL de desligamento&quot; do painel da Sonax para receber o status e a duração das chamadas.
              </p>
            </div>
          )}

          <div className="flex justify-end pt-1">
            <Button onClick={save} disabled={saving}>
              {saving ? 'Salvando…' : 'Salvar'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
