'use client';

import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { controlCls } from '@/components/ui/control';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { cn } from '@/lib/utils';
import {
  COMPOSER_SHORTCUT_LIMIT,
  SHORTCUT_ICONS,
  SHORTCUT_LABEL_MAX,
  SHORTCUT_TEXT_MAX,
  addComposerShortcut,
  removeComposerShortcut,
  updateComposerShortcut,
  type ComposerShortcut,
  type ShortcutDraft,
} from '../lib/composer-shortcuts';
import { ComposerShortcutIcon, SHORTCUT_ICON_LABELS } from './composer-shortcut-icon';

interface ComposerShortcutsDialogProps {
  open: boolean;
  onClose: () => void;
  shortcuts: readonly ComposerShortcut[];
  onSave: (next: ComposerShortcut[]) => void;
}

const EMPTY_DRAFT: ShortcutDraft = { label: '', icon: 'message', text: '' };
const NEW_ID = '__new__';

function newShortcutId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Gerencia os atalhos pessoais da barra do compositor: lista, cria, edita e
 * exclui. Tudo fica nas preferências do usuário logado.
 */
export function ComposerShortcutsDialog({ open, onClose, shortcuts, onSave }: ComposerShortcutsDialogProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ShortcutDraft>(EMPTY_DRAFT);
  const [error, setError] = useState<string | null>(null);
  const { confirm, confirmDialog } = useConfirm();

  const isFull = shortcuts.length >= COMPOSER_SHORTCUT_LIMIT;

  const startEdit = (shortcut?: ComposerShortcut) => {
    setEditingId(shortcut?.id ?? NEW_ID);
    setDraft(shortcut ? { label: shortcut.label, icon: shortcut.icon, text: shortcut.text } : EMPTY_DRAFT);
    setError(null);
  };

  const stopEdit = () => {
    setEditingId(null);
    setError(null);
  };

  const handleClose = () => {
    stopEdit();
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result =
      editingId === NEW_ID
        ? addComposerShortcut(shortcuts, draft, newShortcutId())
        : updateComposerShortcut(shortcuts, editingId ?? '', draft);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onSave(result.shortcuts);
    stopEdit();
  };

  const handleDelete = async (shortcut: ComposerShortcut) => {
    const ok = await confirm({
      title: `Excluir o atalho "${shortcut.label}"?`,
      description: 'Ele some da sua barra. Os atalhos dos outros não mudam.',
      confirmLabel: 'Excluir',
      destructive: true,
    });
    if (ok) onSave(removeComposerShortcut(shortcuts, shortcut.id));
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        title={editingId ? (editingId === NEW_ID ? 'Novo atalho' : 'Editar atalho') : 'Meus atalhos da barra'}
        description={
          editingId
            ? 'Clicou no atalho, o texto entra no campo para você revisar e enviar.'
            : 'Só você vê estes botões. Cada gestor monta os dele.'
        }
        dismissible={!editingId}
      >
        {editingId ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-foreground">Nome</span>
              <input
                value={draft.label}
                onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                maxLength={SHORTCUT_LABEL_MAX}
                placeholder="Chave Pix, Endereço da loja…"
                autoFocus
                className={`${controlCls} w-full`}
              />
            </label>
            <fieldset>
              <legend className="mb-1 block text-sm font-medium text-foreground">Ícone</legend>
              <div className="flex flex-wrap gap-1.5">
                {SHORTCUT_ICONS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setDraft({ ...draft, icon })}
                    aria-pressed={draft.icon === icon}
                    aria-label={`Ícone ${SHORTCUT_ICON_LABELS[icon]}`}
                    title={SHORTCUT_ICON_LABELS[icon]}
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-xl border transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      draft.icon === icon
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:bg-primary/10 hover:text-primary',
                    )}
                  >
                    <ComposerShortcutIcon icon={icon} className="h-5 w-5" />
                  </button>
                ))}
              </div>
            </fieldset>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-foreground">Texto</span>
              <textarea
                value={draft.text}
                onChange={(e) => setDraft({ ...draft, text: e.target.value })}
                rows={6}
                maxLength={SHORTCUT_TEXT_MAX}
                placeholder="Oi {{primeiro_nome}}! Segue a chave Pix: ..."
                className={`${controlCls} h-auto w-full py-2`}
              />
              <span className="mt-1 block text-[11px] text-muted-foreground">
                <code className="font-mono">{'{{nome}}'}</code> e{' '}
                <code className="font-mono">{'{{primeiro_nome}}'}</code> viram o nome do cliente.
              </span>
            </label>
            {error && (
              <p role="alert" className="rounded-lg bg-urgent-wash px-3 py-2 text-sm text-urgent-ink">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={stopEdit}>
                Voltar
              </Button>
              <Button type="submit">{editingId === NEW_ID ? 'Criar atalho' : 'Salvar'}</Button>
            </div>
          </form>
        ) : (
          <div className="space-y-3">
            {shortcuts.length === 0 ? (
              <p className="rounded-xl bg-muted px-4 py-6 text-center text-sm text-muted-foreground">
                Nenhum atalho ainda. Crie um para ter seus textos a um clique na barra do chat.
              </p>
            ) : (
              <ul className="divide-y divide-border rounded-xl border border-border">
                {shortcuts.map((s) => (
                  <li key={s.id} className="flex items-center gap-3 px-3 py-2.5">
                    <ComposerShortcutIcon icon={s.icon} className="h-5 w-5 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{s.label}</p>
                      <p className="truncate text-xs text-muted-foreground">{s.text}</p>
                    </div>
                    <Button type="button" variant="ghost" size="icon" onClick={() => startEdit(s)} aria-label={`Editar ${s.label}`} title="Editar">
                      <Pencil aria-hidden="true" className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" onClick={() => void handleDelete(s)} aria-label={`Excluir ${s.label}`} title="Excluir">
                      <Trash2 aria-hidden="true" className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">
                {shortcuts.length}/{COMPOSER_SHORTCUT_LIMIT}
              </span>
              <Button type="button" onClick={() => startEdit()} disabled={isFull} title={isFull ? 'Limite atingido' : undefined}>
                <Plus aria-hidden="true" className="h-4 w-4" /> Novo atalho
              </Button>
            </div>
          </div>
        )}
      </Dialog>
      {confirmDialog}
    </>
  );
}
