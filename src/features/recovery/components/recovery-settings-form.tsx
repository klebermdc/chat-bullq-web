'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useOrgId } from '@/hooks/use-org-query-key';
import { channelsService } from '@/features/channels/services/channels.service';
import { templatesService } from '@/features/templates/services/templates.service';
import {
  recoverySettingsService,
  type RecoverySettings,
} from '../services/recovery-settings.service';

import { Button } from '@/components/ui/button';
import { controlCls } from '@/components/ui/control';
import { LoadingState } from '@/components/ui/empty-state';

const inputCls = `${controlCls} w-full`;
const labelCls = 'block text-sm font-medium text-foreground';
const codeCls = 'rounded bg-background/60 px-1 py-0.5 font-mono text-xs';

const LANGS = [
  { value: 'pt_BR', label: 'Português (pt_BR)' },
  { value: 'en_US', label: 'Inglês (en_US)' },
  { value: 'es_ES', label: 'Espanhol (es_ES)' },
];

interface FormState {
  outreachChannelId: string;
  openerTemplateName: string;
  followUpTemplateName: string;
  templateLang: string;
}

const EMPTY: FormState = {
  outreachChannelId: '',
  openerTemplateName: '',
  followUpTemplateName: '',
  templateLang: 'pt_BR',
};

export function RecoverySettingsForm() {
  const orgId = useOrgId();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<FormState>(EMPTY);

  const { data: settings, isLoading: loadingSettings } = useQuery({
    queryKey: ['recovery-settings', orgId],
    queryFn: () => recoverySettingsService.get(),
  });

  const { data: channels } = useQuery({
    queryKey: ['channels', orgId],
    queryFn: () => channelsService.list(),
  });

  const officialChannels = useMemo(
    () => (channels ?? []).filter((c) => c.type === 'WHATSAPP_OFFICIAL'),
    [channels],
  );

  // Hidrata o form a partir das settings salvas.
  useEffect(() => {
    if (!settings) return;
    setForm({
      outreachChannelId: settings.outreachChannelId ?? '',
      openerTemplateName: settings.openerTemplateName ?? '',
      followUpTemplateName: settings.followUpTemplateName ?? '',
      templateLang: settings.templateLang ?? 'pt_BR',
    });
  }, [settings]);

  const { data: templates, isLoading: loadingTemplates } = useQuery({
    queryKey: ['templates', orgId, form.outreachChannelId],
    queryFn: () => templatesService.list(form.outreachChannelId),
    enabled: !!form.outreachChannelId,
  });

  const approvedTemplates = useMemo(
    () => (templates ?? []).filter((t) => t.status === 'APPROVED'),
    [templates],
  );

  const handleChannelChange = (outreachChannelId: string) => {
    // Templates podem não existir no novo canal — reseta as escolhas.
    setForm((prev) => ({
      ...prev,
      outreachChannelId,
      openerTemplateName: '',
      followUpTemplateName: '',
    }));
  };

  const updateMutation = useMutation({
    mutationFn: () =>
      recoverySettingsService.update({
        outreachChannelId: form.outreachChannelId || null,
        openerTemplateName: form.openerTemplateName || null,
        followUpTemplateName: form.followUpTemplateName || null,
        templateLang: form.templateLang || null,
      } satisfies Partial<RecoverySettings>),
    onSuccess: () => {
      toast.success('Configuração salva');
      queryClient.invalidateQueries({ queryKey: ['recovery-settings'] });
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : 'Erro'),
  });

  if (loadingSettings) {
    return <LoadingState className="justify-start" />;
  }

  return (
    <div>
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          Recuperação de vendas
        </h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Escolha o canal e os templates usados na recuperação automática.
        </p>
      </div>

      <div className="mt-4 rounded-lg bg-warning-wash p-3 text-sm text-warning-ink">
        O template precisa usar <code className={codeCls}>{'{{1}}'}</code> para o
        nome do cliente e <code className={codeCls}>{'{{2}}'}</code> para o
        produto.
      </div>

      <div className="mt-6 space-y-5">
        {/* Canal de disparo */}
        <div className="space-y-1.5">
          <label htmlFor="recovery-channel" className={labelCls}>
            Canal de disparo
          </label>
          <select
            id="recovery-channel"
            className={inputCls}
            value={form.outreachChannelId}
            onChange={(e) => handleChannelChange(e.target.value)}
          >
            <option value="">Selecione um canal</option>
            {officialChannels.map((ch) => (
              <option key={ch.id} value={ch.id}>
                {ch.name}
              </option>
            ))}
          </select>
          {officialChannels.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Nenhum canal de WhatsApp (API oficial) disponível.{' '}
              <Link
                href="/settings/channels"
                className="text-primary hover:underline"
              >
                Conectar um canal
              </Link>
            </p>
          )}
        </div>

        {form.outreachChannelId && (
          <>
            {loadingTemplates ? (
              <LoadingState label="Carregando templates…" className="justify-start py-2" />
            ) : approvedTemplates.length === 0 ? (
              <div className="flex items-start gap-2 rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
                <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-warning-ink" />
                <span>
                  Nenhum template aprovado neste canal.{' '}
                  <Link
                    href="/settings/templates"
                    className="text-primary hover:underline"
                  >
                    Gerenciar templates
                  </Link>
                </span>
              </div>
            ) : (
              <>
                {/* Template de abertura */}
                <div className="space-y-1.5">
                  <label htmlFor="recovery-opener" className={labelCls}>
                    Template de abertura
                  </label>
                  <select
                    id="recovery-opener"
                    className={inputCls}
                    value={form.openerTemplateName}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        openerTemplateName: e.target.value,
                      }))
                    }
                  >
                    <option value="">Nenhum</option>
                    {approvedTemplates.map((t) => (
                      <option key={t.id} value={t.name}>
                        {t.displayName || t.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Template de follow-up */}
                <div className="space-y-1.5">
                  <label htmlFor="recovery-follow-up" className={labelCls}>
                    Template de follow-up
                  </label>
                  <select
                    id="recovery-follow-up"
                    className={inputCls}
                    value={form.followUpTemplateName}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        followUpTemplateName: e.target.value,
                      }))
                    }
                  >
                    <option value="">Nenhum</option>
                    {approvedTemplates.map((t) => (
                      <option key={t.id} value={t.name}>
                        {t.displayName || t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </>
        )}

        {/* Idioma */}
        <div className="space-y-1.5">
          <label htmlFor="recovery-lang" className={labelCls}>
            Idioma do template
          </label>
          <select
            id="recovery-lang"
            className={inputCls}
            value={form.templateLang}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, templateLang: e.target.value }))
            }
          >
            {LANGS.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <Button
          onClick={() => updateMutation.mutate()}
          loading={updateMutation.isPending}
        >
          Salvar
        </Button>
      </div>
    </div>
  );
}
