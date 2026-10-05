'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Pencil, BrainCircuit } from 'lucide-react';
import { toast } from 'sonner';
import { aiProvidersService, type AiProviderKey, type AiCapability, type UpsertAiProviderKey } from '@/features/settings/services/ai-providers.service';
import { useOrgId } from '@/hooks/use-org-query-key';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { controlCls } from '@/components/ui/control';
import { Dialog } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { SettingsPageHeader } from '@/features/settings/components/settings-page-header';

const iconBtnCls =
  'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

const CAP_LABELS: Record<AiCapability, string> = {
  TRANSCRIPTION: 'Transcrição',
  EMBEDDINGS: 'Embeddings',
  AGENT_LLM: 'Agentes (LLM)',
};
const PROVIDER_LABELS: Record<string, string> = { GROQ: 'Groq', OPENAI: 'OpenAI', SAKANA: 'Sakana' };
const ALL_CAPS: AiCapability[] = ['TRANSCRIPTION', 'EMBEDDINGS', 'AGENT_LLM'];
const EMPTY: UpsertAiProviderKey = { name: '', provider: 'GROQ', key: '', capabilities: [] };

export default function AiProvidersPage() {
  const queryClient = useQueryClient();
  const { confirm, confirmDialog } = useConfirm();
  const orgId = useOrgId();
  const { data: keys, isLoading } = useQuery({ queryKey: ['ai-provider-keys', orgId], queryFn: () => aiProvidersService.list() });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['ai-provider-keys'] });

  const [editing, setEditing] = useState<AiProviderKey | null>(null);
  const [form, setForm] = useState<UpsertAiProviderKey | null>(null);

  const openCreate = () => { setEditing(null); setForm({ ...EMPTY }); };
  const openEdit = (k: AiProviderKey) => {
    setEditing(k);
    setForm({ name: k.name, provider: k.provider, key: '', capabilities: k.capabilities, baseUrl: k.baseUrl ?? '', model: k.model ?? '' });
  };
  const close = () => { setForm(null); setEditing(null); };

  const toggleCap = (c: AiCapability) => setForm((f) => f ? { ...f, capabilities: f.capabilities.includes(c) ? f.capabilities.filter((x) => x !== c) : [...f.capabilities, c] } : f);

  const save = async () => {
    if (!form) return;
    if (!form.name.trim()) { toast.error('Informe um nome'); return; }
    if (!editing && !form.key?.trim()) { toast.error('Informe a chave'); return; }
    try {
      if (editing) {
        const payload: Partial<UpsertAiProviderKey> = { name: form.name, provider: form.provider, capabilities: form.capabilities, baseUrl: form.baseUrl || undefined, model: form.model || undefined };
        if (form.key?.trim()) payload.key = form.key.trim();
        await aiProvidersService.update(editing.id, payload);
      } else {
        await aiProvidersService.create({ ...form, key: form.key!.trim(), baseUrl: form.baseUrl || undefined, model: form.model || undefined });
      }
      toast.success('Chave salva'); refresh(); close();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar');
    }
  };

  const remove = async (k: AiProviderKey) => {
    const confirmed = await confirm({
      title: `Excluir a chave "${k.name}"?`,
      description:
        'As funções marcadas nela deixam de usar esta chave. Ela não pode ser recuperada depois: para voltar, será preciso colar a chave de novo.',
      confirmLabel: 'Excluir',
      destructive: true,
    });
    if (!confirmed) return;
    try { await aiProvidersService.remove(k.id); toast.success('Chave excluída'); refresh(); }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Erro ao remover'); }
  };

  return (
    <div>
      <SettingsPageHeader
        title="Provedores de IA"
        description="Cadastre suas chaves e escolha o que cada uma faz. As chaves ficam criptografadas e não são exibidas de novo."
        action={
          <Button onClick={openCreate}>
            <Plus aria-hidden="true" className="h-4 w-4" /> Adicionar chave
          </Button>
        }
      />

      <div className="mt-6 rounded-xl border border-border bg-card shadow-soft">
        {isLoading ? (
          <div className="divide-y divide-border">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="px-5 py-4">
                <div className="h-4 w-48 animate-pulse rounded bg-muted" />
                <div className="mt-2 h-3 w-32 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : !keys?.length ? (
          <EmptyState
            size="sm"
            icon={BrainCircuit}
            title="Nenhuma chave cadastrada"
            description="Adicione uma chave para usar transcrição, embeddings ou agentes com o seu provedor."
            action={
              <Button variant="outline" size="sm" onClick={openCreate}>
                <Plus aria-hidden="true" className="h-3.5 w-3.5" /> Adicionar chave
              </Button>
            }
          />
        ) : (
          <ul className="divide-y divide-border">
            {keys.map((k) => (
              <li key={k.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{k.name}</span>
                    <Badge>{PROVIDER_LABELS[k.provider] ?? k.provider}</Badge>
                    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">{k.keyPreview}</code>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {k.capabilities.length ? (
                      k.capabilities.map((c) => (
                        <Badge key={c} variant="brand">
                          {CAP_LABELS[c]}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">Nenhuma função selecionada</span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(k)}
                    className={`${iconBtnCls} hover:bg-muted hover:text-foreground`}
                    title="Editar"
                    aria-label={`Editar a chave ${k.name}`}
                  >
                    <Pencil aria-hidden="true" className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(k)}
                    className={`${iconBtnCls} hover:bg-urgent-wash hover:text-urgent-ink`}
                    title="Excluir"
                    aria-label={`Excluir a chave ${k.name}`}
                  >
                    <Trash2 aria-hidden="true" className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Fechar perde o que foi digitado (inclusive a chave colada). */}
      <Dialog
        open={!!form}
        onClose={close}
        title={editing ? 'Editar chave' : 'Nova chave'}
        size="lg"
        dismissible={false}
        footer={
          <>
            <Button variant="outline" onClick={close}>
              Cancelar
            </Button>
            <Button onClick={save}>Salvar</Button>
          </>
        }
      >
        {form && (
          <div className="space-y-4">
            <Field label="Nome">
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={`${controlCls} w-full`}
                placeholder="Groq produção"
              />
            </Field>
            <Field label="Provedor">
              <select
                value={form.provider}
                onChange={(e) => setForm({ ...form, provider: e.target.value as UpsertAiProviderKey['provider'] })}
                className={`${controlCls} w-full`}
              >
                <option value="GROQ">Groq</option>
                <option value="OPENAI">OpenAI</option>
                <option value="SAKANA">Sakana</option>
              </select>
            </Field>
            <Field label={editing ? 'Chave (deixe em branco para manter)' : 'Chave'}>
              <input
                type="password"
                value={form.key ?? ''}
                onChange={(e) => setForm({ ...form, key: e.target.value })}
                className={`${controlCls} w-full font-mono`}
                placeholder="gsk_… / sk-…"
              />
            </Field>
            <fieldset>
              <legend className="mb-1 block text-sm font-medium text-foreground">Funções</legend>
              <div className="flex flex-wrap gap-2">
                {ALL_CAPS.map((c) => (
                  <label
                    key={c}
                    className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-border px-3 text-sm text-foreground hover:bg-muted"
                  >
                    <input
                      type="checkbox"
                      checked={form.capabilities.includes(c)}
                      onChange={() => toggleCap(c)}
                      className="h-4 w-4 rounded border-input"
                    />
                    {CAP_LABELS[c]}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="URL base (opcional)">
                <input
                  value={form.baseUrl ?? ''}
                  onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
                  className={`${controlCls} w-full`}
                />
              </Field>
              <Field label="Modelo (opcional)">
                <input
                  value={form.model ?? ''}
                  onChange={(e) => setForm({ ...form, model: e.target.value })}
                  className={`${controlCls} w-full`}
                />
              </Field>
            </div>
          </div>
        )}
      </Dialog>

      {confirmDialog}
    </div>
  );
}

/** `<label>` envolvendo o controle: o nome fica ligado ao campo sem precisar de id. */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}
