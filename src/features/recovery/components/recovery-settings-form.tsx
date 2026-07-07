'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { Loader2, Check, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useOrgId } from '@/hooks/use-org-query-key';
import { channelsService } from '@/features/channels/services/channels.service';
import { templatesService } from '@/features/templates/services/templates.service';
import {
  recoverySettingsService,
  type RecoverySettings,
} from '../services/recovery-settings.service';

const inputCls =
  'flex h-10 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100';
const labelCls = 'text-sm font-medium text-zinc-700 dark:text-zinc-300';

const LANGS = [
  { value: 'pt_BR', label: 'Português (pt_BR)' },
  { value: 'en_US', label: 'English (en_US)' },
  { value: 'es_ES', label: 'Español (es_ES)' },
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
    return (
      <div className="flex items-center gap-2 text-sm text-zinc-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando...
      </div>
    );
  }

  return (
    <div>
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Recuperação de vendas
        </h2>
        <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
          Escolha o canal e os templates usados na recuperação automática.
        </p>
      </div>

      <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
        O template precisa usar{' '}
        <code className="rounded bg-amber-100 px-1 py-0.5 font-mono text-xs dark:bg-amber-900/40">
          {'{{1}}'}
        </code>{' '}
        = nome do cliente e{' '}
        <code className="rounded bg-amber-100 px-1 py-0.5 font-mono text-xs dark:bg-amber-900/40">
          {'{{2}}'}
        </code>{' '}
        = produto.
      </div>

      <div className="mt-6 space-y-5">
        {/* Canal de disparo */}
        <div className="space-y-1.5">
          <label className={labelCls}>Canal de disparo</label>
          <select
            className={inputCls}
            value={form.outreachChannelId}
            onChange={(e) => handleChannelChange(e.target.value)}
          >
            <option value="">— selecione —</option>
            {officialChannels.map((ch) => (
              <option key={ch.id} value={ch.id}>
                {ch.name}
              </option>
            ))}
          </select>
          {officialChannels.length === 0 && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Nenhum canal WhatsApp oficial disponível.{' '}
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
              <div className="flex items-center gap-2 text-sm text-zinc-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando templates...
              </div>
            ) : approvedTemplates.length === 0 ? (
              <div className="flex items-start gap-2 rounded-lg border border-dashed border-zinc-300 p-3 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
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
                  <label className={labelCls}>Template de abertura</label>
                  <select
                    className={inputCls}
                    value={form.openerTemplateName}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        openerTemplateName: e.target.value,
                      }))
                    }
                  >
                    <option value="">— nenhum —</option>
                    {approvedTemplates.map((t) => (
                      <option key={t.id} value={t.name}>
                        {t.displayName || t.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Template de follow-up */}
                <div className="space-y-1.5">
                  <label className={labelCls}>Template de follow-up</label>
                  <select
                    className={inputCls}
                    value={form.followUpTemplateName}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        followUpTemplateName: e.target.value,
                      }))
                    }
                  >
                    <option value="">— nenhum —</option>
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
          <label className={labelCls}>Idioma do template</label>
          <select
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
        <button
          onClick={() => updateMutation.mutate()}
          disabled={updateMutation.isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          {updateMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
          Salvar
        </button>
      </div>
    </div>
  );
}
