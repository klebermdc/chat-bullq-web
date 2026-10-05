'use client';

import { useMemo } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { AlertTriangle, X } from 'lucide-react';
import { notificationsSettingsService } from '@/features/settings/services/notifications.service';
import { Button, buttonVariants } from '@/components/ui/button';

/**
 * Persistent banner shown app-wide whenever there are unread
 * AI_TOOL_FAILURE notifications. Polls every 30s. Click "Marcar como
 * vistas" to dismiss all related notifications. The point is to make
 * silent IA failures impossible to miss — without this, the Lívia 404
 * case (run completes "successfully" while the skill output is broken)
 * stays invisible until a customer complains.
 */
export function ToolFailureBanner() {
  const queryClient = useQueryClient();

  const { data: notif } = useQuery({
    queryKey: ['notifications', 'tool-failures'],
    queryFn: async () => {
      const r = await notificationsSettingsService.list(1, 50);
      return r.notifications.filter(
        (n) => n.type === 'AI_TOOL_FAILURE' && !n.isRead,
      );
    },
    refetchInterval: 30_000,
    staleTime: 25_000,
  });

  const markAll = useMutation({
    mutationFn: async () => {
      const ids = (notif ?? []).map((n) => n.id);
      // Don't blast `markAllRead` — that would dismiss unrelated notifs
      // (new message, mention, etc) the user actually wants to see.
      await Promise.all(
        ids.map((id) => notificationsSettingsService.markRead(id)),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const count = notif?.length ?? 0;
  const headline = useMemo(() => {
    if (count === 0) return null;
    const last = notif![0];
    if (count === 1) return last.title;
    return `${count} chamadas de ferramenta falharam — última: ${last.title}`;
  }, [count, notif]);

  if (count === 0) return null;

  return (
    <div role="alert" className="border-b border-urgent/30 bg-urgent-wash px-4 py-2.5 text-urgent-ink sm:px-6">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <AlertTriangle aria-hidden="true" className="h-4 w-4 flex-shrink-0" />
        <div className="min-w-0 flex-1 basis-48 text-sm">
          <span className="font-medium">{headline}</span>
          {notif && notif[0]?.body && (
            <span className="ml-2 opacity-90">
              · {notif[0].body}
            </span>
          )}
        </div>
        <Link
          href="/settings/jarvis?tab=runs"
          className={buttonVariants({ variant: 'destructive', size: 'sm' })}
        >
          Ver execuções
        </Link>
        <Button
          variant="outline"
          size="sm"
          onClick={() => markAll.mutate()}
          disabled={markAll.isPending}
          className="text-foreground"
        >
          {markAll.isPending ? 'Marcando…' : 'Marcar como vistas'}
        </Button>
        <button
          type="button"
          onClick={() => markAll.mutate()}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-urgent/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Dispensar aviso"
          title="Dispensar aviso"
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
