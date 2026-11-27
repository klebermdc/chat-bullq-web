import { describe, expect, it } from 'vitest';
import type { SocialPost } from '../services/social-posts.service';
import { groupByDay, normalizeKeyword, postsForTab, shouldPoll } from './post-groups';

const make = (over: Partial<SocialPost>): SocialPost => ({
  id: 'p',
  channelId: 'ig1',
  status: 'SUGGESTED',
  imageStatus: 'READY',
  topic: 'Epcot',
  caption: 'legenda',
  imagePrompt: 'prompt',
  imageUrl: 'https://img/1.png',
  commentKeyword: null,
  scheduledAt: null,
  publishedAt: null,
  permalink: null,
  error: null,
  createdAt: '2026-11-27T10:00:00.000Z',
  updatedAt: '2026-11-27T10:00:00.000Z',
  ...over,
});

describe('postsForTab', () => {
  const posts = [
    make({ id: 'a', status: 'SUGGESTED', scheduledAt: '2026-11-29T13:00:00.000Z' }),
    make({ id: 'b', status: 'FAILED', scheduledAt: '2026-11-28T13:00:00.000Z' }),
    make({ id: 'c', status: 'SUGGESTED', createdAt: '2026-11-27T11:00:00.000Z' }),
    make({ id: 'd', status: 'SCHEDULED', scheduledAt: '2026-11-30T13:00:00.000Z' }),
    make({ id: 'e', status: 'PUBLISHING', scheduledAt: '2026-11-28T09:00:00.000Z' }),
    make({ id: 'f', status: 'PUBLISHED', publishedAt: '2026-11-20T10:00:00.000Z' }),
    make({ id: 'g', status: 'PUBLISHED', publishedAt: '2026-11-25T10:00:00.000Z' }),
    make({ id: 'h', status: 'DISCARDED' }),
    make({ id: 'i', status: 'SUGGESTED', channelId: 'ig2' }),
  ];

  it('sugestões juntam SUGGESTED e FAILED, com data mais cedo primeiro', () => {
    expect(postsForTab(posts, 'suggestions', 'ig1').map((p) => p.id)).toEqual(['b', 'a', 'c']);
  });

  it('agendados por data; publicados do mais recente', () => {
    expect(postsForTab(posts, 'scheduled', 'ig1').map((p) => p.id)).toEqual(['e', 'd']);
    expect(postsForTab(posts, 'published', 'ig1').map((p) => p.id)).toEqual(['g', 'f']);
  });

  it('filtra pelo canal escolhido; null mostra todos', () => {
    expect(postsForTab(posts, 'suggestions', 'ig2').map((p) => p.id)).toEqual(['i']);
    expect(postsForTab(posts, 'suggestions', null)).toHaveLength(4);
  });

  it('não muda a lista recebida', () => {
    const copy = [...posts];
    postsForTab(posts, 'scheduled', null);
    expect(posts).toEqual(copy);
  });
});

describe('shouldPoll', () => {
  it('reconsulta enquanto há imagem sendo gerada ou post subindo', () => {
    expect(shouldPoll([make({ imageStatus: 'PENDING' })])).toBe(true);
    expect(shouldPoll([make({ status: 'PUBLISHING' })])).toBe(true);
  });

  it('para quando nada está em andamento', () => {
    expect(shouldPoll([make({}), make({ imageStatus: 'FAILED' })])).toBe(false);
    expect(shouldPoll(undefined)).toBe(false);
  });
});

describe('groupByDay', () => {
  it('separa por dia de Brasília (22h30 de Brasília ainda é o mesmo dia)', () => {
    const groups = groupByDay([
      make({ id: 'a', scheduledAt: '2026-11-28T13:00:00.000Z' }),
      make({ id: 'b', scheduledAt: '2026-11-29T01:30:00.000Z' }),
      make({ id: 'c', scheduledAt: '2026-11-29T13:00:00.000Z' }),
    ]);
    expect(groups.map((g) => [g.key, g.posts.map((p) => p.id)])).toEqual([
      ['2026-11-28', ['a', 'b']],
      ['2026-11-29', ['c']],
    ]);
  });
});

describe('normalizeKeyword', () => {
  it('maiúsculas, sem espaço; vazio vira null', () => {
    expect(normalizeKeyword(' guia mento ')).toBe('GUIAMENTO');
    expect(normalizeKeyword('   ')).toBeNull();
  });
});
