'use client';

import { useQuery } from '@tanstack/react-query';
import { Check, Tag as TagIcon } from 'lucide-react';
import { tagsService } from '@/features/settings/services/tags.service';

type TagFilterChipsProps = {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  emptyLabel?: string;
};

/**
 * Seleção múltipla de etiquetas da organização, em chips — sem criação
 * inline (isso já existe em `TagMultiSelect`, usado onde a etiqueta nasce).
 * Aqui a etiqueta é sempre pré-existente: o uso é filtrar por ela, seja no
 * público de uma campanha, seja na lista de destinatários.
 */
export function TagFilterChips({ selectedIds, onChange, disabled, emptyLabel }: TagFilterChipsProps) {
  const { data: tags = [], isLoading } = useQuery({
    queryKey: ['tags'],
    queryFn: () => tagsService.list(),
  });

  const toggle = (id: string) => {
    if (disabled) return;
    onChange(selectedIds.includes(id) ? selectedIds.filter((t) => t !== id) : [...selectedIds, id]);
  };

  if (isLoading) {
    return <p className="text-xs text-zinc-400 dark:text-zinc-500">Carregando etiquetas…</p>;
  }

  if (tags.length === 0) {
    return (
      <p className="text-xs text-zinc-400 dark:text-zinc-500">
        {emptyLabel ?? 'Nenhuma etiqueta cadastrada ainda.'}
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Etiquetas">
      {tags.map((tag) => {
        const selected = selectedIds.includes(tag.id);
        return (
          <button
            key={tag.id}
            type="button"
            aria-pressed={selected}
            onClick={() => toggle(tag.id)}
            disabled={disabled}
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
              selected
                ? 'border-transparent text-white'
                : 'border-zinc-300 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800'
            }`}
            style={selected ? { backgroundColor: tag.color || '#6366f1' } : undefined}
          >
            {selected ? (
              <Check className="h-3 w-3" />
            ) : (
              <TagIcon className="h-3 w-3" style={{ color: tag.color || undefined }} />
            )}
            {tag.name}
          </button>
        );
      })}
    </div>
  );
}
