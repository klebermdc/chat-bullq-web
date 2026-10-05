'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth-store';
import { useQuickReplies } from '@/features/quick-replies/hooks/use-quick-replies';
import {
  quickRepliesService,
  type QuickReply,
  type QuickReplyInput,
} from '@/features/quick-replies/services/quick-replies.service';
import { getErrorMessage } from '@/lib/errors';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { controlCls } from '@/components/ui/control';
import { EmptyState, LoadingState } from '@/components/ui/empty-state';
import { SettingsPageHeader } from '@/features/settings/components/settings-page-header';

const EMPTY_FORM: QuickReplyInput = { shortcut: '', title: '', content: '' };
const CONTENT_MAX = 4096;

const iconBtnCls =
  'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

function useCanManage(): boolean {
  return useAuthStore((s) => {
    const role = s.organizations.find((o) => o.id === s.activeOrgId)?.role;
    return role === 'OWNER' || role === 'ADMIN';
  });
}

export default function SettingsQuickRepliesPage() {
  const queryClient = useQueryClient();
  const { confirm, confirmDialog } = useConfirm();
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
      toast.error(getErrorMessage(err, 'Não foi possível salvar'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (r: QuickReply) => {
    const confirmed = await confirm({
      title: `Excluir a mensagem rápida /${r.shortcut}?`,
      description: `"${r.title}" some da lista de toda a equipe e o atalho /${r.shortcut} para de funcionar. Não dá para desfazer.`,
      confirmLabel: 'Excluir',
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await quickRepliesService.remove(r.id);
      toast.success('Mensagem rápida excluída');
      refresh();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Não foi possível excluir'));
    }
  };

  return (
    <div>
      <SettingsPageHeader
        title="Mensagens rápidas"
        description={
          <>
            Textos prontos da equipe. Na conversa, digite{' '}
            <kbd className="rounded bg-muted px-1 font-mono text-foreground">/</kbd> para buscar e inserir.
          </>
        }
        action={
          canManage && editingId === null ? (
            <Button type="button" onClick={openCreate}>
              <Plus aria-hidden="true" className="h-4 w-4" /> Nova mensagem
            </Button>
          ) : undefined
        }
      />

      {editingId !== null && (
        <div className="mt-6 space-y-3 rounded-xl border border-border bg-card p-5 shadow-soft">
          <h3 className="text-sm font-medium text-foreground">
            {editingId ? 'Editar mensagem rápida' : 'Nova mensagem rápida'}
          </h3>
          <div className="grid gap-3 sm:grid-cols-[200px_1fr]">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-foreground">Atalho</span>
              <div className="flex items-center">
                <span aria-hidden="true" className="mr-1.5 font-mono text-muted-foreground">/</span>
                <input
                  value={form.shortcut}
                  onChange={(e) => setForm({ ...form, shortcut: e.target.value.replace(/^\/+/, '').toLowerCase() })}
                  placeholder="pix"
                  maxLength={32}
                  className={`${controlCls} w-full font-mono`}
                />
              </div>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-foreground">Título</span>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Chave Pix da empresa"
                maxLength={80}
                className={`${controlCls} w-full`}
              />
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-foreground">Mensagem</span>
            <textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              rows={6}
              maxLength={CONTENT_MAX}
              placeholder="Oi {{primeiro_nome}}! Segue nossa chave Pix: ..."
              className={`${controlCls} h-auto w-full py-2`}
            />
            <span className="mt-1 block text-[11px] text-muted-foreground">
              Variáveis: <code className="font-mono">{'{{nome}}'}</code> e{' '}
              <code className="font-mono">{'{{primeiro_nome}}'}</code> viram o nome do cliente.
            </span>
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setEditingId(null)}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Salvando…' : 'Salvar'}
            </Button>
          </div>
        </div>
      )}

      <div className="mt-6 rounded-xl border border-border bg-card shadow-soft">
        {isLoading && <LoadingState />}
        {isError && (
          <p role="alert" className="m-4 rounded-lg bg-urgent-wash px-3 py-2 text-sm text-urgent-ink">
            Não foi possível carregar as mensagens rápidas.
          </p>
        )}
        {!isLoading && !isError && replies.length === 0 && (
          <EmptyState
            size="sm"
            icon={Zap}
            title="Nenhuma mensagem rápida ainda"
            description={
              canManage
                ? 'Cadastre os textos que a equipe mais repete, como chave Pix e endereço.'
                : 'Peça a um administrador para cadastrar.'
            }
            action={
              canManage && editingId === null ? (
                <Button type="button" variant="outline" size="sm" onClick={openCreate}>
                  <Plus aria-hidden="true" className="h-3.5 w-3.5" /> Nova mensagem
                </Button>
              ) : undefined
            }
          />
        )}
        {replies.length > 0 && (
          <ul className="divide-y divide-border">
            {replies.map((r) => (
              <li key={r.id} className="flex items-start justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    <span className="font-mono text-primary">/{r.shortcut}</span> · {r.title}
                  </p>
                  <p className="mt-1 line-clamp-2 whitespace-pre-line text-xs text-muted-foreground">{r.content}</p>
                </div>
                {canManage && (
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(r)}
                      className={`${iconBtnCls} hover:bg-muted hover:text-foreground`}
                      aria-label={`Editar /${r.shortcut}`}
                      title="Editar"
                    >
                      <Pencil aria-hidden="true" className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(r)}
                      className={`${iconBtnCls} hover:bg-urgent-wash hover:text-urgent-ink`}
                      aria-label={`Excluir /${r.shortcut}`}
                      title="Excluir"
                    >
                      <Trash2 aria-hidden="true" className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {confirmDialog}
    </div>
  );
}
