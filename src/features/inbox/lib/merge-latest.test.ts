import { describe, expect, it } from 'vitest';
import { mergeLatestMessages } from './merge-latest';

type M = { id: string; externalId: string | null; createdAt: string; status?: string };

const msg = (id: string, minute: number, extra: Partial<M> = {}): M => ({
  id,
  externalId: null,
  createdAt: new Date(Date.UTC(2026, 8, 18, 10, minute)).toISOString(),
  ...extra,
});

describe('mergeLatestMessages', () => {
  it('appends messages the socket missed, keeping chronological order', () => {
    const cached = [msg('a', 1), msg('b', 2)];
    const latest = [msg('b', 2), msg('c', 3), msg('d', 4)];
    const { messages, added } = mergeLatestMessages(cached, latest);
    expect(messages.map((m) => m.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(added).toBe(2);
  });

  // Quem rolou pra cima carregou histórico: o backfill não pode jogá-lo fora.
  it('keeps older history that is not in the latest page', () => {
    const cached = [msg('old1', 0), msg('old2', 1), msg('b', 2)];
    const { messages } = mergeLatestMessages(cached, [msg('b', 2), msg('c', 3)]);
    expect(messages.map((m) => m.id)).toEqual(['old1', 'old2', 'b', 'c']);
  });

  it('updates an existing message with the fresh server copy (status ticks)', () => {
    const cached = [msg('a', 1, { status: 'SENT' })];
    const { messages, added } = mergeLatestMessages(cached, [msg('a', 1, { status: 'READ' })]);
    expect(messages[0].status).toBe('READ');
    expect(added).toBe(0);
  });

  it('dedupes an optimistic copy by externalId', () => {
    const cached = [msg('temp', 1, { externalId: 'wamid.1' })];
    const { messages, added } = mergeLatestMessages(cached, [msg('real', 1, { externalId: 'wamid.1' })]);
    expect(messages).toHaveLength(1);
    expect(added).toBe(0);
  });

  it('returns the same array reference when nothing changed', () => {
    const cached = [msg('a', 1), msg('b', 2)];
    const { messages } = mergeLatestMessages(cached, [msg('a', 1), msg('b', 2)]);
    expect(messages).toBe(cached);
  });
});
