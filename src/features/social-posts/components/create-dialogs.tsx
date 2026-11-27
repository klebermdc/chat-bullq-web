'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { controlCls } from '@/components/ui/control';
import { Dialog } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useCreateIdea, useSuggestPosts } from '../hooks/use-social-posts';

const DAY_OPTIONS = [1, 2, 3, 4, 5, 6, 7] as const;
const DEFAULT_DAYS = 3;
const DEFAULT_PER_DAY: 1 | 2 = 2;
const TOPIC_MAX = 200;

interface CreateDialogProps {
  open: boolean;
  onClose: () => void;
  /** Canal escolhido no cabeçalho; sem ele a API usa o padrão. */
  channelId: string | null;
  onCreated: () => void;
}

/** "Próximos [3] dias, [2] por dia": a IA sugere a semana de posts. */
export function SuggestDialog({ open, onClose, channelId, onCreated }: CreateDialogProps) {
  const [days, setDays] = useState<number>(DEFAULT_DAYS);
  const [perDay, setPerDay] = useState<1 | 2>(DEFAULT_PER_DAY);
  const suggest = useSuggestPosts();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    suggest.mutate(
      { channelId: channelId ?? undefined, days, perDay },
      {
        onSuccess: () => {
          onClose();
          onCreated();
        },
      },
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Sugerir posts"
      description="A IA escreve a legenda e cria a imagem de cada post. Nada é publicado sem você aprovar."
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={suggest.isPending}>
            Cancelar
          </Button>
          <Button type="submit" form="suggest-form" loading={suggest.isPending}>
            Sugerir
          </Button>
        </>
      }
    >
      <form id="suggest-form" onSubmit={submit} className="flex flex-wrap items-center gap-x-2 gap-y-3 text-sm">
        <label className="flex items-center gap-2">
          Próximos
          <select
            value={days}
            onChange={(event) => setDays(Number(event.target.value))}
            className={cn(controlCls, 'w-16')}
            aria-label="Quantos dias"
          >
            {DAY_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          {days === 1 ? 'dia,' : 'dias,'}
        </label>
        <div className="flex items-center gap-2">
          <div role="radiogroup" aria-label="Posts por dia" className="inline-flex rounded-lg bg-muted p-0.5">
            {([1, 2] as const).map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={perDay === n}
                onClick={() => setPerDay(n)}
                className={cn(
                  'h-8 w-9 rounded-md text-sm font-medium transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  perDay === n ? 'bg-background text-foreground shadow-soft' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {n}
              </button>
            ))}
          </div>
          por dia
        </div>
        <p className="w-full text-xs text-muted-foreground">
          {days * perDay} {days * perDay === 1 ? 'post' : 'posts'}. Pode levar alguns segundos.
        </p>
      </form>
    </Dialog>
  );
}

/** Uma sugestão sobre um tema escolhido por quem está na tela. */
export function NewIdeaDialog({ open, onClose, channelId, onCreated }: CreateDialogProps) {
  const [topic, setTopic] = useState('');
  const create = useCreateIdea();
  const trimmed = topic.trim();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!trimmed) return;
    create.mutate(
      { channelId: channelId ?? undefined, topic: trimmed },
      {
        onSuccess: () => {
          setTopic('');
          onClose();
          onCreated();
        },
      },
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Nova ideia"
      description="Diga o tema e a IA monta o post."
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={create.isPending}>
            Cancelar
          </Button>
          <Button type="submit" form="idea-form" loading={create.isPending} disabled={!trimmed}>
            Criar post
          </Button>
        </>
      }
    >
      <form id="idea-form" onSubmit={submit} className="space-y-1">
        <label htmlFor="idea-topic" className="text-xs font-medium text-muted-foreground">
          Tema
        </label>
        <input
          id="idea-topic"
          autoFocus
          value={topic}
          maxLength={TOPIC_MAX}
          placeholder="Ex.: dicas para fila do Epcot"
          onChange={(event) => setTopic(event.target.value)}
          className={cn(controlCls, 'w-full')}
        />
      </form>
    </Dialog>
  );
}
