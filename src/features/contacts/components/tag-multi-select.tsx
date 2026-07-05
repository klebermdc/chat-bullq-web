'use client';

import { useQuery } from '@tanstack/react-query';
import { Check, Tag as TagIcon } from 'lucide-react';
import { tagsService } from '@/features/settings/services/tags.service';

interface TagMultiSelectProps {
  /** Selected tag ids. */
  value: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}

/**
 * Chip-based multi-select over the org's tags. Fetches the tag list once and
 * toggles ids in/out of `value`. Returns just the selected ids — the caller
 * attaches them to the contact (via tagsService.addToContact) after creating it.
 */
export function TagMultiSelect({ value, onChange, disabled }: TagMultiSelectProps) {
  const { data: tags = [], isLoading } = useQuery({
    queryKey: ['tags'],
    queryFn: () => tagsService.list(),
  });

  const toggle = (id: string) => {
    if (disabled) return;
    onChange(value.includes(id) ? value.filter((t) => t !== id) : [...value, id]);
  };

  if (isLoading) {
    return <p className="text-xs text-zinc-400 dark:text-zinc-500">Carregando tags…</p>;
  }

  if (tags.length === 0) {
    return (
      <p className="text-xs text-zinc-400 dark:text-zinc-500">
        Nenhuma tag criada ainda (Configurações → Tags).
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag) => {
        const selected = value.includes(tag.id);
        return (
          <button
            key={tag.id}
            type="button"
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
