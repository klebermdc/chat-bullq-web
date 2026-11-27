'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { controlCls } from '@/components/ui/control';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { cn } from '@/lib/utils';
import {
  useDiscardPost,
  usePublishNow,
  useSchedulePost,
  useUnschedulePost,
  useUpdatePost,
} from '../hooks/use-social-posts';
import { formatWhen, fromBrasiliaInputValue, isFuture, toBrasiliaInputValue } from '../lib/brasilia-time';
import type { SocialPost } from '../services/social-posts.service';

/** Ações conforme o status: sugestão/falha agenda ou publica; agendado desagenda. */
export function PostActions({ post }: { post: SocialPost }) {
  if (post.status === 'SUGGESTED' || post.status === 'FAILED') return <PendingActions post={post} />;
  if (post.status === 'SCHEDULED') return <ScheduledActions post={post} />;
  if (post.status === 'PUBLISHING') {
    return <p className="text-sm text-muted-foreground">Enviando para o Instagram…</p>;
  }
  return null;
}

function PendingActions({ post }: { post: SocialPost }) {
  const [dateDraft, setDateDraft] = useState<string | null>(null);
  const update = useUpdatePost();
  const schedule = useSchedulePost();
  const publish = usePublishNow();
  const discard = useDiscardPost();
  const { confirm, confirmDialog } = useConfirm();

  const dateValue = dateDraft ?? toBrasiliaInputValue(post.scheduledAt);
  const isImageReady = post.imageStatus === 'READY';
  const isBusy = schedule.isPending || publish.isPending || discard.isPending;

  // Guarda a data na sugestão ao sair do campo, para não perder a escolha.
  const saveDate = () => {
    if (dateDraft === null || update.isPending) return;
    const iso = fromBrasiliaInputValue(dateDraft);
    if (iso === post.scheduledAt) return setDateDraft(null);
    update.mutate({ id: post.id, changes: { scheduledAt: iso } }, { onSuccess: () => setDateDraft(null) });
  };

  const handleSchedule = () => {
    const iso = fromBrasiliaInputValue(dateValue);
    if (!iso) return toast.error('Escolha o dia e a hora da publicação.');
    if (!isFuture(iso, new Date())) return toast.error('Escolha um horário que ainda não passou.');
    schedule.mutate({ id: post.id, scheduledAt: iso }, { onSuccess: () => setDateDraft(null) });
  };

  const handlePublish = async () => {
    const ok = await confirm({
      title: 'Publicar agora?',
      description: 'Isso publica no Instagram agora. Continuar?',
      confirmLabel: 'Publicar agora',
    });
    if (ok) publish.mutate(post.id);
  };

  const handleDiscard = async () => {
    const ok = await confirm({
      title: 'Descartar este post?',
      description: 'Ele sai da lista e não será publicado.',
      confirmLabel: 'Descartar',
      destructive: true,
    });
    if (ok) discard.mutate(post.id);
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <label htmlFor={`date-${post.id}`} className="text-xs font-medium text-muted-foreground">
          Data e hora (Brasília)
        </label>
        <input
          id={`date-${post.id}`}
          type="datetime-local"
          value={dateValue}
          onChange={(event) => setDateDraft(event.target.value)}
          onBlur={saveDate}
          className={cn(controlCls, 'w-full')}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          onClick={handleSchedule}
          loading={schedule.isPending}
          disabled={!isImageReady || isBusy}
          title={isImageReady ? undefined : 'Espere a imagem ficar pronta'}
        >
          Agendar
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handlePublish}
          loading={publish.isPending}
          disabled={!isImageReady || isBusy}
          title={isImageReady ? undefined : 'Espere a imagem ficar pronta'}
        >
          {post.status === 'FAILED' ? 'Publicar de novo' : 'Publicar agora'}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleDiscard}
          loading={discard.isPending}
          disabled={isBusy}
          className="ml-auto text-muted-foreground"
        >
          Descartar
        </Button>
      </div>
      {!isImageReady && <p className="text-xs text-muted-foreground">Agendar e publicar liberam quando a imagem ficar pronta.</p>}
      {confirmDialog}
    </div>
  );
}

function ScheduledActions({ post }: { post: SocialPost }) {
  const unschedule = useUnschedulePost();
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">
          {post.scheduledAt ? `Sai ${formatWhen(post.scheduledAt)}` : 'Agendado'}
        </p>
        <p className="text-xs text-muted-foreground">Para mudar a data, desagende.</p>
      </div>
      <Button size="sm" variant="outline" onClick={() => unschedule.mutate(post.id)} loading={unschedule.isPending}>
        Desagendar
      </Button>
    </div>
  );
}
