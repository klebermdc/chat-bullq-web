import type { SocialPost, SocialPostStatus } from '../services/social-posts.service';
import { brasiliaDayKey } from './brasilia-time';

export type PostsTab = 'suggestions' | 'scheduled' | 'published';

export const TAB_STATUSES: Record<PostsTab, ReadonlyArray<SocialPostStatus>> = {
  suggestions: ['SUGGESTED', 'FAILED'],
  scheduled: ['SCHEDULED', 'PUBLISHING'],
  published: ['PUBLISHED'],
};

export const TABS: ReadonlyArray<{ value: PostsTab; label: string }> = [
  { value: 'suggestions', label: 'Sugestões' },
  { value: 'scheduled', label: 'Agendados' },
  { value: 'published', label: 'Publicados' },
];

/** Enquanto a imagem é gerada ou o post sobe, a tela reconsulta sozinha. */
export const POLL_INTERVAL_MS = 4_000;

export function shouldPoll(posts: ReadonlyArray<SocialPost> | undefined): boolean {
  return (posts ?? []).some((p) => p.imageStatus === 'PENDING' || p.status === 'PUBLISHING');
}

const time = (iso: string | null): number => (iso ? new Date(iso).getTime() : Number.POSITIVE_INFINITY);

/** Sugestões: as com data primeiro (mais cedo antes); sem data, as mais novas. */
function compareSuggestions(a: SocialPost, b: SocialPost): number {
  const byDate = time(a.scheduledAt) - time(b.scheduledAt);
  if (byDate !== 0 && Number.isFinite(byDate)) return byDate;
  if (a.scheduledAt && !b.scheduledAt) return -1;
  if (!a.scheduledAt && b.scheduledAt) return 1;
  return b.createdAt.localeCompare(a.createdAt);
}

const compareScheduled = (a: SocialPost, b: SocialPost) => time(a.scheduledAt) - time(b.scheduledAt);
const comparePublished = (a: SocialPost, b: SocialPost) =>
  (b.publishedAt ?? b.updatedAt).localeCompare(a.publishedAt ?? a.updatedAt);

const COMPARE: Record<PostsTab, (a: SocialPost, b: SocialPost) => number> = {
  suggestions: compareSuggestions,
  scheduled: compareScheduled,
  published: comparePublished,
};

/** Posts de uma aba, do canal escolhido (null = todos), já na ordem da tela. */
export function postsForTab(
  posts: ReadonlyArray<SocialPost>,
  tab: PostsTab,
  channelId: string | null,
): SocialPost[] {
  const statuses = TAB_STATUSES[tab];
  return posts
    .filter((p) => statuses.includes(p.status) && (channelId === null || p.channelId === channelId))
    .sort(COMPARE[tab]);
}

export interface DayGroup {
  key: string;
  /** ISO de um post do dia, para formatar o cabeçalho. */
  sampleIso: string | null;
  posts: SocialPost[];
}

/** Agendados separados por dia de Brasília, mantendo a ordem recebida. */
export function groupByDay(posts: ReadonlyArray<SocialPost>): DayGroup[] {
  return posts.reduce<DayGroup[]>((groups, post) => {
    const key = post.scheduledAt ? brasiliaDayKey(post.scheduledAt) : 'sem-data';
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      return [...groups.slice(0, -1), { ...last, posts: [...last.posts, post] }];
    }
    return [...groups, { key, sampleIso: post.scheduledAt, posts: [post] }];
  }, []);
}

/** "GUIAMENTO": a palavra que o seguidor comenta, sempre em maiúsculas e sem espaço. */
export function normalizeKeyword(raw: string): string | null {
  const word = raw.trim().replace(/\s+/g, '').toUpperCase();
  return word.length > 0 ? word : null;
}
