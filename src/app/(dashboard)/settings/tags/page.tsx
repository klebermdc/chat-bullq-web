'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Plus, Trash2, Pencil, Tags as TagsIcon } from 'lucide-react';
import { toast } from 'sonner';
import { tagsService, type Tag } from '@/features/settings/services/tags.service';
import { useOrgId } from '@/hooks/use-org-query-key';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { controlCls } from '@/components/ui/control';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';
import {
  SettingsPageHeader,
  settingsCardCls,
  settingsCardTitleCls,
} from '@/features/settings/components/settings-page-header';

const PRESET_COLORS: Array<{ hex: string; name: string }> = [
  { hex: '#ef4444', name: 'Vermelho' },
  { hex: '#f97316', name: 'Laranja' },
  { hex: '#f59e0b', name: 'Âmbar' },
  { hex: '#22c55e', name: 'Verde' },
  { hex: '#10b981', name: 'Esmeralda' },
  { hex: '#3b82f6', name: 'Azul' },
  { hex: '#6366f1', name: 'Índigo' },
  { hex: '#8b5cf6', name: 'Violeta' },
  { hex: '#ec4899', name: 'Rosa' },
  { hex: '#6b7280', name: 'Cinza' },
];

const iconBtnCls =
  'flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export default function SettingsTagsPage() {
  const queryClient = useQueryClient();
  const { confirm, confirmDialog } = useConfirm();
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#3b82f6');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  const orgId = useOrgId();
  const { data: tags, isLoading } = useQuery({
    queryKey: ['tags', orgId],
    queryFn: () => tagsService.list(),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['tags'] });

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      await tagsService.create({ name: newName.trim(), color: newColor });
      setNewName('');
      toast.success('Tag criada');
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar tag');
    }
  };

  const handleUpdate = async (id: string) => {
    try {
      await tagsService.update(id, { name: editName, color: editColor });
      setEditingId(null);
      toast.success('Tag atualizada');
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar');
    }
  };

  const handleDelete = async (id: string) => {
    const tagName = tags?.find((t) => t.id === id)?.name;
    const confirmed = await confirm({
      title: tagName ? `Excluir a tag "${tagName}"?` : 'Excluir esta tag?',
      description: 'A tag sai de todas as conversas e contatos em que está aplicada. Não dá para desfazer.',
      confirmLabel: 'Excluir',
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await tagsService.remove(id);
      toast.success('Tag removida');
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao remover');
    }
  };

  const startEdit = (tag: Tag) => {
    setEditingId(tag.id);
    setEditName(tag.name);
    setEditColor(tag.color);
  };

  return (
    <div>
      <SettingsPageHeader title="Tags" description="Organize conversas e contatos com tags coloridas." />

      <section className={`mt-6 ${settingsCardCls}`}>
        <h3 className={settingsCardTitleCls}>Nova tag</h3>
        <div className="mt-3 flex flex-wrap items-end gap-x-4 gap-y-3">
          <div className="min-w-[200px] flex-1">
            <label htmlFor="new-tag-name" className="mb-1 block text-sm font-medium text-foreground">
              Nome da tag
            </label>
            <input
              id="new-tag-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="Ex.: VIP, Urgente, Lead…"
              className={`${controlCls} w-full`}
            />
          </div>
          <div>
            <p id="new-tag-color" className="mb-1 block text-sm font-medium text-foreground">Cor</p>
            {/* Mesma altura do campo de nome (h-9): os dois rótulos ficam na mesma linha. */}
            <div className="flex min-h-9 items-center">
              <ColorSwatches labelledBy="new-tag-color" value={newColor} onChange={setNewColor} />
            </div>
          </div>
          <Button onClick={handleCreate} disabled={!newName.trim()}>
            <Plus aria-hidden="true" className="h-4 w-4" /> Criar
          </Button>
        </div>
      </section>

      <div className="mt-4 rounded-xl border border-border bg-card shadow-soft">
        {isLoading ? (
          <div className="divide-y divide-border">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="px-5 py-3">
                <div className="h-5 w-40 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : !tags?.length ? (
          <EmptyState
            size="sm"
            icon={TagsIcon}
            title="Nenhuma tag criada"
            description="Crie a primeira no formulário acima para começar a organizar conversas e contatos."
          />
        ) : (
          <ul className="divide-y divide-border">
            {tags.map((tag) => (
              <li key={tag.id} className="flex items-center justify-between gap-3 px-5 py-2.5">
                {editingId === tag.id ? (
                  <div className="flex flex-1 flex-wrap items-center gap-3">
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      aria-label="Nome da tag"
                      className={`${controlCls} min-w-[160px] flex-1`}
                    />
                    <ColorSwatches label="Cor da tag" value={editColor} onChange={setEditColor} />
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setEditingId(null)}>
                        Cancelar
                      </Button>
                      <Button size="sm" onClick={() => handleUpdate(tag.id)}>
                        Salvar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        aria-hidden="true"
                        className="h-4 w-4 shrink-0 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span className="truncate text-sm font-medium text-foreground">{tag.name}</span>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={() => startEdit(tag)}
                        aria-label={`Editar a tag ${tag.name}`}
                        title="Editar"
                        className={`${iconBtnCls} hover:bg-muted hover:text-foreground`}
                      >
                        <Pencil aria-hidden="true" className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(tag.id)}
                        aria-label={`Excluir a tag ${tag.name}`}
                        title="Excluir"
                        className={`${iconBtnCls} hover:bg-urgent-wash hover:text-urgent-ink`}
                      >
                        <Trash2 aria-hidden="true" className="h-4 w-4" />
                      </button>
                    </div>
                  </>
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

/**
 * Paleta de cores da tag. A cor escolhida ganha anel de contraste e um "check"
 * dentro, para não depender só de um contorno cinza.
 */
function ColorSwatches({
  value,
  onChange,
  label,
  labelledBy,
}: {
  value: string;
  onChange: (color: string) => void;
  label?: string;
  labelledBy?: string;
}) {
  return (
    <div role="group" aria-label={label} aria-labelledby={labelledBy} className="flex flex-wrap gap-2">
      {PRESET_COLORS.map((c) => {
        const selected = value === c.hex;
        return (
          <button
            key={c.hex}
            type="button"
            onClick={() => onChange(c.hex)}
            aria-label={c.name}
            aria-pressed={selected}
            title={c.name}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-lg transition-transform',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              selected ? 'ring-2 ring-foreground ring-offset-2 ring-offset-background' : 'hover:scale-105',
            )}
            style={{ backgroundColor: c.hex }}
          >
            {selected && <Check aria-hidden="true" className="h-4 w-4 text-white" strokeWidth={3} />}
          </button>
        );
      })}
    </div>
  );
}
