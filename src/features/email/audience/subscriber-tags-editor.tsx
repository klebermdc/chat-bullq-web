'use client';

import { useQuery } from '@tanstack/react-query';
import { tagsService } from '@/features/settings/services/tags.service';
import { useSubscriberTagMutations } from '@/hooks/use-email';
import type { SubscriberTag } from '@/lib/email-api';
import { TagChip } from '@/components/ui/tag-chip';

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
        <TagChip
          key={tag.id}
          name={tag.name}
          color={tag.color}
          textColor={tag.textColor}
          onRemove={() => remove.mutate({ subscriberId, tagId: tag.id })}
          removeDisabled={pending}
        />
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
            className="h-7 rounded-full border border-dashed border-input bg-transparent px-2 text-[11px] text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">+ Etiqueta</option>
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
