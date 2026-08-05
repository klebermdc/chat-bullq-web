'use client';

import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { tagsService } from '@/features/settings/services/tags.service';
import { useSubscriberTagMutations } from '@/hooks/use-email';
import type { SubscriberTag } from '@/lib/email-api';

type SubscriberTagsEditorProps = {
  subscriberId: string;
  tags: SubscriberTag[];
};

/**
 * Etiquetas de UM destinatário: chips removíveis + um `<select>` nativo
 * para adicionar. `<select>` em vez de um popover próprio — é
 * inteiramente navegável por teclado de graça, sem reimplementar foco e
 * `Escape` de uma listbox customizada.
 */
export function SubscriberTagsEditor({ subscriberId, tags }: SubscriberTagsEditorProps) {
  const { data: allTags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: () => tagsService.list(),
  });
  const { add, remove } = useSubscriberTagMutations();

  const appliedIds = new Set(tags.map((t) => t.id));
  const available = allTags.filter((t) => !appliedIds.has(t.id));
  const pending = add.isPending || remove.isPending;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {tags.map((tag) => (
        <span
          key={tag.id}
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium text-white"
          style={{ backgroundColor: tag.color || '#6366f1' }}
        >
          {tag.name}
          <button
            type="button"
            onClick={() => remove.mutate({ subscriberId, tagId: tag.id })}
            disabled={pending}
            aria-label={`Remover etiqueta ${tag.name}`}
            className="text-white/80 hover:text-white disabled:opacity-50"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </span>
      ))}

      {available.length > 0 && (
        <>
          <label htmlFor={`add-tag-${subscriberId}`} className="sr-only">
            Adicionar etiqueta
          </label>
          <select
            id={`add-tag-${subscriberId}`}
            value=""
            disabled={pending}
            onChange={(e) => {
              const tagId = e.target.value;
              if (tagId) add.mutate({ subscriberId, tagId });
            }}
            className="h-6 rounded-full border border-dashed border-zinc-300 bg-transparent px-2 text-[11px] text-zinc-500 outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-400"
          >
            <option value="">+ etiqueta</option>
            {available.map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tag.name}
              </option>
            ))}
          </select>
        </>
      )}
    </div>
  );
}
