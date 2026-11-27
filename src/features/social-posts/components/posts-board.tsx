'use client';

import { CalendarClock, CheckCircle2, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';
import { formatDay } from '../lib/brasilia-time';
import { groupByDay, postsForTab, TABS, type PostsTab } from '../lib/post-groups';
import type { InstagramChannel, SocialPost } from '../services/social-posts.service';
import { PostCard } from './post-card';

const GRID_CLS = 'grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3';

const EMPTY: Record<PostsTab, { icon: typeof Lightbulb; title: string; description: string }> = {
  suggestions: {
    icon: Lightbulb,
    title: 'Nenhuma sugestão ainda',
    description: 'Clique em Sugerir posts e a IA prepara os próximos dias.',
  },
  scheduled: {
    icon: CalendarClock,
    title: 'Nada agendado',
    description: 'Escolha a data numa sugestão e clique em Agendar.',
  },
  published: {
    icon: CheckCircle2,
    title: 'Nada publicado por aqui ainda',
    description: 'Os posts publicados pelo Sendtur aparecem nesta aba.',
  },
};

interface PostsBoardProps {
  posts: ReadonlyArray<SocialPost>;
  channels: ReadonlyArray<InstagramChannel>;
  channelId: string | null;
  tab: PostsTab;
  onTabChange: (tab: PostsTab) => void;
  onSuggest: () => void;
}

/** Abas Sugestões / Agendados / Publicados com os cartões de cada uma. */
export function PostsBoard({ posts, channels, channelId, tab, onTabChange, onSuggest }: PostsBoardProps) {
  const usernameOf = (id: string) => channels.find((c) => c.id === id)?.username ?? null;
  const visible = postsForTab(posts, tab, channelId);
  const empty = EMPTY[tab];

  return (
    <div className="space-y-4">
      <div role="tablist" aria-label="Publicações" className="inline-flex max-w-full overflow-x-auto rounded-lg bg-muted p-0.5">
        {TABS.map((t) => {
          const count = postsForTab(posts, t.value, channelId).length;
          const isActive = t.value === tab;
          return (
            <button
              key={t.value}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onTabChange(t.value)}
              className={cn(
                'h-8 shrink-0 rounded-md px-3 text-sm font-medium transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                isActive ? 'bg-background text-foreground shadow-soft' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {t.label}
              {count > 0 && <span className="ml-1.5 text-xs text-muted-foreground">{count}</span>}
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={empty.icon}
          title={empty.title}
          description={empty.description}
          action={tab === 'suggestions' ? <Button onClick={onSuggest}>Sugerir posts</Button> : undefined}
        />
      ) : tab === 'scheduled' ? (
        <div className="space-y-6">
          {groupByDay(visible).map((group) => (
            <section key={group.key} aria-label={group.sampleIso ? formatDay(group.sampleIso) : 'Sem data'}>
              <h2 className="mb-3 text-sm font-semibold capitalize text-foreground">
                {group.sampleIso ? formatDay(group.sampleIso) : 'Sem data'}
              </h2>
              <div className={GRID_CLS}>
                {group.posts.map((post) => (
                  <PostCard key={post.id} post={post} username={usernameOf(post.channelId)} />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className={GRID_CLS}>
          {visible.map((post) => (
            <PostCard key={post.id} post={post} username={usernameOf(post.channelId)} />
          ))}
        </div>
      )}
    </div>
  );
}
