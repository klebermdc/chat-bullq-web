'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Template } from '../services/templates.service';
import {
  TEMPLATE_MARKERS,
  canToggleMarker,
  isMarked,
  type TemplateMarker,
} from '../lib/template-markers';

/** Selos dos papéis do template no canal (Retomada, Distribuição). */
export function TemplateMarkerBadges({ template }: { template: Template }) {
  return (
    <>
      {TEMPLATE_MARKERS.filter((m) => isMarked(template, m)).map(({ key, Icon, badge }) => (
        <span
          key={key}
          className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary"
        >
          <Icon className="h-3 w-3" />
          {badge}
        </span>
      ))}
    </>
  );
}

/** Botões liga/desliga de cada papel. Um template por papel em cada canal. */
export function TemplateMarkerToggles({
  template,
  channelId,
}: {
  template: Template;
  channelId: string;
}) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (marker: TemplateMarker) =>
      isMarked(template, marker)
        ? marker.clear(template.id, channelId)
        : marker.set(template.id, channelId),
    onSuccess: (_data, marker) => {
      toast.success(isMarked(template, marker) ? marker.clearToast : marker.setToast);
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Erro'),
  });

  return (
    <>
      {TEMPLATE_MARKERS.filter((m) => canToggleMarker(template, m)).map((marker) => {
        const marked = isMarked(template, marker);
        const label = marked ? marker.clearLabel : marker.setLabel;
        const isBusy = mutation.isPending && mutation.variables?.key === marker.key;
        return (
          <button
            key={marker.key}
            onClick={() => mutation.mutate(marker)}
            disabled={mutation.isPending}
            type="button"
            className={`flex h-9 w-9 items-center justify-center rounded-lg hover:bg-primary/10 hover:text-primary disabled:opacity-50 ${
              marked ? 'text-primary' : 'text-muted-foreground'
            }`}
            title={label}
            aria-label={label}
            aria-pressed={marked}
          >
            {isBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <marker.Icon className="h-4 w-4" />
            )}
          </button>
        );
      })}
    </>
  );
}
