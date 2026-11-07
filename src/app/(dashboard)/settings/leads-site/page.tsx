'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { controlCls } from '@/components/ui/control';
import { api } from '@/lib/api';
import { useOrgId } from '@/hooks/use-org-query-key';
import {
  SettingsPageHeader,
  settingsCardCls,
  settingsCardTitleCls,
} from '@/features/settings/components/settings-page-header';
import { Toggle } from '@/features/settings/components/toggle';
import {
  websiteLeadsService,
  type RotatedToken,
} from '@/features/website-leads/services/website-leads.service';
import { buildWebhookUrl, FOLLOWUP_STATUS_LABELS } from '@/features/website-leads/lib/website-leads';

const MIN_DELAY = 1;
const MAX_DELAY = 1440;

export default function WebsiteLeadsSettingsPage() {
  const orgId = useOrgId();
  const queryClient = useQueryClient();
  const { confirm, confirmDialog } = useConfirm();
  const { data: settings, isLoading } = useQuery({
    queryKey: ['website-leads-settings', orgId],
    queryFn: () => websiteLeadsService.getSettings(),
  });

  const [enabled, setEnabled] = useState(false);
  const [channelId, setChannelId] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [delay, setDelay] = useState('5');
  const [saving, setSaving] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [fresh, setFresh] = useState<RotatedToken | null>(null);

  useEffect(() => {
    if (!settings) return;
    setEnabled(settings.enabled);
    setChannelId(settings.channelId ?? '');
    setTemplateId(settings.templateId ?? '');
    setDelay(String(settings.delayMinutes));
  }, [settings]);

  const templates = useMemo(
    () => (settings?.templates ?? []).filter((t) => t.channelId === channelId),
    [settings, channelId],
  );
  const chosenTemplate = templates.find((t) => t.id === templateId);

  const save = async () => {
    const minutes = Number(delay);
    if (!Number.isInteger(minutes) || minutes < MIN_DELAY || minutes > MAX_DELAY) {
      toast.error(`Minutos de espera: de ${MIN_DELAY} a ${MAX_DELAY}.`);
      return;
    }
    setSaving(true);
    try {
      await websiteLeadsService.updateSettings({
        enabled,
        channelId: channelId || null,
        templateId: templateId || null,
        delayMinutes: minutes,
      });
      toast.success('Leads do site salvo');
      queryClient.invalidateQueries({ queryKey: ['website-leads-settings'] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const rotate = async () => {
    if (settings?.hasToken) {
      const ok = await confirm({
        title: 'Gerar um token novo?',
        description:
          'O token atual para de funcionar na hora. Os formulários do site só voltam a entrar no Sendtur depois que você colar a URL nova no Elementor.',
        confirmLabel: 'Gerar novo token',
        destructive: true,
      });
      if (!ok) return;
    }
    setRotating(true);
    try {
      setFresh(await websiteLeadsService.rotateToken());
      queryClient.invalidateQueries({ queryKey: ['website-leads-settings'] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao gerar o token');
    } finally {
      setRotating(false);
    }
  };

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const urlFor = (path: string) => buildWebhookUrl(api.defaults.baseURL, path, origin);
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('URL copiada');
    } catch {
      toast.error('Não deu para copiar — selecione e copie à mão');
    }
  };

  return (
    <div>
      <SettingsPageHeader
        title="Leads do site"
        description={
          <span className="block max-w-prose">
            Os formulários do site entram aqui com a origem (UTM, campanha, anúncio). Se o cliente não chamar no
            WhatsApp em alguns minutos, o Sendtur manda o template e a Aline faz as perguntas.
          </span>
        }
      />

      {isLoading || !settings ? (
        <div className="mt-6 h-64 animate-pulse rounded-xl bg-muted" />
      ) : (
        <div className="mt-6 space-y-4">
          <section className={settingsCardCls}>
            <label className="flex cursor-pointer items-start justify-between gap-4">
              <div>
                <p className={settingsCardTitleCls}>Retorno automático ligado</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Desligado, os leads continuam entrando com a origem, mas nenhum template é enviado.
                </p>
              </div>
              <Toggle checked={enabled} onChange={setEnabled} label="Retorno automático ligado" />
            </label>
          </section>

          <section className={`${settingsCardCls} space-y-4`}>
            <Field label="Canal de envio" hint="WhatsApp oficial que manda o template.">
              <select
                value={channelId}
                onChange={(e) => {
                  setChannelId(e.target.value);
                  setTemplateId('');
                }}
                className={`${controlCls} w-full`}
              >
                <option value="">Escolha o canal</option>
                {settings.channels.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Template do retorno" hint='Use um template com {{1}} = primeiro nome e os botões "Sim, pode perguntar" / "Agora não".'>
              <select
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                className={`${controlCls} w-full`}
                disabled={!channelId}
              >
                <option value="">Escolha o template</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.displayName || t.name} — {t.status === 'APPROVED' ? 'aprovado' : t.status.toLowerCase()}
                  </option>
                ))}
              </select>
              {chosenTemplate && chosenTemplate.status !== 'APPROVED' && (
                <span className="mt-1 block text-xs text-warning-ink">
                  A Meta ainda não aprovou este template. Até aprovar, o retorno não sai (o lead fica registrado).
                </span>
              )}
              {chosenTemplate?.category === 'MARKETING' && (
                <span className="mt-1 block text-xs text-muted-foreground">
                  Template de marketing: a Meta cobra cada envio entregue.
                </span>
              )}
            </Field>
            <Field label="Minutos de espera" hint="Tempo para o cliente chamar sozinho antes do template.">
              <input
                type="number"
                min={MIN_DELAY}
                max={MAX_DELAY}
                value={delay}
                onChange={(e) => setDelay(e.target.value)}
                className={`${controlCls} w-32`}
              />
            </Field>
            <div className="pt-1">
              <Button onClick={save} disabled={saving}>
                {saving ? 'Salvando…' : 'Salvar'}
              </Button>
            </div>
          </section>

          <section className={`${settingsCardCls} space-y-3`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className={settingsCardTitleCls}>Webhook do Elementor</p>
                <p className="mt-0.5 max-w-prose text-xs text-muted-foreground">
                  {settings.hasToken
                    ? `Token atual: ${settings.tokenPreview}. Por segurança ele não é mostrado de novo; gere outro se perdeu a URL.`
                    : 'Gere o token para ter a URL que vai no Webhook dos formulários.'}
                </p>
              </div>
              <Button variant="outline" onClick={rotate} disabled={rotating}>
                <KeyRound aria-hidden="true" className="h-4 w-4" />
                {rotating ? 'Gerando…' : settings.hasToken ? 'Gerar novo token' : 'Gerar token'}
              </Button>
            </div>

            {fresh && (
              <div className="space-y-3 rounded-lg border border-warning-ink/30 bg-warning-wash p-3">
                <p className="text-xs font-medium text-warning-ink">
                  Copie agora: esta URL só aparece uma vez.
                </p>
                <UrlRow label="Formulário principal (form_agendamento)" url={urlFor(fresh.webhookPath)} onCopy={copy} />
                <UrlRow label="Formulário do guiamento" url={urlFor(fresh.webhookPathGuiamento)} onCopy={copy} />
                <p className="text-xs text-muted-foreground">
                  No Elementor: editar o formulário → Ações após o envio → Webhook → colar a URL. Faça nos dois.
                </p>
              </div>
            )}
          </section>

          <section className={settingsCardCls}>
            <p className={settingsCardTitleCls}>Últimos 30 dias</p>
            {Object.keys(settings.stats).length === 0 ? (
              <p className="mt-1 text-xs text-muted-foreground">Nenhum lead do site recebido ainda.</p>
            ) : (
              <dl className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {Object.entries(settings.stats).map(([status, count]) => (
                  <div key={status} className="rounded-lg bg-muted/50 px-3 py-2">
                    <dt className="text-xs text-muted-foreground">{FOLLOWUP_STATUS_LABELS[status] ?? status}</dt>
                    <dd className="text-lg font-semibold tabular-nums text-foreground">{count}</dd>
                  </div>
                ))}
              </dl>
            )}
          </section>
        </div>
      )}

      {confirmDialog}
    </div>
  );
}

function UrlRow({ label, url, onCopy }: { label: string; url: string; onCopy: (url: string) => void }) {
  return (
    <div>
      <span className="mb-1 block text-xs font-medium text-foreground">{label}</span>
      <div className="flex gap-2">
        <input readOnly value={url} className={`${controlCls} w-full font-mono text-xs`} onFocus={(e) => e.target.select()} />
        <Button variant="outline" onClick={() => onCopy(url)} aria-label={`Copiar URL — ${label}`}>
          <Copy aria-hidden="true" className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-foreground">{label}</span>
      {hint && <span className="mb-1.5 block max-w-prose text-xs text-muted-foreground">{hint}</span>}
      {children}
    </label>
  );
}
