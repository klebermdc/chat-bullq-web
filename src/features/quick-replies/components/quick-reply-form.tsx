'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { controlCls } from '@/components/ui/control';
import { getErrorMessage } from '@/lib/errors';
import { quickRepliesService, type QuickReply, type QuickReplyInput } from '../services/quick-replies.service';

const SHORTCUT_MAX = 32;
const TITLE_MAX = 80;
const CATEGORY_MAX = 60;
const CONTENT_MAX = 4096;
const CATEGORY_LIST_ID = 'quick-reply-form-categories';

type Props = {
  /** Ausente = criando. */
  reply?: QuickReply;
  categories: string[];
  /** Dono/admin escolhem entre "só eu" e "toda a equipe"; atendente cria sempre só para si. */
  isManager: boolean;
  currentUserId: string | null;
  onSaved: (saved: QuickReply) => void;
  onCancel: () => void;
};

function initialForm(reply: QuickReply | undefined, currentUserId: string | null): QuickReplyInput {
  if (reply) {
    return {
      shortcut: reply.shortcut,
      title: reply.title,
      content: reply.content,
      category: reply.category,
      ownerUserId: reply.ownerUserId,
    };
  }
  return { shortcut: '', title: '', content: '', category: null, ownerUserId: currentUserId };
}

/** Criar/editar mensagem rápida de dentro da janela ⚡ do atendimento. */
export function QuickReplyForm({ reply, categories, isManager, currentUserId, onSaved, onCancel }: Props) {
  const [form, setForm] = useState<QuickReplyInput>(() => initialForm(reply, currentUserId));
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const isEditing = !!reply;
  // Mensagem de outro vendedor (só dono/admin chega aqui): o dono fica como está.
  const isOtherSellers = isEditing && !!reply.ownerUserId && reply.ownerUserId !== currentUserId;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: QuickReplyInput = {
      shortcut: form.shortcut.trim(),
      title: form.title.trim(),
      content: form.content.trim(),
      category: form.category?.trim() || null,
      ownerUserId: form.ownerUserId,
    };
    if (!payload.shortcut || !payload.title || !payload.content) {
      setError('Preencha atalho, título e mensagem.');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const saved = isEditing
        ? await quickRepliesService.update(reply.id, isManager ? payload : { ...payload, ownerUserId: undefined })
        : await quickRepliesService.create(payload);
      onSaved(saved);
    } catch (err) {
      setError(getErrorMessage(err, 'Não foi possível salvar a mensagem.'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
        <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-foreground">Atalho</span>
            <div className="flex items-center">
              <span aria-hidden="true" className="mr-1.5 font-mono text-muted-foreground">/</span>
              <input
                autoFocus
                value={form.shortcut}
                onChange={(e) => setForm({ ...form, shortcut: e.target.value.replace(/^\/+/, '').toLowerCase() })}
                placeholder="meu-pix"
                maxLength={SHORTCUT_MAX}
                className={`${controlCls} w-full font-mono`}
              />
            </div>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-foreground">Título</span>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Minha chave Pix"
              maxLength={TITLE_MAX}
              className={`${controlCls} w-full`}
            />
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-foreground">Categoria</span>
            <input
              value={form.category ?? ''}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              placeholder="Disney, Seguro viagem…"
              maxLength={CATEGORY_MAX}
              list={CATEGORY_LIST_ID}
              className={`${controlCls} w-full`}
            />
            <datalist id={CATEGORY_LIST_ID}>
              {categories.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </label>
          <div>
            <span className="mb-1 block text-sm font-medium text-foreground">Visível para</span>
            {isManager && !isOtherSellers ? (
              <select
                value={form.ownerUserId ? 'me' : 'team'}
                onChange={(e) => setForm({ ...form, ownerUserId: e.target.value === 'me' ? currentUserId : null })}
                className={`${controlCls} w-full`}
              >
                <option value="me">Só eu</option>
                <option value="team">Toda a equipe</option>
              </select>
            ) : (
              <p className="flex h-9 items-center text-sm text-muted-foreground">
                {isOtherSellers ? `Só ${reply.owner?.name ?? 'o vendedor'}` : 'Só você'}
              </p>
            )}
          </div>
        </div>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-foreground">Mensagem</span>
          <textarea
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            rows={7}
            maxLength={CONTENT_MAX}
            placeholder="Oi {{primeiro_nome}}! Segue minha chave Pix: ..."
            className={`${controlCls} h-auto w-full py-2`}
          />
          <span className="mt-1 block text-[11px] text-muted-foreground">
            <code className="font-mono">{'{{nome}}'}</code> e <code className="font-mono">{'{{primeiro_nome}}'}</code>{' '}
            viram o nome do cliente.
          </span>
        </label>
        {error && (
          <p role="alert" className="rounded-lg bg-urgent-wash px-3 py-2 text-sm text-urgent-ink">
            {error}
          </p>
        )}
      </div>
      <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" loading={isSaving}>
          {isEditing ? 'Salvar' : 'Criar mensagem'}
        </Button>
      </div>
    </form>
  );
}
