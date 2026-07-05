'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Pencil, BrainCircuit, X } from 'lucide-react';
import { toast } from 'sonner';
import { aiProvidersService, type AiProviderKey, type AiCapability, type UpsertAiProviderKey } from '@/features/settings/services/ai-providers.service';
import { useOrgId } from '@/hooks/use-org-query-key';

const CAP_LABELS: Record<AiCapability, string> = {
  TRANSCRIPTION: 'Transcrição',
  EMBEDDINGS: 'Embeddings',
  AGENT_LLM: 'LLM',
};
const ALL_CAPS: AiCapability[] = ['TRANSCRIPTION', 'EMBEDDINGS', 'AGENT_LLM'];
const EMPTY: UpsertAiProviderKey = { name: '', provider: 'GROQ', key: '', capabilities: [] };

export default function AiProvidersPage() {
  const queryClient = useQueryClient();
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
    if (!confirm(`Remover a chave "${k.name}"?`)) return;
    try { await aiProvidersService.remove(k.id); toast.success('Removida'); refresh(); }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Erro ao remover'); }
  };

  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Provedores de IA</h2>
          <p className="mt-0.5 text-sm text-zinc-500">Cadastre suas chaves e escolha o que cada uma faz. As chaves ficam criptografadas e não são exibidas de novo.</p>
        </div>
        <button onClick={openCreate} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" /> Adicionar chave
        </button>
      </div>

      <div className="mt-6 space-y-2">
        {isLoading ? (
          Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-lg border bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900" />)
        ) : !keys?.length ? (
          <div className="flex flex-col items-center py-12 text-center">
            <BrainCircuit className="h-10 w-10 text-zinc-200 dark:text-zinc-700" />
            <p className="mt-3 text-sm text-zinc-500">Nenhuma chave cadastrada</p>
          </div>
        ) : keys.map((k) => (
          <div key={k.id} className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{k.name}</span>
                <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-zinc-500 dark:bg-zinc-800">{k.provider}</span>
                <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">{k.keyPreview}</code>
              </div>
              <div className="mt-1 flex flex-wrap gap-1">
                {k.capabilities.length ? k.capabilities.map((c) => (
                  <span key={c} className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">{CAP_LABELS[c]}</span>
                )) : <span className="text-xs text-zinc-400">Nenhuma função selecionada</span>}
              </div>
            </div>
            <div className="ml-3 flex items-center gap-1">
              <button onClick={() => openEdit(k)} className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800" title="Editar"><Pencil className="h-3.5 w-3.5" /></button>
              <button onClick={() => remove(k)} className="rounded p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20" title="Remover"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          </div>
        ))}
      </div>

      {form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-lg border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{editing ? 'Editar chave' : 'Nova chave'}</h3>
              <button onClick={close} className="rounded p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-4 px-5 py-4">
              <Field label="Nome"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} placeholder="Groq produção" /></Field>
              <Field label="Provedor">
                <select value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value as UpsertAiProviderKey['provider'] })} className={inputCls}>
                  <option value="GROQ">Groq</option><option value="OPENAI">OpenAI</option><option value="SAKANA">Sakana</option>
                </select>
              </Field>
              <Field label={editing ? 'Chave (deixe em branco para manter)' : 'Chave'}>
                <input type="password" value={form.key ?? ''} onChange={(e) => setForm({ ...form, key: e.target.value })} className={inputCls} placeholder="gsk_… / sk-…" />
              </Field>
              <Field label="Funções">
                <div className="flex flex-wrap gap-2">
                  {ALL_CAPS.map((c) => (
                    <label key={c} className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 px-2.5 py-1.5 text-sm dark:border-zinc-700">
                      <input type="checkbox" checked={form.capabilities.includes(c)} onChange={() => toggleCap(c)} />
                      {CAP_LABELS[c]}
                    </label>
                  ))}
                </div>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Base URL (opcional)"><input value={form.baseUrl ?? ''} onChange={(e) => setForm({ ...form, baseUrl: e.target.value })} className={inputCls} /></Field>
                <Field label="Modelo (opcional)"><input value={form.model ?? ''} onChange={(e) => setForm({ ...form, model: e.target.value })} className={inputCls} /></Field>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-zinc-200 px-5 py-3 dark:border-zinc-800">
              <button onClick={close} className="rounded-md px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800">Cancelar</button>
              <button onClick={save} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputCls = 'w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100';
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (<div><label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">{label}</label>{children}</div>);
}
