'use client';

import { useState } from 'react';
import { Instagram, ImageOff } from 'lucide-react';
import type { StoryReplyContext } from '../services/inbox.service';

/**
 * Renders the original Instagram story a user replied to, rendered as a small
 * card above the reply bubble — mirrors the Instagram Direct UX so the agent
 * sees WHICH story triggered the message.
 *
 * Story media URLs expire (Meta CDN ~24h). We degrade gracefully to a title
 * card when the image fails to load.
 */
export function StoryReplyCard({
  story,
  isOutbound,
}: {
  story: StoryReplyContext;
  isOutbound: boolean;
}) {
  const [imgError, setImgError] = useState(false);
  const label =
    story.kind === 'mention' ? 'Mencionou você no story' : 'Respondeu ao seu story';

  // O cartão fica ACIMA do balão, sobre o fundo lilás da conversa — usa as
  // cores de superfície (card / lilás da marca), não as de dentro do balão.
  const frame = `mb-1 overflow-hidden rounded-xl border ${
    isOutbound
      ? 'border-primary/30 bg-primary/10'
      : 'border-border bg-card shadow-soft'
  }`;
  // `text-primary` sobre `bg-primary/10` dá 4,4:1 no claro: o rótulo usa a
  // tinta normal (com opacidade) e deixa a cor para a moldura.
  const labelColor = isOutbound
    ? 'text-foreground/80'
    : 'text-muted-foreground';

  return (
    <div className={frame}>
      <div className={`flex items-center gap-1.5 px-3 pt-2 text-xs font-semibold uppercase tracking-wider ${labelColor}`}>
        <Instagram className="h-3.5 w-3.5" />
        {label}
      </div>
      {story.url && !imgError ? (
        <div className="mt-1.5 p-2">
          <img
            src={story.url}
            alt="Story"
            onError={() => setImgError(true)}
            className="h-24 w-[68px] rounded-lg object-cover"
          />
        </div>
      ) : (
        <div className="mt-1 flex items-center gap-2 px-3 pb-2 text-xs text-muted-foreground">
          <ImageOff className="h-4 w-4 opacity-60" />
          <span>Mídia do story não disponível (expirada)</span>
        </div>
      )}
    </div>
  );
}
