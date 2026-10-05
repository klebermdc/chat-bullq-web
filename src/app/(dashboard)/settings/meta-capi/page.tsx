'use client';

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Send, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { metaCapiService, type UpsertMetaCapi } from '@/features/settings/services/meta-capi.service';
import { useOrgId } from '@/hooks/use-org-query-key';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { controlCls } from '@/components/ui/control';
import { SettingsPageHeader } from '@/features/settings/components/settings-page-header';
import { Toggle } from '@/features/settings/components/toggle';

export default function MetaCapiPage() {
  const queryClient = useQueryClient();
  const { confirm, confirmDialog } = useConfirm();
  const orgId = useOrgId();
  const { data: config, isLoading } = useQuery({
    queryKey: ['meta-capi', orgId],
    queryFn: () => metaCapiService.get(),
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['meta-capi'] });
  const configured = !!config;

  const [datasetId, setDatasetId] = useState('');
  const [token, setToken] = useState('');
  const [testEventCode, setTestEventCode] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  // Preenche o form quando a config carrega (token nunca volta — fica em branco).
  useEffect(() => {
    if (!config) return;
    setDatasetId(config.datasetId);
    setTestEventCode(config.testEventCode ?? '');
    setEnabled(config.enabled);
  }, [config]);

  const save = async () => {
    if (!datasetId.trim()) { toast.error('Informe o ID do conjunto de dados'); return; }
    if (!configured && !token.trim()) { toast.error('Informe o token de acesso'); return; }
    setSaving(true);
    try {
      const payload: UpsertMetaCapi = {
        datasetId: datasetId.trim(),
        testEventCode: testEventCode.trim() || undefined,
        enabled,
      };
      if (token.trim()) payload.token = token.trim();
      await metaCapiService.update(payload);
      setToken('');
      toast.success('Configuração salva');
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const runTest = async () => {
    setTesting(true);
    try {
      await metaCapiService.test();
      toast.success('Evento de teste enviado — confira no Gerenciador de Eventos, em Eventos de teste');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha no evento de teste');
    } finally {
      setTesting(false);
    }
  };

  const remove = async () => {
    const confirmed = await confirm({
      title: 'Remover a configuração da Conversions API?',
      description:
        'O ID do conjunto de dados e o token salvos são apagados e as vendas deixam de ser enviadas à Meta. Para voltar, será preciso colar o token de novo.',
      confirmLabel: 'Remover',
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await metaCapiService.remove();
      setDatasetId(''); setToken(''); setTestEventCode(''); setEnabled(false);
      toast.success('Configuração removida');
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao remover');
    }
  };

  return (
    <div>
      <SettingsPageHeader
        title="Meta Conversions API"
        description={
          <span className="block max-w-prose">
            Envia o evento <span className="font-medium text-foreground">Purchase</span> para a Meta quando um lead fecha em{' '}
            <span className="font-medium text-foreground">Ganho</span>, atribuindo a venda ao anúncio de Clique para WhatsApp. O{' '}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">ctwa_clid</code> é capturado automaticamente na
            1ª mensagem do lead.
          </span>
        }
      />

      {isLoading ? (
        <div className="mt-6 h-64 animate-pulse rounded-xl bg-muted" />
      ) : (
        <div className="mt-6 space-y-4">
          {/* Kill switch */}
          <section className="rounded-xl border border-border bg-card p-5 shadow-soft">
            <label className="flex cursor-pointer items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-foreground">Integração ativa</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Quando desligada, nada é enviado à Meta (os cliques continuam sendo capturados).
                </p>
              </div>
              <Toggle checked={enabled} onChange={setEnabled} label="Integração ativa" />
            </label>
          </section>

          {/* Credenciais */}
          <section className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-soft">
            <Field label="ID do conjunto de dados (Pixel)" hint="No Gerenciador de Eventos: sua fonte de dados → Configurações.">
              <input value={datasetId} onChange={(e) => setDatasetId(e.target.value)} className={`${controlCls} w-full`} placeholder="1234567890" />
            </Field>
            <Field
              label={configured ? 'Token de acesso (deixe em branco para manter)' : 'Token de acesso'}
              hint="Token de usuário do sistema com a permissão ads_management (Business Manager) — não é o token do WhatsApp."
            >
              <input type="password" value={token} onChange={(e) => setToken(e.target.value)} className={`${controlCls} w-full`} placeholder="EAAG…" />
              {configured && config?.tokenPreview && (
                <span className="mt-1 block text-xs text-muted-foreground">Atual: <span className="font-mono">{config.tokenPreview}</span></span>
              )}
            </Field>
            <Field label="Código de evento de teste (opcional)" hint="No Gerenciador de Eventos, em Eventos de teste. Use para validar antes de ligar.">
              <input value={testEventCode} onChange={(e) => setTestEventCode(e.target.value)} className={`${controlCls} w-full`} placeholder="TEST12345" />
            </Field>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button onClick={save} disabled={saving}>
                {saving ? 'Salvando…' : 'Salvar'}
              </Button>
              <Button
                variant="outline"
                onClick={runTest}
                disabled={testing || !configured}
                title={!configured ? 'Salve as credenciais primeiro' : undefined}
              >
                <Send aria-hidden="true" className="h-4 w-4" /> {testing ? 'Enviando…' : 'Enviar evento de teste'}
              </Button>
              {configured && (
                <Button variant="ghost" onClick={remove} className="ml-auto text-urgent-ink hover:bg-urgent-wash">
                  <Trash2 aria-hidden="true" className="h-4 w-4" /> Remover
                </Button>
              )}
            </div>
          </section>
        </div>
      )}

      {confirmDialog}
    </div>
  );
}

/** `<label>` envolvendo o controle: o nome fica ligado ao campo sem precisar de id. */
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-foreground">{label}</span>
      {hint && <span className="mb-1.5 block max-w-prose text-xs text-muted-foreground">{hint}</span>}
      {children}
    </label>
  );
}
