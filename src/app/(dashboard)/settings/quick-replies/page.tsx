'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth-store';
import { useQuickReplies } from '@/features/quick-replies/hooks/use-quick-replies';
import {
  apiErrorMessage,
  quickRepliesService,
  type QuickReply,
  type QuickReplyInput,
} from '@/features/quick-replies/services/quick-replies.service';

const EMPTY_FORM: QuickReplyInput = { shortcut: '', title: '', content: '' };
const CONTENT_MAX = 4096;

const inputCls =
  'w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary';

function useCanManage(): boolean {
  return useAuthStore((s) => {
    const role = s.organizations.find((o) => o.id === s.activeOrgId)?.role;
    return role === 'OWNER' || role === 'ADMIN';
  });
}

export default function SettingsQuickRepliesPage() {
  const queryClient = useQueryClient();
  const canManage = useCanManage();
  const { data: replies = [], isLoading, isError } = useQuickReplies();
  // null = formulário fechado; '' = criando; id = editando.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<QuickReplyInput>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['quick-replies'] });

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditingId('');
  };

  const openEdit = (r: QuickReply) => {
    setForm({ shortcut: r.shortcut, title: r.title, content: r.content });
    setEditingId(r.id);
  };

  const handleSave = async () => {
    const payload: QuickReplyInput = {
      shortcut: form.shortcut.trim(),
      title: form.title.trim(),
      content: form.content.trim(),
    };
    if (!payload.shortcut || !payload.title || !payload.content) {
      toast.error('Preencha atalho, título e mensagem');
      return;
    }
    setIsSaving(true);
    try {
      if (editingId) await quickRepliesService.update(editingId, payload);
      else await quickRepliesService.create(payload);
      toast.success(editingId ? 'Mensagem rápida atualizada' : 'Mensagem rápida criada');
      setEditingId(null);
      refresh();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Não foi possível salvar'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (r: QuickReply) => {
    if (!confirm(`Apagar a mensagem rápida /${r.shortcut}?`)) return;
    try {
      await quickRepliesService.remove(r.id);
      toast.success('Mensagem rápida apagada');
      refresh();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Não foi possível apagar'));
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Mensagens rápidas</h2>
          <p className="mt-0.5 text-sm text-zinc-500">
            Textos prontos da equipe. Na conversa, digite <kbd className="rounded bg-zinc-100 px-1 font-mono dark:bg-zinc-800">/</kbd> para
            buscar e inserir.
          </p>
        </div>
        {canManage && editingId === null && (
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> Nova mensagem
          </button>
        )}
      </div>

      {editingId !== null && (
        <div className="mt-6 space-y-3 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="grid gap-3 sm:grid-cols-[200px_1fr]">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-zinc-500">Atalho</span>
              <div className="flex items-center">
                <span className="mr-1 font-mono text-zinc-400">/</span>
                <input
                  value={form.shortcut}
                  onChange={(e) => setForm({ ...form, shortcut: e.target.value.replace(/^\/+/, '').toLowerCase() })}
                  placeholder="pix"
                  maxLength={32}
                  className={`${inputCls} font-mono`}
                />
              </div>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-zinc-500">Título</span>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Chave Pix da empresa"
                maxLength={80}
                className={inputCls}
              />
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-zinc-500">Mensagem</span>
            <textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              rows={6}
              maxLength={CONTENT_MAX}
              placeholder="Oi {{primeiro_nome}}! Segue nossa chave Pix: ..."
              className={inputCls}
            />
            <span className="mt-1 block text-[11px] text-zinc-400">
              Variáveis: <code>{'{{nome}}'}</code> e <code>{'{{primeiro_nome}}'}</code> viram o nome do cliente.
            </span>
          </label>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditingId(null)}
              className="rounded-md px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isSaving ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </div>
      )}

      <div className="mt-6 space-y-2">
        {isLoading && <p className="text-sm text-zinc-500">Carregando…</p>}
        {isError && <p className="text-sm text-red-600">Não foi possível carregar as mensagens rápidas.</p>}
        {!isLoading && !isError && replies.length === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
            <Zap className="h-6 w-6 text-zinc-400" />
            Nenhuma mensagem rápida ainda.
            {!canManage && <span className="text-xs">Peça a um administrador para cadastrar.</span>}
          </div>
        )}
        {replies.map((r) => (
          <div
            key={r.id}
            className="flex items-start justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                <span className="font-mono text-primary">/{r.shortcut}</span> · {r.title}
              </p>
              <p className="mt-1 line-clamp-2 whitespace-pre-line text-xs text-zinc-500">{r.content}</p>
            </div>
            {canManage && (
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => openEdit(r)}
                  className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800"
                  aria-label={`Editar /${r.shortcut}`}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(r)}
                  className="rounded p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                  aria-label={`Apagar /${r.shortcut}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
