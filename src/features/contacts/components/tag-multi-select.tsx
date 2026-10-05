'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, Plus, Loader2, Tag as TagIcon, X } from 'lucide-react';
import { tagsService } from '@/features/settings/services/tags.service';
import { controlSmCls } from '@/components/ui/control';

interface TagMultiSelectProps {
  /** Selected tag ids. */
  value: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}

const PALETTE = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#64748b'];

/**
 * Chip-based multi-select over the org's tags, with inline tag creation.
 * Toggles ids in/out of `value` and returns just the ids — the caller attaches
 * them to the contact (via tagsService.addToContact) after creating it. A
 * freshly created tag is auto-selected.
 */
export function TagMultiSelect({ value, onChange, disabled }: TagMultiSelectProps) {
  const queryClient = useQueryClient();
  const { data: tags = [], isLoading } = useQuery({
    queryKey: ['tags'],
    queryFn: () => tagsService.list(),
  });

  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(PALETTE[4]);
  const [creating, setCreating] = useState(false);

  const toggle = (id: string) => {
    if (disabled) return;
    onChange(value.includes(id) ? value.filter((t) => t !== id) : [...value, id]);
  };

  const resetAdd = () => {
    setAdding(false);
    setNewName('');
    setNewColor(PALETTE[4]);
  };

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const tag = await tagsService.create({ name, color: newColor });
      await queryClient.invalidateQueries({ queryKey: ['tags'] });
      onChange([...value, tag.id]); // auto-seleciona a tag recém-criada
      resetAdd();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar tag');
    } finally {
      setCreating(false);
    }
  };

  if (isLoading) {
    return <p className="text-xs text-muted-foreground">Carregando tags…</p>;
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {tags.length === 0 && !adding && (
          <span className="text-xs text-muted-foreground">Nenhuma tag ainda.</span>
        )}

        {tags.map((tag) => {
          const selected = value.includes(tag.id);
          return (
            <button
              key={tag.id}
              type="button"
              onClick={() => toggle(tag.id)}
              disabled={disabled}
              aria-pressed={selected}
              className={`inline-flex min-h-7 items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
                selected
                  ? 'border-transparent text-white'
                  : 'border-input text-foreground hover:bg-muted'
              }`}
              style={selected ? { backgroundColor: tag.color || '#6366f1' } : undefined}
            >
              {selected ? (
                <Check aria-hidden="true" className="h-3 w-3" />
              ) : (
                <TagIcon aria-hidden="true" className="h-3 w-3" style={{ color: tag.color || undefined }} />
              )}
              {tag.name}
            </button>
          );
        })}

        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            disabled={disabled}
            className="inline-flex min-h-7 items-center gap-1 rounded-full border border-dashed border-input px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
          >
            <Plus className="h-3 w-3" />
            Nova tag
          </button>
        )}
      </div>

      {adding && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/40 p-2">
          <input
            autoFocus
            type="text"
            placeholder="Nome da tag"
            aria-label="Nome da nova tag"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleCreate();
              } else if (e.key === 'Escape') {
                resetAdd();
              }
            }}
            className={`${controlSmCls} min-w-[120px] flex-1`}
          />
          <div role="radiogroup" aria-label="Cor da tag" className="flex items-center gap-1.5">
            {PALETTE.map((c, i) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={newColor === c}
                aria-label={`Cor ${i + 1}`}
                onClick={() => setNewColor(c)}
                className={`h-6 w-6 rounded-full ${newColor === c ? 'ring-2 ring-foreground ring-offset-2 ring-offset-background' : ''}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={handleCreate}
            disabled={creating || !newName.trim()}
            className="inline-flex h-8 items-center gap-1 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            Criar
          </button>
          <button
            type="button"
            onClick={resetAdd}
            aria-label="Cancelar nova tag"
            title="Cancelar"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
