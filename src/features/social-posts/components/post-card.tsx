'use client';

import { AlertTriangle, ExternalLink } from 'lucide-react';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import type { SocialPost, SocialPostStatus } from '../services/social-posts.service';
import { formatWhen } from '../lib/brasilia-time';
import { ImageTextFields } from './image-text-fields';
import { PostActions } from './post-actions';
import { PostTextFields } from './post-fields';
import { ImagePromptEditor, PostImage } from './post-image';

const STATUS_BADGE: Record<SocialPostStatus, { label: string; variant: BadgeProps['variant'] }> = {
  SUGGESTED: { label: 'Sugestão', variant: 'brand' },
  SCHEDULED: { label: 'Agendado', variant: 'info' },
  PUBLISHING: { label: 'Publicando…', variant: 'hot' },
  PUBLISHED: { label: 'Publicado', variant: 'success' },
  FAILED: { label: 'Falhou', variant: 'urgent' },
  DISCARDED: { label: 'Descartado', variant: 'neutral' },
};

/** Textos e imagem só mudam antes de o post ir para o Instagram. */
const TEXT_EDITABLE: ReadonlyArray<SocialPostStatus> = ['SUGGESTED', 'FAILED', 'SCHEDULED'];
const IMAGE_EDITABLE: ReadonlyArray<SocialPostStatus> = ['SUGGESTED', 'FAILED'];

/** Cartão com cara de post do Instagram: conta, imagem 4:5, legenda e ações. */
export function PostCard({ post, username }: { post: SocialPost; username: string | null }) {
  const badge = STATUS_BADGE[post.status];

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-soft">
      <header className="flex items-center gap-2 px-3 py-2.5">
        <span
          aria-hidden="true"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
        >
          {(username ?? 'IG').slice(0, 2).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{username ? `@${username}` : 'Instagram'}</p>
          <p className="truncate text-xs text-muted-foreground" title={post.topic}>
            {post.topic}
          </p>
        </div>
        <Badge variant={badge.variant}>{badge.label}</Badge>
      </header>

      <PostImage post={post} />

      <div className="flex flex-1 flex-col gap-3 p-3">
        {/* Agendado também edita: o texto não mexe na data. */}
        {TEXT_EDITABLE.includes(post.status) && <ImageTextFields post={post} />}

        {post.status === 'FAILED' && post.error && (
          <div role="alert" className="flex gap-2 rounded-lg bg-urgent-wash px-3 py-2 text-sm text-urgent-ink">
            <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{post.error}</span>
          </div>
        )}

        <PostTextFields post={post} isEditable={TEXT_EDITABLE.includes(post.status)} />

        {IMAGE_EDITABLE.includes(post.status) && <ImagePromptEditor post={post} />}

        <PublishedInfo post={post} />

        <div className="mt-auto">
          <PostActions post={post} />
        </div>
      </div>
    </article>
  );
}

function PublishedInfo({ post }: { post: SocialPost }) {
  if (post.status !== 'PUBLISHED') return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
      {post.publishedAt && <span className="text-muted-foreground">Publicado {formatWhen(post.publishedAt)}</span>}
      {post.permalink && (
        <a
          href={post.permalink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Ver no Instagram
          <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
        </a>
      )}
    </div>
  );
}
