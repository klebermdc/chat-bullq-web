'use client';

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Share2, Send, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { metaCapiService, type UpsertMetaCapi } from '@/features/settings/services/meta-capi.service';
import { useOrgId } from '@/hooks/use-org-query-key';

export default function MetaCapiPage() {
  const queryClient = useQueryClient();
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
    if (!datasetId.trim()) { toast.error('Informe o Dataset ID'); return; }
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
      toast.success('Evento de teste enviado — confira no Events Manager → Test Events');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha no evento de teste');
    } finally {
      setTesting(false);
    }
  };

  const remove = async () => {
    if (!confirm('Remover a configuração da Conversions API?')) return;
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
      <div className="flex items-start gap-2">
        <Share2 className="mt-1 h-5 w-5 text-primary" />
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Meta Conversions API</h2>
          <p className="mt-0.5 text-sm text-zinc-500">
            Envia o evento <span className="font-medium">Purchase</span> para a Meta quando um lead fecha em
            {' '}<span className="font-medium">Ganho</span>, atribuindo a venda ao anúncio de Clique para WhatsApp.
            O <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-xs dark:bg-zinc-800">ctwa_clid</code>
            {' '}é capturado automaticamente na 1ª mensagem do lead.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-6 h-64 animate-pulse rounded-xl border bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900" />
      ) : (
        <div className="mt-6 space-y-5">
          {/* Kill switch */}
          <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <label className="flex cursor-pointer items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Integração ativa</p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  Quando desligada, nada é enviado à Meta (os cliques continuam sendo capturados).
                </p>
              </div>
              <Toggle checked={enabled} onChange={setEnabled} />
            </label>
          </section>

          {/* Credenciais */}
          <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <Field label="Dataset ID (Pixel)" hint="Events Manager → sua fonte de dados → Configurações">
              <input value={datasetId} onChange={(e) => setDatasetId(e.target.value)} className={inputCls} placeholder="1234567890" />
            </Field>
            <Field
              label={configured ? 'Token de acesso (deixe em branco para manter)' : 'Token de acesso'}
              hint="System User token com ads_management (Business Manager) — não é o token do WhatsApp."
            >
              <input type="password" value={token} onChange={(e) => setToken(e.target.value)} className={inputCls} placeholder="EAAG…" />
              {configured && config?.tokenPreview && (
                <p className="mt-1 font-mono text-xs text-zinc-400">atual: {config.tokenPreview}</p>
              )}
            </Field>
            <Field label="Test Event Code (opcional)" hint="Events Manager → Test Events. Use para validar antes de ligar.">
              <input value={testEventCode} onChange={(e) => setTestEventCode(e.target.value)} className={inputCls} placeholder="TEST12345" />
            </Field>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                onClick={save}
                disabled={saving}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                {saving ? 'Salvando…' : 'Salvar'}
              </button>
              <button
                onClick={runTest}
                disabled={testing || !configured}
                title={!configured ? 'Salve as credenciais primeiro' : undefined}
                className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                <Send className="h-4 w-4" /> {testing ? 'Enviando…' : 'Enviar evento de teste'}
              </button>
              {configured && (
                <button
                  onClick={remove}
                  className="ml-auto inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="h-4 w-4" /> Remover
                </button>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

const inputCls = 'w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100';

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">{label}</label>
      {hint && <p className="mb-1.5 text-xs text-zinc-400">{hint}</p>}
      {children}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      type="button"
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
        checked ? 'bg-primary' : 'bg-zinc-300 dark:bg-zinc-700'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}
